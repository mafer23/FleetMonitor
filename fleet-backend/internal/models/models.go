package models

type Vehicle struct {
	ID        int    `json:"id"`
	DeviceID  string `json:"device_id"`
	Plate     string `json:"plate"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
}

func (v *Vehicle) MaskedDeviceID() string {
	if len(v.DeviceID) < 9 {
		return "DEV-****"
	}
	parts := v.DeviceID
	for i := len(parts) - 1; i >= 0; i-- {
		if parts[i] == '-' {
			return "DEV-****" + parts[i:]
		}
	}
	return "DEV-****"
}

type SensorReading struct {
	ID           int     `json:"id"`
	VehicleID    int     `json:"vehicle_id"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	Speed        float64 `json:"speed"`         // km/h
	FuelLevel    float64 `json:"fuel_level"`    // 0-100 %
	FuelCapacity float64 `json:"fuel_capacity"` // litros totales
	Consumption  float64 `json:"consumption"`   // litros/hora
	Temperature  float64 `json:"temperature"`   // °C
	RecordedAt   string  `json:"recorded_at"`
}

func (s *SensorReading) FuelAutonomyHours() float64 {
	if s.Consumption <= 0 {
		return 999
	}
	fuelRemaining := s.FuelCapacity * (s.FuelLevel / 100.0)
	return fuelRemaining / s.Consumption
}

func (s *SensorReading) NeedsLowFuelAlert() bool {
	return s.FuelAutonomyHours() < 1.0
}

type Alert struct {
	ID        int    `json:"id"`
	VehicleID int    `json:"vehicle_id"`
	Type      string `json:"type"` // 'low_fuel' | 'high_temp' | 'speeding'
	Message   string `json:"message"`
	Severity  string `json:"severity"` // 'info' | 'warning' | 'critical'
	Resolved  bool   `json:"resolved"`
	CreatedAt string `json:"created_at"`
}

type User struct {
	ID        int    `json:"id"`
	Username  string `json:"username"`
	Role      string `json:"role"`
	CreatedAt string `json:"created_at"`
}

type SensorIngestRequest struct {
	DeviceID    string  `json:"device_id"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	Speed       float64 `json:"speed"`
	FuelLevel   float64 `json:"fuel_level"`
	FuelCap     float64 `json:"fuel_capacity"`
	Consumption float64 `json:"consumption"`
	Temperature float64 `json:"temperature"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}
