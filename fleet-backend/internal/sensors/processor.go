package sensors

import (
	"fmt"
	"log"
	"time"

	"github.com/simonmovilidad/fleet-backend/internal/db"
	"github.com/simonmovilidad/fleet-backend/internal/models"
)

func ProcessReading(req *models.SensorIngestRequest) (*models.SensorReading, error) {
	vehicle, err := findVehicle(req.DeviceID)
	if err != nil {
		return nil, fmt.Errorf("vehículo no encontrado: %s", req.DeviceID)
	}

	reading := &models.SensorReading{
		VehicleID:    vehicle.ID,
		Latitude:     req.Latitude,
		Longitude:    req.Longitude,
		Speed:        req.Speed,
		FuelLevel:    req.FuelLevel,
		FuelCapacity: req.FuelCap,
		Consumption:  req.Consumption,
		Temperature:  req.Temperature,
	}

	if err := saveReading(reading); err != nil {
		return nil, fmt.Errorf("error guardando lectura: %w", err)
	}

	go evaluateAlerts(vehicle, reading)

	return reading, nil
}

func evaluateAlerts(vehicle *models.Vehicle, r *models.SensorReading) {
	autonomy := r.FuelAutonomyHours()
	if r.NeedsLowFuelAlert() {
		msg := fmt.Sprintf(
			"Vehículo %s tiene %.0f%% de combustible. Autonomía estimada: %.1f horas.",
			vehicle.Name, r.FuelLevel, autonomy,
		)
		createAlertIfNew(vehicle.ID, "low_fuel", msg, "critical")
	}

	if r.Temperature > 90 {
		msg := fmt.Sprintf(
			"Temperatura del motor de %s en %.1f°C. Revisar sistema de refrigeración.",
			vehicle.Name, r.Temperature,
		)
		createAlertIfNew(vehicle.ID, "high_temp", msg, "warning")
	}

	if r.Speed > 120 {
		msg := fmt.Sprintf(
			"Vehículo %s superó el límite de velocidad: %.0f km/h.",
			vehicle.Name, r.Speed,
		)
		createAlertIfNew(vehicle.ID, "speeding", msg, "warning")
	}
}

func createAlertIfNew(vehicleID int, alertType, message, severity string) {
	var count int
	err := db.DB.QueryRow(`
		SELECT COUNT(*) FROM alerts
		WHERE vehicle_id = ? AND type = ? AND resolved = 0
	`, vehicleID, alertType).Scan(&count)

	if err != nil || count > 0 {
		return
	}

	_, err = db.DB.Exec(`
		INSERT INTO alerts (vehicle_id, type, message, severity)
		VALUES (?, ?, ?, ?)
	`, vehicleID, alertType, message, severity)

	if err != nil {
		log.Printf("error creando alerta: %v", err)
	}
}

func findVehicle(deviceID string) (*models.Vehicle, error) {
	v := &models.Vehicle{}
	err := db.DB.QueryRow(`
		SELECT id, device_id, plate, name FROM vehicles WHERE device_id = ?
	`, deviceID).Scan(&v.ID, &v.DeviceID, &v.Plate, &v.Name)
	return v, err
}

func saveReading(r *models.SensorReading) error {
	result, err := db.DB.Exec(`
		INSERT INTO sensor_readings
			(vehicle_id, latitude, longitude, speed, fuel_level, fuel_capacity, consumption, temperature)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, r.VehicleID, r.Latitude, r.Longitude, r.Speed,
		r.FuelLevel, r.FuelCapacity, r.Consumption, r.Temperature,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	r.ID = int(id)
	r.RecordedAt = time.Now().Format("2006-01-02 15:04:05")

	return nil
}
