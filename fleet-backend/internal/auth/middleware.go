package auth

import (
	"context"
	"net/http"
	"strings"
)

// contextKey tipo privado para evitar colisiones en el contexto HTTP.
type contextKey string

const ClaimsKey contextKey = "claims"

// Middleware extrae y valida el JWT de la cabecera Authorization.
// Si es válido, inyecta los Claims en el contexto de la request.
// Uso: router.Handle("/ruta", Middleware(handler))
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error":"token requerido"}`, http.StatusUnauthorized)
			return
		}

		// Formato esperado: "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, `{"error":"formato inválido, use Bearer <token>"}`, http.StatusUnauthorized)
			return
		}

		claims, err := ValidateToken(parts[1])
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusUnauthorized)
			return
		}

		// Inyectar claims en el contexto para que los handlers los lean
		ctx := context.WithValue(r.Context(), ClaimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireAdmin rechaza requests de usuarios no administradores.
// Debe usarse después de Middleware.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := GetClaims(r)
		if claims == nil || claims.Role != "admin" {
			http.Error(w, `{"error":"acceso restringido a administradores"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// GetClaims lee los claims del contexto. Retorna nil si no existen.
func GetClaims(r *http.Request) *Claims {
	claims, _ := r.Context().Value(ClaimsKey).(*Claims)
	return claims
}

// IsAdmin es un helper para verificar el rol en los handlers.
func IsAdmin(r *http.Request) bool {
	claims := GetClaims(r)
	return claims != nil && claims.Role == "admin"
}
