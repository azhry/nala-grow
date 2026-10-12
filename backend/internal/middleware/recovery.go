package middleware

import (
	"fmt"
	"net/http"
)

func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				SetPanic(r.Context(), fmt.Sprintf("%T", recovered), fmt.Sprint(recovered))
				if tracked, ok := w.(*responseWriter); ok && tracked.wroteHead {
					return
				}
				http.Error(w, `{"error":"internal server error","code":"PANIC"}`, http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}
