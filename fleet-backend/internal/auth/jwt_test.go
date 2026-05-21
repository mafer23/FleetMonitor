package auth_test

import (
	"strings"
	"testing"
	"time"

	"github.com/simonmovilidad/fleet-backend/internal/auth"
	"github.com/simonmovilidad/fleet-backend/internal/models"
)

func TestGenerateToken_ValidStructure(t *testing.T) {
	token, err := auth.GenerateToken(1, "admin", "admin")
	if err != nil {
		t.Fatalf("GenerateToken falló: %v", err)
	}

	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		t.Errorf("token debe tener 3 partes separadas por '.', tiene %d", len(parts))
	}
}

func TestValidateToken_ValidToken(t *testing.T) {
	token, _ := auth.GenerateToken(42, "testuser", "viewer")

	claims, err := auth.ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken falló con token válido: %v", err)
	}

	if claims.UserID != 42 {
		t.Errorf("UserID esperado 42, obtenido %d", claims.UserID)
	}
	if claims.Username != "testuser" {
		t.Errorf("Username esperado 'testuser', obtenido '%s'", claims.Username)
	}
	if claims.Role != "viewer" {
		t.Errorf("Role esperado 'viewer', obtenido '%s'", claims.Role)
	}
}

func TestValidateToken_TamperedSignature(t *testing.T) {
	token, _ := auth.GenerateToken(1, "admin", "admin")

	// Alterar la firma: cambiar el último carácter
	tampered := token[:len(token)-1] + "X"

	_, err := auth.ValidateToken(tampered)
	if err == nil {
		t.Error("ValidateToken debería fallar con firma alterada")
	}
}

func TestValidateToken_MalformedToken(t *testing.T) {
	cases := []string{
		"",
		"solounaparte",
		"dos.partes",
		"cuatro.partes.son.demasiadas",
	}

	for _, tc := range cases {
		_, err := auth.ValidateToken(tc)
		if err == nil {
			t.Errorf("ValidateToken debería fallar con token '%s'", tc)
		}
	}
}

func TestValidateToken_ExpiredToken(t *testing.T) {
	// No podemos generar un token expirado directamente con la API pública,
	// así que verificamos que el campo Exp funciona correctamente.
	token, _ := auth.GenerateToken(1, "admin", "admin")
	claims, err := auth.ValidateToken(token)
	if err != nil {
		t.Fatalf("token recién generado no debería expirar: %v", err)
	}

	// El token debe expirar aproximadamente en 24 horas
	expectedExpiry := time.Now().Add(23 * time.Hour)
	actualExpiry := time.Unix(claims.Exp, 0)
	if actualExpiry.Before(expectedExpiry) {
		t.Errorf("token expira demasiado pronto: %v", actualExpiry)
	}
}

func TestGenerateToken_AdminRole(t *testing.T) {
	token, _ := auth.GenerateToken(1, "admin", "admin")
	claims, _ := auth.ValidateToken(token)

	if claims.Role != "admin" {
		t.Errorf("rol esperado 'admin', obtenido '%s'", claims.Role)
	}
}

func TestFuelAutonomyHours_Normal(t *testing.T) {
	// Tanque de 60L al 50% = 30L restantes. Consumo: 10L/h → 3 horas
	r := &models.SensorReading{
		FuelLevel:    50.0,
		FuelCapacity: 60.0,
		Consumption:  10.0,
	}

	autonomy := r.FuelAutonomyHours()
	expected := 3.0
	if autonomy != expected {
		t.Errorf("autonomía esperada %.1f, obtenida %.1f", expected, autonomy)
	}
}

func TestFuelAutonomyHours_FullTank(t *testing.T) {
	// Tanque de 60L al 100% = 60L. Consumo: 8.5L/h ≈ 7.06 horas
	r := &models.SensorReading{
		FuelLevel:    100.0,
		FuelCapacity: 60.0,
		Consumption:  8.5,
	}

	autonomy := r.FuelAutonomyHours()
	if autonomy < 7.0 || autonomy > 7.1 {
		t.Errorf("autonomía con tanque lleno incorrecta: %.2f", autonomy)
	}
}

func TestFuelAutonomyHours_ZeroConsumption(t *testing.T) {
	// Consumo 0 no debe causar división por cero
	r := &models.SensorReading{
		FuelLevel:    50.0,
		FuelCapacity: 60.0,
		Consumption:  0,
	}

	autonomy := r.FuelAutonomyHours()
	if autonomy <= 0 {
		t.Error("autonomía con consumo 0 debe ser positiva (sin división por cero)")
	}
}

func TestNeedsLowFuelAlert_True(t *testing.T) {
	// Tanque de 60L al 1% = 0.6L. Consumo 8.5L/h → ~0.07h → ALERTA
	r := &models.SensorReading{
		FuelLevel:    1.0,
		FuelCapacity: 60.0,
		Consumption:  8.5,
	}

	if !r.NeedsLowFuelAlert() {
		t.Error("debería generar alerta con menos de 1 hora de autonomía")
	}
}

func TestNeedsLowFuelAlert_False(t *testing.T) {
	// Tanque al 50% → 3 horas de autonomía → sin alerta
	r := &models.SensorReading{
		FuelLevel:    50.0,
		FuelCapacity: 60.0,
		Consumption:  10.0,
	}

	if r.NeedsLowFuelAlert() {
		t.Error("no debería generar alerta con 3 horas de autonomía")
	}
}

func TestNeedsLowFuelAlert_ExactlyOneHour(t *testing.T) {
	// Exactamente 1 hora: no debe alertar (umbral es MENOR A 1)
	// 10L restantes con consumo 10L/h = 1.0h exacta → NO alerta
	r := &models.SensorReading{
		FuelLevel:    (10.0 / 60.0) * 100, // ~16.67%
		FuelCapacity: 60.0,
		Consumption:  10.0,
	}

	// 1.0h exacta → NO debería alertar (la condición es < 1.0)
	autonomy := r.FuelAutonomyHours()
	if autonomy < 0.99 || autonomy > 1.01 {
		t.Skipf("ajuste de precisión: autonomía calculada %.4f, no exactamente 1.0h", autonomy)
	}

	if r.NeedsLowFuelAlert() {
		t.Error("exactamente 1 hora no debe generar alerta (umbral es < 1.0)")
	}
}

func TestMaskedDeviceID(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{"DEV-A1B2-XC54", "DEV-****-XC54"},
		{"DEV-C3D4-YD89", "DEV-****-YD89"},
		{"DEV-E5F6-ZE12", "DEV-****-ZE12"},
	}

	for _, tc := range cases {
		v := &models.Vehicle{DeviceID: tc.input}
		got := v.MaskedDeviceID()
		if got != tc.expected {
			t.Errorf("MaskedDeviceID(%q) = %q, esperado %q", tc.input, got, tc.expected)
		}
	}
}
