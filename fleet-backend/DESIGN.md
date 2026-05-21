# DESIGN.md — Simon Movilidad Fleet IoT

## Stack elegido

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Backend | Go (Golang) | 1.22 |
| Frontend | Next.js + React | 14 |
| Mobile | React Native (Expo) | SDK 51 |
| Base de datos | PostgreSQL / SQLite | 16 / 3 |
| WebSockets | gorilla/websocket | 1.5 |
| Mapas | MapLibre GL JS | 4.x |
| Gráficos | Recharts | 2.x |

## Decisiones de arquitectura

### ¿Por qué Golang?

- **Concurrencia nativa**: Las goroutines permiten manejar cientos de conexiones WebSocket simultáneas con muy bajo consumo de memoria (~2KB por goroutine vs ~1MB por thread en otros lenguajes).
- **Rendimiento**: Para IoT con alta frecuencia de escrituras de sensores, Go es entre 5-10x más rápido que Node.js en throughput puro.
- **Binario estático**: El servidor se compila en un solo ejecutable sin dependencias, simplificando el despliegue.
- **Trade-off**: La curva de aprendizaje es más pronunciada que Node.js/Python, y el ecosistema de librerías es más pequeño.

### JWT Manual (sin librerías externas)

El JWT se implementa desde cero usando solo la librería estándar de Go:
- `crypto/hmac` + `crypto/sha256` para firmar
- `encoding/base64` para codificar
- `encoding/json` para serializar los claims

**Ventajas**: Control total sobre la implementación, sin dependencias externas vulnerables.
**Trade-off**: Más código a mantener; en producción se evaluaría usar `golang-jwt/jwt` que tiene auditorías de seguridad.

### WebSocket Hub (patrón pub/sub)

El Hub central gestiona todas las conexiones con canales Go (channels):
- `register`: nuevo cliente conectado
- `unregister`: cliente desconectado
- `broadcast`: mensaje a todos los clientes

Los mensajes con `admin_only: true` son filtrados en el `writePump` de cada cliente según su rol, sin exponer datos sensibles a viewers.

### Alertas predictivas de combustible

**Fórmula**:
```
autonomia_horas = (capacidad_total * nivel_porcentaje / 100) / consumo_litros_por_hora
```

Si `autonomia_horas < 1.0` → alerta tipo `low_fuel` con severidad `critical`.

El sistema evita alertas duplicadas verificando si ya existe una alerta activa no resuelta del mismo tipo para el vehículo antes de crear una nueva.

### Enmascaramiento de IDs

Los IDs de dispositivos siguen el formato `DEV-XXXX-YYYY`. Para usuarios con rol `viewer`, el segmento central se reemplaza con asteriscos: `DEV-****-YYYY`. Esto se aplica en el handler de vehículos consultando el rol del token JWT.

## Trade-offs conocidos

| Decisión | Pro | Contra |
|----------|-----|--------|
| SQLite para dev | Sin setup externo | No apto para múltiples escrituras concurrentes en prod |
| gorilla/websocket | API simple y madura | Mantenimiento reducido del autor |
| JWT sin refresh token | Implementación simple | El token no puede revocarse antes de expirar |
| Alertas sin deduplicación avanzada | Simple | Puede perder alertas si la DB falla momentáneamente |

## Estructura de carpetas

```
fleet-backend/
├── cmd/server/main.go          # Punto de entrada
├── internal/
│   ├── auth/
│   │   ├── jwt.go              # JWT HMAC-SHA256 manual
│   │   ├── middleware.go       # Middleware HTTP + RequireAdmin
│   │   └── jwt_test.go         # Tests unitarios
│   ├── db/db.go                # Conexión PostgreSQL/SQLite
│   ├── handlers/handlers.go    # Todos los endpoints HTTP
│   ├── models/models.go        # Structs + lógica de dominio
│   ├── sensors/processor.go    # Ingesta + evaluación de alertas
│   └── websocket/hub.go        # Hub pub/sub para WS
├── migrations/001_init.sql     # Schema + datos de prueba
├── go.mod
├── DESIGN.md
└── SETUP.md
```
