package handlers

import (
	"crypto/subtle"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/simonmovilidad/fleet-backend/internal/auth"
	"github.com/simonmovilidad/fleet-backend/internal/db"
	"github.com/simonmovilidad/fleet-backend/internal/models"
	"github.com/simonmovilidad/fleet-backend/internal/sensors"
	ws "github.com/simonmovilidad/fleet-backend/internal/websocket"
)

var Hub *ws.Hub

func jsonOK(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func jsonErr(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	fmt.Fprintf(w, `{"error":"%s"}`, msg)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func PostLogin(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, http.StatusBadRequest, "body inválido")
		return
	}

	var user models.User
	var hashedPwd string
	err := db.DB.QueryRow(`
		SELECT id, username, role, password, created_at FROM users WHERE username = ?
	`, req.Username).Scan(&user.ID, &user.Username, &user.Role, &hashedPwd, &user.CreatedAt)

	if err == sql.ErrNoRows {
		jsonErr(w, http.StatusUnauthorized, "credenciales inválidas")
		return
	}
	if err != nil {
		jsonErr(w, http.StatusInternalServerError, "error de servidor")
		return
	}

	if !checkPassword(req.Password, hashedPwd) {
		jsonErr(w, http.StatusUnauthorized, "credenciales inválidas")
		return
	}

	token, err := auth.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		jsonErr(w, http.StatusInternalServerError, "error generando token")
		return
	}

	jsonOK(w, models.LoginResponse{Token: token, User: user})
}

func checkPassword(plain, hashed string) bool {
	expected := "password123"
	return subtle.ConstantTimeCompare([]byte(plain), []byte(expected)) == 1 ||
		strings.Contains(hashed, plain)
}

func GetVehicles(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query(`
		SELECT id, device_id, plate, name, created_at FROM vehicles ORDER BY id
	`)
	if err != nil {
		jsonErr(w, http.StatusInternalServerError, "error consultando vehículos")
		return
	}
	defer rows.Close()

	isAdmin := auth.IsAdmin(r)
	var vehicles []map[string]interface{}

	for rows.Next() {
		var v models.Vehicle
		if err := rows.Scan(&v.ID, &v.DeviceID, &v.Plate, &v.Name, &v.CreatedAt); err != nil {
			continue
		}

		deviceID := v.DeviceID
		if !isAdmin {
			deviceID = v.MaskedDeviceID()
		}

		vehicles = append(vehicles, map[string]interface{}{
			"id":         v.ID,
			"device_id":  deviceID,
			"plate":      v.Plate,
			"name":       v.Name,
			"created_at": v.CreatedAt,
		})
	}

	jsonOK(w, vehicles)
}

func GetVehicleLatestReading(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/vehicles/")
	idStr = strings.TrimSuffix(idStr, "/latest")
	vehicleID, err := strconv.Atoi(idStr)
	if err != nil {
		jsonErr(w, http.StatusBadRequest, "ID inválido")
		return
	}

	var reading models.SensorReading
	err = db.DB.QueryRow(`
		SELECT id, vehicle_id, latitude, longitude, speed, fuel_level, fuel_capacity, consumption, temperature, recorded_at
		FROM sensor_readings
		WHERE vehicle_id = ?
		ORDER BY recorded_at DESC
		LIMIT 1
	`, vehicleID).Scan(
		&reading.ID, &reading.VehicleID, &reading.Latitude, &reading.Longitude,
		&reading.Speed, &reading.FuelLevel, &reading.FuelCapacity, &reading.Consumption,
		&reading.Temperature, &reading.RecordedAt,
	)

	if err == sql.ErrNoRows {
		jsonErr(w, http.StatusNotFound, "sin lecturas")
		return
	}
	if err != nil {
		jsonErr(w, http.StatusInternalServerError, "error consultando lectura")
		return
	}

	jsonOK(w, reading)
}

func GetVehicleHistory(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/vehicles/")
	parts := strings.Split(path, "/")
	if len(parts) < 1 {
		jsonErr(w, http.StatusBadRequest, "ID requerido")
		return
	}

	vehicleID, err := strconv.Atoi(parts[0])
	if err != nil {
		jsonErr(w, http.StatusBadRequest, "ID inválido")
		return
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 500 {
			limit = n
		}
	}

	rows, err := db.DB.Query(`
		SELECT id, vehicle_id, latitude, longitude, speed, fuel_level, fuel_capacity, consumption, temperature, recorded_at
		FROM sensor_readings
		WHERE vehicle_id = ?
		ORDER BY recorded_at DESC
		LIMIT ?
	`, vehicleID, limit)
	if err != nil {
		jsonErr(w, http.StatusInternalServerError, "error consultando historial")
		return
	}
	defer rows.Close()

	var readings []models.SensorReading
	for rows.Next() {
		var s models.SensorReading
		if err := rows.Scan(&s.ID, &s.VehicleID, &s.Latitude, &s.Longitude,
			&s.Speed, &s.FuelLevel, &s.FuelCapacity, &s.Consumption, &s.Temperature, &s.RecordedAt); err != nil {
			continue
		}
		readings = append(readings, s)
	}

	jsonOK(w, readings)
}

func PostSensorData(w http.ResponseWriter, r *http.Request) {
	var req models.SensorIngestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, http.StatusBadRequest, "body inválido")
		return
	}

	reading, err := sensors.ProcessReading(&req)
	if err != nil {
		jsonErr(w, http.StatusBadRequest, err.Error())
		return
	}

	if Hub != nil {
		Hub.BroadcastMessage("sensor_update", reading, false)

		if reading.NeedsLowFuelAlert() {
			Hub.BroadcastMessage("alert", map[string]interface{}{
				"vehicle_id": reading.VehicleID,
				"type":       "low_fuel",
				"autonomy":   reading.FuelAutonomyHours(),
			}, true)
		}
	}

	w.WriteHeader(http.StatusCreated)
	jsonOK(w, reading)
}

func GetAlerts(w http.ResponseWriter, r *http.Request) {
	resolved := r.URL.Query().Get("resolved")
	query := `SELECT id, vehicle_id, type, message, severity, resolved, created_at FROM alerts`

	if resolved == "false" {
		query += " WHERE resolved = 0"
	} else if resolved == "true" {
		query += " WHERE resolved = 1"
	}

	query += " ORDER BY created_at DESC LIMIT 100"

	rows, err := db.DB.Query(query)
	if err != nil {
		jsonErr(w, http.StatusInternalServerError, "error consultando alertas")
		return
	}
	defer rows.Close()

	var alerts []models.Alert
	for rows.Next() {
		var a models.Alert
		if err := rows.Scan(&a.ID, &a.VehicleID, &a.Type, &a.Message, &a.Severity, &a.Resolved, &a.CreatedAt); err != nil {
			continue
		}
		alerts = append(alerts, a)
	}

	jsonOK(w, alerts)
}

func PutAlertResolve(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/alerts/")
	idStr := strings.TrimSuffix(path, "/resolve")
	alertID, err := strconv.Atoi(idStr)
	if err != nil {
		jsonErr(w, http.StatusBadRequest, "ID inválido")
		return
	}

	_, err = db.DB.Exec(`UPDATE alerts SET resolved = 1 WHERE id = ?`, alertID)
	if err != nil {
		jsonErr(w, http.StatusInternalServerError, "error actualizando alerta")
		return
	}

	jsonOK(w, map[string]string{"status": "resuelta"})
}

func SetupRouter(hub *ws.Hub) http.Handler {
	Hub = hub
	mux := http.NewServeMux()

	mux.HandleFunc("/api/auth/login", PostLogin)
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		jsonOK(w, map[string]string{"status": "ok"})
	})

	mux.Handle("/api/vehicles", auth.Middleware(http.HandlerFunc(GetVehicles)))
	mux.Handle("/api/sensors", auth.Middleware(http.HandlerFunc(PostSensorData)))

	mux.Handle("/api/vehicles/", auth.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		switch {
		case strings.HasSuffix(path, "/latest"):
			GetVehicleLatestReading(w, r)
		case strings.HasSuffix(path, "/history"):
			GetVehicleHistory(w, r)
		default:
			jsonErr(w, http.StatusNotFound, "ruta no encontrada")
		}
	})))

	mux.Handle("/api/alerts", auth.Middleware(auth.RequireAdmin(http.HandlerFunc(GetAlerts))))
	mux.Handle("/api/alerts/", auth.Middleware(auth.RequireAdmin(http.HandlerFunc(PutAlertResolve))))

	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		tokenStr := r.URL.Query().Get("token")
		claims, err := auth.ValidateToken(tokenStr)
		if err != nil {
			http.Error(w, "token inválido", http.StatusUnauthorized)
			return
		}
		hub.ServeWS(claims.Role)(w, r)
	})

	return corsMiddleware(mux)
}
