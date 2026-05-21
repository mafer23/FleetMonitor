# SETUP.md — Guía de despliegue local

## Requisitos previos

- Go 1.22+ → https://go.dev/dl/
- Git
- (Opcional) PostgreSQL 16 si no usas SQLite

## Instalación rápida (SQLite, sin setup de DB)

```bash
# 1. Clonar repositorio
git clone https://github.com/simonmovilidad/fleet-backend
cd fleet-backend

# 2. Instalar dependencias
go mod download

# 3. Iniciar servidor (usa SQLite por defecto)
go run ./cmd/server/main.go
```

El servidor arranca en `http://localhost:8080`.

## Instalación con PostgreSQL

```bash
# 1. Crear base de datos
createdb fleet_db

# 2. Configurar variables de entorno
export DB_DRIVER=postgres
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASS=tu_password
export DB_NAME=fleet_db
export JWT_SECRET=cambia-esto-en-produccion

# 3. Iniciar servidor
go run ./cmd/server/main.go
```

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `8080` | Puerto HTTP |
| `DB_DRIVER` | `sqlite3` | `sqlite3` o `postgres` |
| `DB_HOST` | `localhost` | Host PostgreSQL |
| `DB_PORT` | `5432` | Puerto PostgreSQL |
| `DB_USER` | `postgres` | Usuario PostgreSQL |
| `DB_PASS` | `postgres` | Contraseña PostgreSQL |
| `DB_NAME` | `fleet_db` | Nombre de la base de datos |
| `SQLITE_PATH` | `./fleet.db` | Ruta del archivo SQLite |
| `JWT_SECRET` | *(dev key)* | Clave secreta para firmar JWT |
| `MIGRATIONS_PATH` | `./migrations/001_init.sql` | Ruta del SQL de migraciones |

## Ejecutar tests

```bash
go test ./...
# Output esperado:
# ok  github.com/simonmovilidad/fleet-backend/internal/auth  0.XXXs
```

## Probar la API manualmente

```bash
# 1. Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
# Respuesta: {"token":"eyJ...","user":{...}}

# 2. Guardar el token
TOKEN="eyJ..."

# 3. Consultar vehículos
curl http://localhost:8080/api/vehicles \
  -H "Authorization: Bearer $TOKEN"

# 4. Enviar lectura de sensor
curl -X POST http://localhost:8080/api/sensors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "DEV-A1B2-XC54",
    "latitude": 7.8939,
    "longitude": -72.5078,
    "speed": 65.5,
    "fuel_level": 8.0,
    "fuel_capacity": 60.0,
    "consumption": 8.5,
    "temperature": 85.0
  }'
# fuel_level 8% → autonomía ~0.56h → genera alerta low_fuel

# 5. Ver alertas (solo admin)
curl http://localhost:8080/api/alerts?resolved=false \
  -H "Authorization: Bearer $TOKEN"

# 6. WebSocket (requiere wscat: npm install -g wscat)
wscat -c "ws://localhost:8080/ws?token=$TOKEN"
```

## Credenciales de prueba

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `password123` | admin |
| `viewer` | `password123` | viewer |
