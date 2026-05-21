-- Usuarios del sistema
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    UNIQUE NOT NULL,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'viewer',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Vehículos de la flota
CREATE TABLE IF NOT EXISTS vehicles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id   TEXT    UNIQUE NOT NULL,
    plate       TEXT    NOT NULL,
    name        TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Lecturas de sensores (GPS, combustible, temperatura)
CREATE TABLE IF NOT EXISTS sensor_readings (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id    INTEGER NOT NULL REFERENCES vehicles(id),
    latitude      REAL    NOT NULL,
    longitude     REAL    NOT NULL,
    speed         REAL    NOT NULL DEFAULT 0,
    fuel_level    REAL    NOT NULL,
    fuel_capacity REAL    NOT NULL DEFAULT 60.0,
    consumption   REAL    NOT NULL DEFAULT 8.5,
    temperature   REAL    NOT NULL DEFAULT 20.0,
    recorded_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Alertas generadas por el sistema
CREATE TABLE IF NOT EXISTS alerts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id),
    type        TEXT    NOT NULL,
    message     TEXT    NOT NULL,
    severity    TEXT    NOT NULL DEFAULT 'warning',
    resolved    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_readings_vehicle_time ON sensor_readings(vehicle_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_vehicle ON alerts(vehicle_id, resolved, created_at DESC);

-- Datos de prueba
INSERT OR IGNORE INTO users (username, password, role) VALUES
    ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin'),
    ('viewer', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'viewer');

INSERT OR IGNORE INTO vehicles (device_id, plate, name) VALUES
    ('DEV-A1B2-XC54', 'ABC-123', 'Camión 01'),
    ('DEV-C3D4-YD89', 'DEF-456', 'Camión 02'),
    ('DEV-E5F6-ZE12', 'GHI-789', 'Furgón 03');
