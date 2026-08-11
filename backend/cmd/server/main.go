package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/rs/cors"

	"github.com/azhry/nala-grow/backend/internal/auth"
	"github.com/azhry/nala-grow/backend/internal/db"
	"github.com/azhry/nala-grow/backend/internal/graph"
	"github.com/azhry/nala-grow/backend/internal/middleware"
)

// The production-compatible default remains an all-interface bind, but uses an
// explicit address so an unset HOST cannot be mistaken for missing config.
// Integration runs override HOST with 127.0.0.1 to remain loopback-only.
const defaultListenHost = "0.0.0.0"

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	cfg := loadConfig()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("database connection failed", "error", err)
		return
	}
	defer pool.Close()
	if err := db.RunMigrations(cfg.DatabaseURL); err != nil {
		slog.Error("database migrations failed", "error", err)
		return
	}
	slog.Info("database migrations applied")

	r := chi.NewRouter()
	r.Use(middleware.RequestLogger)
	r.Use(middleware.Recovery)
	r.Use(middleware.Auth)
	r.Use(cors.New(cors.Options{
		AllowedOrigins:   []string{cfg.AllowedOrigin},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	}).Handler)

	authSvc := auth.NewService(cfg.JWTSecret)
	handler := graph.NewHandler(pool, authSvc)
	if cfg.GoogleClientID != "" {
		handler.SetGoogleClientID(cfg.GoogleClientID)
	}

	r.HandleFunc("/graphql", graphqlEndpoint(handler))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"ok":        true,
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"version":   "0.1.0",
		})
	})

	httpServer := &http.Server{
		Addr:         cfg.ListenAddress(),
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	go func() {
		slog.Info("server starting", "host", cfg.Host, "port", cfg.Port)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		slog.Error("shutdown error", "error", err)
	}
	slog.Info("server stopped")
}

func writeError(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

type Config struct {
	Host           string
	Port           string
	DatabaseURL    string
	AllowedOrigin  string
	JWTSecret      string
	GoogleClientID string
}

func (c Config) ListenAddress() string {
	return net.JoinHostPort(c.Host, c.Port)
}

func loadConfig() Config {
	return Config{
		Host:           getEnv("HOST", defaultListenHost),
		Port:           getEnv("PORT", "4000"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://nalagrow:nalagrow@localhost:5432/nalagrow?sslmode=disable"),
		AllowedOrigin:  getEnv("ALLOWED_ORIGIN", "http://localhost:3000"),
		JWTSecret:      getEnv("JWT_SECRET", "dev-secret-change-in-production"),
		GoogleClientID: getEnv("GOOGLE_CLIENT_ID", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
