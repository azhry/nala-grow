package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/azhry/nala-grow/backend/internal/auth"
	"github.com/azhry/nala-grow/backend/internal/db"
	"github.com/azhry/nala-grow/backend/internal/graph"
	"github.com/azhry/nala-grow/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type liveCasdoorUserStatus struct {
	Owner             string `json:"owner"`
	Name              string `json:"name"`
	EmailVerified     bool   `json:"emailVerified"`
	IsForbidden       bool   `json:"isForbidden"`
	SignupApplication string `json:"signupApplication"`
}

func TestLiveCasdoorLookupUser(t *testing.T) {
	email := strings.TrimSpace(os.Getenv("NALA_LIVE_CASDOOR_LOOKUP_EMAIL"))
	if email == "" {
		t.Skip("set NALA_LIVE_CASDOOR_LOOKUP_EMAIL for a read-only Casdoor/profile lookup")
	}
	config, err := loadRuntimeConfig()
	if err != nil || !config.Casdoor.Enabled {
		t.Fatal("could not load Vault-backed Casdoor configuration")
	}
	ctx, cancel := context.WithTimeout(t.Context(), 30*time.Second)
	defer cancel()
	client := &http.Client{Timeout: 10 * time.Second}
	token, err := liveCasdoorClientToken(ctx, client, config.Casdoor)
	if err != nil {
		t.Fatal("could not authenticate the read-only Casdoor lookup")
	}
	user, exists, err := liveCasdoorUserDetails(ctx, client, config.Casdoor, token, email)
	if err != nil {
		t.Fatal("read-only Casdoor lookup failed")
	}
	pool, err := db.Connect(ctx, config.DatabaseURL)
	if err != nil {
		t.Fatal("could not connect to the configured PostgreSQL database")
	}
	defer pool.Close()
	var profileExists bool
	if err := pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM public.users WHERE lower(email) = lower($1))", email).Scan(&profileExists); err != nil {
		t.Fatal("read-only PostgreSQL profile lookup failed")
	}
	t.Logf("casdoor_exists=%t, profile_exists=%t, owner_matches=%t, signup_application_matches=%t, email_verified=%t, forbidden=%t", exists, profileExists, exists && user.Owner == config.Casdoor.Organization, exists && user.SignupApplication == config.Casdoor.Application, exists && user.EmailVerified, exists && user.IsForbidden)
}

func TestLiveCasdoorSignupCreatesProfileAndLogsIn(t *testing.T) {
	if os.Getenv("NALA_LIVE_CASDOOR_SIGNUP") != "1" {
		t.Skip("set NALA_LIVE_CASDOOR_SIGNUP=1 to create and clean up a real Casdoor test user")
	}

	config, err := loadRuntimeConfig()
	if err != nil || !config.Casdoor.Enabled {
		t.Fatal("could not load Vault-backed Casdoor configuration")
	}
	if strings.TrimSpace(config.Casdoor.RedirectURI) == "" {
		t.Fatal("Vault-backed NalaGrow callback URL is missing")
	}
	baseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("NALA_LIVE_CASDOOR_BASE_URL")), "/")
	if baseURL != "" {
		parsedBaseURL, err := url.Parse(baseURL)
		if err != nil || (parsedBaseURL.Scheme != "http" && parsedBaseURL.Scheme != "https") ||
			(parsedBaseURL.Hostname() != "localhost" && parsedBaseURL.Hostname() != "127.0.0.1" && parsedBaseURL.Hostname() != "::1") {
			t.Fatal("NALA_LIVE_CASDOOR_BASE_URL must point to a loopback NalaGrow API")
		}
	}
	ctx, cancel := context.WithTimeout(t.Context(), 45*time.Second)
	defer cancel()
	previousLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(io.Discard, nil)))
	t.Cleanup(func() { slog.SetDefault(previousLogger) })
	pool, err := db.Connect(ctx, config.DatabaseURL)
	if err != nil {
		t.Fatal("could not connect to the configured PostgreSQL database")
	}
	t.Cleanup(pool.Close)
	var databaseName string
	if err := pool.QueryRow(ctx, "SELECT current_database()").Scan(&databaseName); err != nil {
		t.Fatal("could not verify the configured database")
	}
	if databaseName != "nalagrow" {
		t.Fatal("live signup test is restricted to the nalagrow database")
	}

	localPart := "codex-live-" + strings.ReplaceAll(uuid.NewString(), "-", "")
	email := localPart + "@example.com"
	password := "NalaGrow!Live9-" + uuid.NewString()
	client := &http.Client{Timeout: 10 * time.Second}
	token, err := liveCasdoorClientToken(ctx, client, config.Casdoor)
	if err != nil {
		t.Fatal("could not obtain the Casdoor client token for the live check")
	}
	exists, err := liveCasdoorUserExists(ctx, client, config.Casdoor, token, email)
	if err != nil {
		t.Fatal("could not check whether the generated live test email already exists")
	}
	if exists {
		t.Fatal("generated live test email unexpectedly already exists")
	}
	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cleanupCancel()
		if err := deleteLiveCasdoorUser(cleanupCtx, config.Casdoor, email); err != nil {
			t.Errorf("could not remove the live Casdoor test user: %v", err)
		}
		if _, err := pool.Exec(cleanupCtx, "DELETE FROM public.users WHERE lower(email) = lower($1)", email); err != nil {
			t.Errorf("could not remove the live NalaGrow profile: %v", err)
		}
	})

	authService, err := auth.NewServiceWithCasdoor(config.JWTSecret, config.Casdoor)
	if err != nil {
		t.Fatal("could not initialize the Casdoor client")
	}
	var router http.Handler
	if baseURL == "" {
		r := chi.NewRouter()
		r.Use(middleware.RequestLogger)
		r.Use(middleware.Recovery)
		r.Use(middleware.Auth)
		r.Post("/graphql", graphqlEndpoint(graph.NewHandler(pool, authService)))
		router = r
	}

	mutation := `mutation Signup($email: String!, $password: String!) {
		signup(email: $email, password: $password) {
			token refreshToken expiresIn user { id email subject authProvider }
		}
	}`
	signupResult := postLiveGraphQL(t, router, baseURL, mutation, map[string]interface{}{"email": email, "password": password})
	if signupResult.Code != http.StatusOK {
		t.Fatalf("live signup returned HTTP %d", signupResult.Code)
	}
	var signup struct {
		Data struct {
			Signup *struct {
				Token        string `json:"token"`
				RefreshToken string `json:"refreshToken"`
				User         struct {
					ID           string `json:"id"`
					Email        string `json:"email"`
					Subject      string `json:"subject"`
					AuthProvider string `json:"authProvider"`
				} `json:"user"`
			} `json:"signup"`
		} `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(signupResult.Body).Decode(&signup); err != nil {
		t.Fatal("live signup returned invalid GraphQL JSON")
	}
	if len(signup.Errors) != 0 || signup.Data.Signup == nil || signup.Data.Signup.Token == "" || signup.Data.Signup.RefreshToken == "" || signup.Data.Signup.User.Subject == "" || signup.Data.Signup.User.Email != email || signup.Data.Signup.User.AuthProvider != "casdoor" {
		if len(signup.Errors) > 0 {
			statusToken, tokenErr := liveCasdoorClientToken(ctx, &http.Client{Timeout: 10 * time.Second}, config.Casdoor)
			if tokenErr == nil {
				user, exists, statusErr := liveCasdoorUserDetails(ctx, &http.Client{Timeout: 10 * time.Second}, config.Casdoor, statusToken, email)
				if statusErr == nil && exists {
					t.Logf("created Casdoor user state: owner_matches=%t, username_is_email=%t, email_verified=%t, forbidden=%t, signup_application_matches=%t", user.Owner == config.Casdoor.Organization, user.Name == email, user.EmailVerified, user.IsForbidden, user.SignupApplication == config.Casdoor.Application)
					loginStatus, loginCode, loginMessage, loginErr := liveCasdoorPasswordLogin(ctx, config.Casdoor, user.Name, password)
					if loginErr != nil {
						t.Logf("direct Casdoor API password check failed: %v", loginErr)
					} else {
						t.Logf("direct Casdoor API password check: status=%s code=%s message=%q", loginStatus, loginCode, loginMessage)
					}
				}
			}
			t.Fatalf("live signup failed: %s", signup.Errors[0].Message)
		}
		t.Fatal("live signup did not return a Casdoor-linked user")
	}
	t.Logf("signup: HTTP %d, data.signup present, access and refresh tokens present, Casdoor subject present", signupResult.Code)
	if err := authService.Casdoor.RegisterUser(ctx, email, password, strings.SplitN(email, "@", 2)[0]); !errors.Is(err, auth.ErrCasdoorEmailAlreadyExists) {
		t.Fatalf("live duplicate signup error = %v, want existing-email rejection", err)
	}
	t.Log("duplicate signup preflight: existing account rejected before registration")
	if baseURL == "" {
		duplicateResult := postLiveGraphQL(t, router, "", mutation, map[string]interface{}{"email": email, "password": password})
		var duplicateResponse struct {
			Data struct {
				Signup json.RawMessage `json:"signup"`
			} `json:"data"`
			Errors []struct {
				Message string `json:"message"`
			} `json:"errors"`
		}
		if err := json.NewDecoder(duplicateResult.Body).Decode(&duplicateResponse); err != nil {
			t.Fatal("live duplicate signup returned invalid GraphQL JSON")
		}
		if len(duplicateResponse.Errors) != 1 || duplicateResponse.Errors[0].Message != "an account with this email already exists; please log in instead" || string(duplicateResponse.Data.Signup) != "null" {
			t.Fatalf("live duplicate signup response was not actionable: errors=%d, signup_null=%t", len(duplicateResponse.Errors), string(duplicateResponse.Data.Signup) == "null")
		}
		t.Logf("duplicate signup response: data.signup=null, error=%q", duplicateResponse.Errors[0].Message)
	}

	var subject string
	var passwordHashIsNull bool
	if err := pool.QueryRow(ctx, `SELECT casdoor_subject, password_hash IS NULL
		FROM public.users WHERE lower(email) = lower($1)`, email).Scan(&subject, &passwordHashIsNull); err != nil {
		t.Fatal("live signup did not persist the NalaGrow profile")
	}
	if subject != signup.Data.Signup.User.Subject || !passwordHashIsNull {
		t.Fatal("live signup profile does not match the Casdoor identity contract")
	}
	t.Log("PostgreSQL profile: Casdoor subject matches; password_hash is NULL")

	me := `query Me { me { email subject authProvider } }`
	meResult := postLiveGraphQLWithToken(t, router, baseURL, me, nil, signup.Data.Signup.Token)
	if meResult.Code != http.StatusOK {
		t.Fatalf("live authenticated profile query returned HTTP %d", meResult.Code)
	}
	var meResponse struct {
		Data struct {
			Me *struct {
				Email        string `json:"email"`
				Subject      string `json:"subject"`
				AuthProvider string `json:"authProvider"`
			} `json:"me"`
		} `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(meResult.Body).Decode(&meResponse); err != nil {
		t.Fatal("live authenticated profile query returned invalid GraphQL JSON")
	}
	if len(meResponse.Errors) != 0 || meResponse.Data.Me == nil || meResponse.Data.Me.Email != email || meResponse.Data.Me.Subject != subject || meResponse.Data.Me.AuthProvider != "casdoor" {
		t.Fatal("live authenticated profile query did not return the Casdoor-linked user")
	}
	t.Logf("protected me: HTTP %d, authenticated Casdoor profile returned", meResult.Code)
	anonymousMeResult := postLiveGraphQL(t, router, baseURL, me, nil)
	if anonymousMeResult.Code != http.StatusOK {
		t.Fatalf("live unauthenticated profile query returned HTTP %d", anonymousMeResult.Code)
	}
	var anonymousMeResponse struct {
		Data struct {
			Me json.RawMessage `json:"me"`
		} `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(anonymousMeResult.Body).Decode(&anonymousMeResponse); err != nil {
		t.Fatal("live unauthenticated profile query returned invalid GraphQL JSON")
	}
	if len(anonymousMeResponse.Errors) != 1 || anonymousMeResponse.Errors[0].Message != "not authenticated" || string(anonymousMeResponse.Data.Me) != "null" {
		t.Fatal("live unauthenticated profile query was not rejected")
	}
	t.Logf("anonymous me: HTTP %d, data.me=null, error=%q", anonymousMeResult.Code, anonymousMeResponse.Errors[0].Message)

	refresh := `mutation RefreshToken($refreshToken: String!) {
		refreshToken(refreshToken: $refreshToken) {
			token refreshToken expiresIn user { email subject authProvider }
		}
	}`
	refreshResult := postLiveGraphQL(t, router, baseURL, refresh, map[string]interface{}{"refreshToken": signup.Data.Signup.RefreshToken})
	if refreshResult.Code != http.StatusOK {
		t.Fatalf("live refresh returned HTTP %d", refreshResult.Code)
	}
	var refreshResponse struct {
		Data struct {
			RefreshToken *struct {
				Token        string `json:"token"`
				RefreshToken string `json:"refreshToken"`
				ExpiresIn    int    `json:"expiresIn"`
				User         struct {
					Email        string `json:"email"`
					Subject      string `json:"subject"`
					AuthProvider string `json:"authProvider"`
				} `json:"user"`
			} `json:"refreshToken"`
		} `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(refreshResult.Body).Decode(&refreshResponse); err != nil {
		t.Fatal("live refresh returned invalid GraphQL JSON")
	}
	if len(refreshResponse.Errors) != 0 || refreshResponse.Data.RefreshToken == nil || refreshResponse.Data.RefreshToken.Token == "" || refreshResponse.Data.RefreshToken.ExpiresIn <= 0 || refreshResponse.Data.RefreshToken.User.Subject != subject || refreshResponse.Data.RefreshToken.User.Email != email || refreshResponse.Data.RefreshToken.User.AuthProvider != "casdoor" {
		if len(refreshResponse.Errors) > 0 {
			t.Fatalf("live refresh failed: %s", refreshResponse.Errors[0].Message)
		}
		t.Fatal("live refresh did not return the created Casdoor identity")
	}
	t.Logf("refresh: HTTP %d, rotated access token present, subject preserved", refreshResult.Code)

	login := `mutation Login($email: String!, $password: String!) {
		login(email: $email, password: $password) { token user { id email subject authProvider } }
	}`
	loginResult := postLiveGraphQL(t, router, baseURL, login, map[string]interface{}{"email": email, "password": password})
	if loginResult.Code != http.StatusOK {
		t.Fatalf("live login returned HTTP %d", loginResult.Code)
	}
	var loginResponse struct {
		Data struct {
			Login *struct {
				Token string `json:"token"`
				User  struct {
					ID           string `json:"id"`
					Email        string `json:"email"`
					Subject      string `json:"subject"`
					AuthProvider string `json:"authProvider"`
				} `json:"user"`
			} `json:"login"`
		} `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(loginResult.Body).Decode(&loginResponse); err != nil {
		t.Fatal("live login returned invalid GraphQL JSON")
	}
	if len(loginResponse.Errors) != 0 || loginResponse.Data.Login == nil || loginResponse.Data.Login.Token == "" || loginResponse.Data.Login.User.ID != signup.Data.Signup.User.ID || loginResponse.Data.Login.User.Subject != subject || loginResponse.Data.Login.User.Email != email || loginResponse.Data.Login.User.AuthProvider != "casdoor" {
		if len(loginResponse.Errors) > 0 {
			t.Fatalf("live login failed: %s", loginResponse.Errors[0].Message)
		}
		t.Fatal("live login did not return the created Casdoor identity")
	}
	t.Logf("login: HTTP %d, same Casdoor identity returned", loginResult.Code)

	babyName := "NalaGrow live " + uuid.NewString()
	createBaby := `mutation CreateBaby($name: String!, $dob: String, $sex: String) {
		createBaby(name: $name, dob: $dob, sex: $sex) { id name dob sex userId }
	}`
	babyResult := postLiveGraphQLWithToken(t, router, baseURL, createBaby, map[string]interface{}{
		"name": babyName,
		"dob":  "2025-06-15",
		"sex":  "other",
	}, loginResponse.Data.Login.Token)
	if babyResult.Code != http.StatusOK {
		t.Fatalf("live baby creation returned HTTP %d", babyResult.Code)
	}
	var babyResponse struct {
		Data struct {
			CreateBaby *struct {
				ID     string `json:"id"`
				Name   string `json:"name"`
				Sex    string `json:"sex"`
				UserID string `json:"userId"`
			} `json:"createBaby"`
		} `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(babyResult.Body).Decode(&babyResponse); err != nil {
		t.Fatal("live baby creation returned invalid GraphQL JSON")
	}
	if len(babyResponse.Errors) != 0 || babyResponse.Data.CreateBaby == nil || babyResponse.Data.CreateBaby.ID == "" || babyResponse.Data.CreateBaby.Name != babyName || babyResponse.Data.CreateBaby.Sex != "other" || babyResponse.Data.CreateBaby.UserID != signup.Data.Signup.User.ID {
		if len(babyResponse.Errors) > 0 {
			t.Fatalf("live baby creation failed: %s", babyResponse.Errors[0].Message)
		}
		t.Fatal("live baby was not linked to the authenticated Casdoor user")
	}
	t.Logf("create baby: HTTP %d, record linked to authenticated user", babyResult.Code)

	babiesQuery := `query Babies { babies { id name userId } }`
	babiesResult := postLiveGraphQLWithToken(t, router, baseURL, babiesQuery, nil, loginResponse.Data.Login.Token)
	if babiesResult.Code != http.StatusOK {
		t.Fatalf("live baby persistence query returned HTTP %d", babiesResult.Code)
	}
	var babiesResponse struct {
		Data struct {
			Babies []struct {
				ID     string `json:"id"`
				Name   string `json:"name"`
				UserID string `json:"userId"`
			} `json:"babies"`
		} `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(babiesResult.Body).Decode(&babiesResponse); err != nil {
		t.Fatal("live baby persistence query returned invalid GraphQL JSON")
	}
	babyFound := false
	for _, baby := range babiesResponse.Data.Babies {
		if baby.ID == babyResponse.Data.CreateBaby.ID && baby.Name == babyName && baby.UserID == signup.Data.Signup.User.ID {
			babyFound = true
			break
		}
	}
	if len(babiesResponse.Errors) != 0 || !babyFound {
		t.Fatal("live baby did not persist for the authenticated Casdoor user")
	}
	t.Log("read babies: created baby found in persisted response")

	createFeed := `mutation CreateFeedingSession($babyId: ID!, $feedType: String!, $startedAt: String, $leftDurationSec: Int, $rightDurationSec: Int, $notes: String) {
		createFeedingSession(babyId: $babyId, feedType: $feedType, startedAt: $startedAt, leftDurationSec: $leftDurationSec, rightDurationSec: $rightDurationSec, notes: $notes) {
			id babyId feedType leftDurationSec rightDurationSec notes
		}
	}`
	feedNotes := "NalaGrow Casdoor live verification"
	feedResult := postLiveGraphQLWithToken(t, router, baseURL, createFeed, map[string]interface{}{
		"babyId":           babyResponse.Data.CreateBaby.ID,
		"feedType":         "breast",
		"startedAt":        time.Now().UTC().Format(time.RFC3339Nano),
		"leftDurationSec":  180,
		"rightDurationSec": 0,
		"notes":            feedNotes,
	}, loginResponse.Data.Login.Token)
	if feedResult.Code != http.StatusOK {
		t.Fatalf("live feeding-session creation returned HTTP %d", feedResult.Code)
	}
	var feedResponse struct {
		Data struct {
			CreateFeedingSession *struct {
				ID               string `json:"id"`
				BabyID           string `json:"babyId"`
				FeedType         string `json:"feedType"`
				LeftDurationSec  int    `json:"leftDurationSec"`
				RightDurationSec int    `json:"rightDurationSec"`
				Notes            string `json:"notes"`
			} `json:"createFeedingSession"`
		} `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(feedResult.Body).Decode(&feedResponse); err != nil {
		t.Fatal("live feeding-session creation returned invalid GraphQL JSON")
	}
	if len(feedResponse.Errors) != 0 || feedResponse.Data.CreateFeedingSession == nil || feedResponse.Data.CreateFeedingSession.ID == "" || feedResponse.Data.CreateFeedingSession.BabyID != babyResponse.Data.CreateBaby.ID || feedResponse.Data.CreateFeedingSession.FeedType != "breast" || feedResponse.Data.CreateFeedingSession.LeftDurationSec != 180 || feedResponse.Data.CreateFeedingSession.Notes != feedNotes {
		if len(feedResponse.Errors) > 0 {
			t.Fatalf("live feeding-session creation failed: %s", feedResponse.Errors[0].Message)
		}
		t.Fatal("live feeding session did not match the saved baby and feed data")
	}
	t.Logf("create feeding session: HTTP %d, feeding record linked to created baby", feedResult.Code)

	feedsQuery := `query FeedingSessions($babyId: ID!) {
		feedingSessions(babyId: $babyId) { id babyId feedType leftDurationSec notes }
	}`
	feedsResult := postLiveGraphQLWithToken(t, router, baseURL, feedsQuery, map[string]interface{}{"babyId": babyResponse.Data.CreateBaby.ID}, loginResponse.Data.Login.Token)
	if feedsResult.Code != http.StatusOK {
		t.Fatalf("live feeding-session persistence query returned HTTP %d", feedsResult.Code)
	}
	var feedsResponse struct {
		Data struct {
			FeedingSessions []struct {
				ID              string `json:"id"`
				BabyID          string `json:"babyId"`
				FeedType        string `json:"feedType"`
				LeftDurationSec int    `json:"leftDurationSec"`
				Notes           string `json:"notes"`
			} `json:"feedingSessions"`
		} `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(feedsResult.Body).Decode(&feedsResponse); err != nil {
		t.Fatal("live feeding-session persistence query returned invalid GraphQL JSON")
	}
	feedFound := false
	for _, feed := range feedsResponse.Data.FeedingSessions {
		if feed.ID == feedResponse.Data.CreateFeedingSession.ID && feed.BabyID == babyResponse.Data.CreateBaby.ID && feed.FeedType == "breast" && feed.LeftDurationSec == 180 && feed.Notes == feedNotes {
			feedFound = true
			break
		}
	}
	if len(feedsResponse.Errors) != 0 || !feedFound {
		t.Fatal("live feeding session did not persist for the created baby")
	}
	t.Log("read feeding sessions: created feeding record found in persisted response")
}

func postLiveGraphQL(t *testing.T, router http.Handler, baseURL, query string, variables map[string]interface{}) *httptest.ResponseRecorder {
	return postLiveGraphQLWithToken(t, router, baseURL, query, variables, "")
}

func postLiveGraphQLWithToken(t *testing.T, router http.Handler, baseURL, query string, variables map[string]interface{}, token string) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(graphqlRequest{Query: query, Variables: variables})
	if err != nil {
		t.Fatal("could not encode the live GraphQL request")
	}
	if baseURL == "" {
		request := httptest.NewRequest(http.MethodPost, "/graphql", bytes.NewReader(body))
		request.Header.Set("Content-Type", "application/json")
		if token != "" {
			request.Header.Set("Authorization", "Bearer "+token)
		}
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		return response
	}
	request, err := http.NewRequest(http.MethodPost, baseURL+"/graphql", bytes.NewReader(body))
	if err != nil {
		t.Fatal("could not create the live GraphQL request")
	}
	request.Header.Set("Content-Type", "application/json")
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	response := httptest.NewRecorder()
	httpResponse, err := (&http.Client{Timeout: 15 * time.Second}).Do(request)
	if err != nil {
		t.Fatalf("live NalaGrow GraphQL request failed: %v", err)
	}
	defer httpResponse.Body.Close()
	response.Code = httpResponse.StatusCode
	if _, err := io.Copy(response.Body, httpResponse.Body); err != nil {
		t.Fatal("could not read the live NalaGrow GraphQL response")
	}
	return response
}

func liveCasdoorPasswordLogin(ctx context.Context, config auth.CasdoorConfig, username, password string) (string, string, string, error) {
	payload := struct {
		Type         string `json:"type"`
		Organization string `json:"organization"`
		Username     string `json:"username"`
		Password     string `json:"password"`
		Application  string `json:"application"`
		SigninMethod string `json:"signinMethod"`
	}{
		Type:         "login",
		Organization: config.Organization,
		Username:     username,
		Password:     password,
		Application:  config.Application,
		SigninMethod: "Password",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", "", "", errors.New("could not encode direct Casdoor login request")
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(config.Issuer, "/")+"/api/login", bytes.NewReader(body))
	if err != nil {
		return "", "", "", errors.New("could not create direct Casdoor login request")
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept-Language", "en")
	client := &http.Client{Timeout: 10 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return "", "", "", errors.New("direct Casdoor login request failed")
	}
	defer response.Body.Close()
	var result struct {
		Status string `json:"status"`
		Code   string `json:"code"`
		Msg    string `json:"msg"`
	}
	if err := json.NewDecoder(io.LimitReader(response.Body, 64*1024)).Decode(&result); err != nil {
		return "", "", "", errors.New("direct Casdoor login returned invalid JSON")
	}
	status := result.Status
	if status != "ok" && status != "error" {
		status = "unknown"
	}
	code := result.Code
	if code == "" {
		code = classifyLiveCasdoorLoginMessage(result.Msg)
	}
	if code != "" && !isSafeCasdoorLoginCode(code) {
		code = "unspecified"
	}
	return status, code, sanitizeLiveCasdoorLoginMessage(result.Msg, config, username, password), nil
}

func sanitizeLiveCasdoorLoginMessage(message string, config auth.CasdoorConfig, username, password string) string {
	message = strings.ToLower(message)
	for _, value := range []string{username, password, config.Organization, config.Application, config.ClientID, config.ClientSecret, config.AdminToken} {
		if value != "" {
			message = strings.ReplaceAll(message, strings.ToLower(value), "[redacted]")
		}
	}
	message = regexp.MustCompile(`(?i)[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}`).ReplaceAllString(message, "[email]")
	message = regexp.MustCompile(`(?i)eyJ[a-z0-9_-]{8,}\.[a-z0-9_-]{8,}\.[a-z0-9_-]{8,}`).ReplaceAllString(message, "[token]")
	message = regexp.MustCompile(`(?i)\b[a-f0-9]{8}-[a-f0-9-]{27,}\b`).ReplaceAllString(message, "[id]")
	message = regexp.MustCompile(`\b[A-Za-z0-9_-]{32,}\b`).ReplaceAllString(message, "[redacted]")
	message = strings.Join(strings.Fields(message), " ")
	if len(message) > 160 {
		message = message[:160]
	}
	return message
}

func classifyLiveCasdoorLoginMessage(message string) string {
	message = strings.ToLower(strings.TrimSpace(message))
	switch {
	case strings.Contains(message, "application") && (strings.Contains(message, "does not exist") || strings.Contains(message, "doesn't exist")):
		return "application-not-found"
	case strings.Contains(message, "password") && (strings.Contains(message, "incorrect") || strings.Contains(message, "invalid") || strings.Contains(message, "wrong")):
		return "wrong-password"
	case strings.Contains(message, "does not exist") || strings.Contains(message, "doesn't exist") || strings.Contains(message, "user-not-found"):
		return "user-not-found"
	case strings.Contains(message, "password") && strings.Contains(message, "not enabled"):
		return "password-login-disabled"
	case strings.Contains(message, "captcha") || strings.Contains(message, "turing test"):
		return "captcha-required"
	case strings.Contains(message, "multi-factor") || strings.Contains(message, "mfa"):
		return "mfa-required"
	case strings.Contains(message, "forbidden") || strings.Contains(message, "disabled") || strings.Contains(message, "frozen"):
		return "account-disabled"
	case strings.Contains(message, "email") && (strings.Contains(message, "verified") || strings.Contains(message, "verification")):
		return "email-verification-required"
	case message != "":
		return "other-rejection"
	default:
		return "unspecified"
	}
}

func isSafeCasdoorLoginCode(code string) bool {
	for _, r := range code {
		if !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9') && r != '-' && r != '_' {
			return false
		}
	}
	return true
}

func deleteLiveCasdoorUser(ctx context.Context, config auth.CasdoorConfig, email string) error {
	client := &http.Client{Timeout: 10 * time.Second}
	tokens := make([]string, 0, 2)
	if token, err := liveCasdoorClientToken(ctx, client, config); err == nil {
		tokens = append(tokens, token)
	}
	if config.AdminToken != "" {
		tokens = append(tokens, config.AdminToken)
	}
	if len(tokens) == 0 {
		return errors.New("no cleanup token is available")
	}
	var lastErr error
	for _, token := range tokens {
		user, exists, err := liveCasdoorUserDetails(ctx, client, config, token, email)
		if err != nil {
			lastErr = err
			continue
		}
		if !exists {
			return nil
		}
		if user.Owner == "" {
			user.Owner = config.Organization
		}
		for attempt := 0; attempt < 2; attempt++ {
			body, err := json.Marshal(map[string]string{"owner": user.Owner, "name": user.Name})
			if err != nil {
				return errors.New("could not encode Casdoor cleanup request")
			}
			request, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(config.Issuer, "/")+"/api/delete-user", bytes.NewReader(body))
			if err != nil {
				return errors.New("could not create Casdoor cleanup request")
			}
			request.Header.Set("Authorization", "Bearer "+token)
			request.Header.Set("Content-Type", "application/json")
			request.Header.Set("Accept-Language", "en")
			response, err := client.Do(request)
			if err != nil {
				lastErr = errors.New("Casdoor cleanup request failed")
				break
			}
			var result struct {
				Status string `json:"status"`
				Data   bool   `json:"data"`
			}
			decodeErr := json.NewDecoder(response.Body).Decode(&result)
			response.Body.Close()
			if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices || decodeErr != nil || strings.EqualFold(result.Status, "error") {
				lastErr = fmt.Errorf("Casdoor cleanup returned HTTP %d", response.StatusCode)
				break
			}
			if !result.Data {
				break
			}
		}
		exists, err = liveCasdoorUserExists(ctx, client, config, token, email)
		if err == nil && !exists {
			return nil
		}
		if err != nil {
			lastErr = err
		} else {
			lastErr = errors.New("Casdoor test user still exists after cleanup")
		}
	}
	if lastErr == nil {
		lastErr = errors.New("could not confirm Casdoor test user cleanup")
	}
	return lastErr
}

func liveCasdoorUserExists(ctx context.Context, client *http.Client, config auth.CasdoorConfig, token, email string) (bool, error) {
	_, exists, err := liveCasdoorUserDetails(ctx, client, config, token, email)
	return exists, err
}

func liveCasdoorUserDetails(ctx context.Context, client *http.Client, config auth.CasdoorConfig, token, email string) (liveCasdoorUserStatus, bool, error) {
	values := url.Values{"owner": {config.Organization}, "email": {email}}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(config.Issuer, "/")+"/api/get-user?"+values.Encode(), nil)
	if err != nil {
		return liveCasdoorUserStatus{}, false, errors.New("could not create Casdoor cleanup lookup")
	}
	request.Header.Set("Authorization", "Bearer "+token)
	request.Header.Set("Accept-Language", "en")
	response, err := client.Do(request)
	if err != nil {
		return liveCasdoorUserStatus{}, false, errors.New("Casdoor cleanup lookup failed")
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return liveCasdoorUserStatus{}, false, fmt.Errorf("Casdoor cleanup lookup returned HTTP %d", response.StatusCode)
	}
	var result struct {
		Status string          `json:"status"`
		Data   json.RawMessage `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil || strings.EqualFold(result.Status, "error") {
		return liveCasdoorUserStatus{}, false, errors.New("Casdoor cleanup lookup returned invalid data")
	}
	if len(result.Data) == 0 || strings.TrimSpace(string(result.Data)) == "null" {
		return liveCasdoorUserStatus{}, false, nil
	}
	var user liveCasdoorUserStatus
	if err := json.Unmarshal(result.Data, &user); err != nil || user.Name == "" {
		return liveCasdoorUserStatus{}, false, errors.New("Casdoor cleanup lookup returned invalid user data")
	}
	return user, true, nil
}

func liveCasdoorClientToken(ctx context.Context, client *http.Client, config auth.CasdoorConfig) (string, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(config.Issuer, "/")+"/.well-known/openid-configuration", nil)
	if err != nil {
		return "", errors.New("could not create Casdoor discovery request")
	}
	discoveryResponse, err := client.Do(request)
	if err != nil {
		return "", errors.New("Casdoor discovery request failed")
	}
	var discovery struct {
		TokenEndpoint string `json:"token_endpoint"`
	}
	decodeErr := json.NewDecoder(discoveryResponse.Body).Decode(&discovery)
	discoveryResponse.Body.Close()
	if discoveryResponse.StatusCode < http.StatusOK || discoveryResponse.StatusCode >= http.StatusMultipleChoices || decodeErr != nil || discovery.TokenEndpoint == "" {
		return "", errors.New("Casdoor discovery response was invalid")
	}
	form := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {config.ClientID},
		"client_secret": {config.ClientSecret},
	}
	if config.Organization != "" {
		form.Set("organization", config.Organization)
	}
	if config.Application != "" {
		form.Set("application", config.Application)
	}
	request, err = http.NewRequestWithContext(ctx, http.MethodPost, discovery.TokenEndpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return "", errors.New("could not create Casdoor token request")
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	tokenResponse, err := client.Do(request)
	if err != nil {
		return "", errors.New("Casdoor token request failed")
	}
	defer tokenResponse.Body.Close()
	var token struct {
		AccessToken string `json:"access_token"`
	}
	if tokenResponse.StatusCode < http.StatusOK || tokenResponse.StatusCode >= http.StatusMultipleChoices || json.NewDecoder(tokenResponse.Body).Decode(&token) != nil || token.AccessToken == "" {
		return "", fmt.Errorf("Casdoor token request returned HTTP %d", tokenResponse.StatusCode)
	}
	return token.AccessToken, nil
}
