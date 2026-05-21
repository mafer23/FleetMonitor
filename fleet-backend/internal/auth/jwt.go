package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"time"
)

var jwtSecret = []byte(getSecret())

func getSecret() string {
	if s := os.Getenv("JWT_SECRET"); s != "" {
		return s
	}
	return "super-secret-dev-key-change-in-prod"
}

type Claims struct {
	UserID   int    `json:"uid"`
	Username string `json:"sub"`
	Role     string `json:"role"`
	Exp      int64  `json:"exp"` // Unix timestamp de expiración
	Iat      int64  `json:"iat"` // Unix timestamp de emisión
}

var encodedHeader = base64URLEncode([]byte(`{"alg":"HS256","typ":"JWT"}`))

func GenerateToken(userID int, username, role string) (string, error) {
	claims := Claims{
		UserID:   userID,
		Username: username,
		Role:     role,
		Exp:      time.Now().Add(24 * time.Hour).Unix(),
		Iat:      time.Now().Unix(),
	}

	payloadBytes, err := json.Marshal(claims)
	if err != nil {
		return "", errors.New("error serializando claims")
	}

	encodedPayload := base64URLEncode(payloadBytes)

	signingInput := encodedHeader + "." + encodedPayload
	signature := sign(signingInput)

	token := signingInput + "." + signature
	return token, nil
}

func ValidateToken(tokenStr string) (*Claims, error) {
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, errors.New("token malformado: se esperan 3 partes")
	}

	signingInput := parts[0] + "." + parts[1]
	expectedSig := sign(signingInput)

	if !hmac.Equal([]byte(expectedSig), []byte(parts[2])) {
		return nil, errors.New("firma inválida")
	}

	payloadBytes, err := base64URLDecode(parts[1])
	if err != nil {
		return nil, errors.New("error decodificando payload")
	}

	var claims Claims
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, errors.New("error deserializando claims")
	}

	if time.Now().Unix() > claims.Exp {
		return nil, errors.New("token expirado")
	}

	return &claims, nil
}

func sign(input string) string {
	mac := hmac.New(sha256.New, jwtSecret)
	mac.Write([]byte(input))
	return base64URLEncode(mac.Sum(nil))
}

func base64URLEncode(data []byte) string {
	return base64.RawURLEncoding.EncodeToString(data)
}

func base64URLDecode(s string) ([]byte, error) {
	return base64.RawURLEncoding.DecodeString(s)
}
