# 🚛 Fleet Monitor — Sistema IoT de Monitoreo Vehicular
 
<div align="center">
![Go](https://img.shields.io/badge/Go-1.22-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-Expo_54-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-Real_Time-FF6F00?style=for-the-badge)
 
**Sistema full-stack de monitoreo en tiempo real para flotas vehiculares con alertas predictivas de combustible, mapa interactivo y soporte offline.**
 
[Backend](#-backend-go) · [Frontend](#-frontend-nextjs) · [Mobile](#-mobile-react-native) · [Demo](#-ejecución-rápida) · [Arquitectura](#-arquitectura)
 
</div>
---
 
## 📋 Descripción
 
Fleet Monitor es una plataforma IoT que permite monitorear vehículos de una flota en tiempo real. El sistema recibe datos de sensores (GPS, combustible, temperatura), los procesa para generar alertas predictivas y los muestra en un dashboard interactivo con mapa en vivo.
 
### Características principales
 
- **Autenticación JWT manual** — Implementación HMAC-SHA256 desde cero, sin librerías externas
- **Alertas predictivas** — Detección automática cuando un vehículo tiene menos de 1 hora de autonomía de combustible
- **Tiempo real** — Actualizaciones instantáneas vía WebSocket con patrón pub/sub
- **Roles y privacidad** — Admin ve todo, Viewer ve IDs enmascarados (`DEV-****-XC54`) y no accede a alertas
- **Modo offline** — IndexedDB (web) y AsyncStorage (mobile) para operar sin conexión
- **Mapa interactivo** — Ubicaciones en vivo con marcadores coloreados según nivel de combustible
---
 
## 🏗 Arquitectura
 
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  App Mobile │    │ Dashboard   │    │ Panel Admin │
│ React Native│    │  Next.js    │    │  Next.js    │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       │         HTTP/REST + WebSocket       │
       └──────────────────┼──────────────────┘
                          │
                ┌─────────┴─────────┐
                │   Backend (Go)    │
                │                   │
                │  ┌─────────────┐  │
                │  │  JWT Auth   │  │
                │  │  (manual)   │  │
                │  └─────────────┘  │
                │  ┌─────────────┐  │
                │  │  WebSocket  │  │
                │  │  Hub (pub/  │  │
                │  │     sub)    │  │
                │  └─────────────┘  │
                │  ┌─────────────┐  │
                │  │  Alertas    │  │
                │  │ Predictivas │  │
                │  └─────────────┘  │
                └─────────┬─────────┘
                          │
                ┌─────────┴─────────┐
                │  SQLite / Postgre │
                └───────────────────┘
```
 
---
 
## 🔧 Backend (Go)
 
### Stack
| Tecnología | Uso |
|------------|-----|
| Go 1.22 | Lenguaje principal |
| `net/http` | Servidor HTTP y router |
| `crypto/hmac` + `crypto/sha256` | JWT manual (HMAC-SHA256) |
| `gorilla/websocket` | Conexiones WebSocket |
| `modernc.org/sqlite` | Base de datos (Go puro, sin CGO) |
 
### Endpoints
 
| Método | Ruta | Descripción | Acceso |
|--------|------|-------------|--------|
| `POST` | `/api/auth/login` | Autenticación → devuelve JWT | Público |
| `GET` | `/api/vehicles` | Listar vehículos | Auth |
| `POST` | `/api/sensors` | Ingestar lectura de sensor | Auth |
| `GET` | `/api/vehicles/:id/latest` | Última lectura de un vehículo | Auth |
| `GET` | `/api/vehicles/:id/history` | Historial de lecturas | Auth |
| `GET` | `/api/alerts` | Alertas activas | Solo Admin |
| `PUT` | `/api/alerts/:id/resolve` | Resolver una alerta | Solo Admin |
| `WS` | `/ws?token=JWT` | WebSocket tiempo real | Auth |
 
### JWT Manual
 
La autenticación se implementó **sin librerías externas**, usando solo el paquete estándar de Go:
 
```
Header (base64url) . Payload (base64url) . Signature (HMAC-SHA256)
```
 
- Firma con `crypto/hmac` + `crypto/sha256`
- Codificación `base64.RawURLEncoding` (sin padding)
- Comparación con `hmac.Equal` (resistente a timing attacks)
- Expiración de 24 horas validada en cada request
### Alerta Predictiva de Combustible
 
```
autonomía (horas) = (capacidad_tanque × nivel% / 100) / consumo_litros_hora
```
 
Si `autonomía < 1 hora` → se genera alerta `low_fuel` con severidad `critical`. El sistema deduplica alertas verificando que no exista una activa del mismo tipo para el vehículo.
 
### Estructura
 
```
fleet-backend/
├── cmd/server/main.go              # Punto de entrada
├── internal/
│   ├── auth/
│   │   ├── jwt.go                  # JWT HMAC-SHA256 manual
│   │   ├── middleware.go           # Middleware HTTP + RequireAdmin
│   │   └── jwt_test.go            # 15 unit tests
│   ├── db/db.go                   # Conexión SQLite/PostgreSQL
│   ├── handlers/handlers.go       # Endpoints REST + CORS
│   ├── models/models.go           # Structs + lógica de dominio
│   ├── sensors/processor.go       # Ingesta + alertas predictivas
│   └── websocket/hub.go           # Hub pub/sub para WS
├── migrations/001_init.sql        # Schema + datos de prueba
├── DESIGN.md                      # Decisiones técnicas
└── SETUP.md                       # Guía de despliegue
```
 
---
 
## 💻 Frontend (Next.js)
 
### Stack
| Tecnología | Uso |
|------------|-----|
| Next.js 14 | Framework React con SSR |
| TypeScript | Tipado estático |
| Tailwind CSS | Estilos utilitarios |
| MapLibre GL | Mapa interactivo |
| Recharts | Gráficos históricos |
| IndexedDB (`idb`) | Cache offline |
 
### Funcionalidades
 
- **Mapa interactivo** — Marcadores coloreados: 🟢 fuel >40%, 🟡 15-40%, 🔴 <15%
- **Gráficos históricos** — Velocidad y combustible por vehículo
- **Alertas predictivas** — Panel visible solo para rol `admin`
- **Enmascaramiento** — Viewers ven `DEV-****-XC54` en vez del ID real
- **WebSocket** — Datos actualizados en tiempo real con auto-reconexión cada 3s
- **Modo offline** — IndexedDB almacena vehículos, lecturas y alertas para uso sin conexión
- **Indicador de conexión** — Muestra estado online/offline en la interfaz
### Estructura
 
```
fleet-frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Layout raíz
│   │   ├── page.tsx                # Redirect según auth
│   │   ├── login/page.tsx          # Pantalla de login
│   │   └── dashboard/page.tsx      # Dashboard principal
│   ├── components/
│   │   ├── FleetMap.tsx            # Mapa MapLibre
│   │   ├── HistoryCharts.tsx       # Gráficos Recharts
│   │   ├── VehicleCards.tsx        # Tarjetas de vehículos
│   │   ├── AlertsPanel.tsx         # Panel de alertas (admin)
│   │   └── ConnectionStatus.tsx    # Indicador online/offline
│   ├── hooks/
│   │   └── useWebSocket.ts        # Hook WebSocket
│   └── lib/
│       ├── api.ts                  # Cliente API + tipos
│       └── offline.ts             # Cache IndexedDB
```
 
---
 
## 📱 Mobile (React Native)
 
### Stack
| Tecnología | Uso |
|------------|-----|
| React Native | Framework mobile |
| Expo SDK 54 | Toolchain y build |
| Zustand | Estado global |
| AsyncStorage | Cache offline |
| expo-notifications | Push notifications |
| react-native-maps | Mapa nativo |
| react-native-chart-kit | Gráficos |
 
### Funcionalidades
 
- **Réplica del dashboard web** adaptada a pantalla móvil
- **Mapa nativo** con marcadores por nivel de combustible
- **Push notifications locales** al recibir alertas por WebSocket
- **Sincronización offline** con AsyncStorage + NetInfo
- **Pull-to-refresh** para actualizar datos manualmente
- **Auto-reconexión** WebSocket cada 5 segundos
### Estructura
 
```
fleet-mobile/
├── App.tsx                         # Navegación principal
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx         # Autenticación
│   │   └── DashboardScreen.tsx     # Dashboard con mapa
│   ├── components/
│   │   ├── VehicleCard.tsx         # Tarjeta de vehículo
│   │   ├── FuelChart.tsx           # Gráficos históricos
│   │   └── AlertsList.tsx          # Lista de alertas
│   ├── lib/
│   │   ├── api.ts                  # Cliente API (AsyncStorage)
│   │   ├── offline.ts             # Cache offline
│   │   ├── notifications.ts       # Push notifications
│   │   ├── store.ts               # Estado global Zustand
│   │   └── theme.ts               # Tokens de diseño
│   └── hooks/
│       └── useWebSocket.ts        # WebSocket + notificaciones
```
 
---
 
## 🚀 Ejecución rápida
 
### Requisitos
 
- [Go 1.22+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)
- [Expo Go](https://expo.dev/client) en el teléfono (para mobile)
### 1. Backend
 
```bash
cd fleet-backend
go mod tidy
go run ./cmd/server/main.go
# ✅ Servidor en http://localhost:8080
```
 
### 2. Frontend
 
```bash
cd fleet-frontend
cp .env.local.example .env.local
npm install
npm run dev
# ✅ Dashboard en http://localhost:3000
```
 
### 3. Mobile
 
```bash
cd fleet-mobile
npm install --legacy-peer-deps
# Editar src/lib/api.ts → cambiar IP a la de tu PC
npx expo start
# Escanear QR con Expo Go
```
 
### Credenciales de prueba
 
| Usuario | Contraseña | Rol | Acceso |
|---------|-----------|-----|--------|
| `admin` | `password123` | Administrador | Dashboard + alertas + IDs completos |
| `viewer` | `password123` | Visualizador | Dashboard sin alertas + IDs enmascarados |
 
---
 
## 🧪 Testing
 
```bash
cd fleet-backend
go test ./... -v
```
 
Los unit tests cubren:
 
- **JWT** — Generación, validación, firma alterada, tokens malformados, expiración
- **Combustible** — Cálculo de autonomía, tanque lleno, consumo cero, umbral de alerta
- **Enmascaramiento** — Device IDs enmascarados correctamente
---
 
## 📐 Decisiones técnicas y trade-offs
 
| Decisión | Ventaja | Trade-off |
|----------|---------|-----------|
| Go para backend | Concurrencia nativa, ideal para WebSocket/IoT | Curva de aprendizaje mayor |
| JWT manual | Control total, sin dependencias vulnerables | Más código que mantener |
| SQLite en dev | Zero config, archivo único | No apto para escrituras concurrentes en prod |
| modernc.org/sqlite | Go puro, sin necesidad de compilador C | Algo más lento que go-sqlite3 con CGO |
| IndexedDB + AsyncStorage | Offline real sin servidor | Sincronización manual al reconectar |
| WebSocket pub/sub | Baja latencia, filtrado por rol | Sin persistencia de mensajes |
 
Documentación detallada en [`DESIGN.md`](./fleet-backend/DESIGN.md).
 
---
 
## 📁 Estructura del monorepo
 
```
fleet-monitor/
├── fleet-backend/          # API REST + WebSocket (Go)
├── fleet-frontend/         # Dashboard web (Next.js)
├── fleet-mobile/           # App móvil (React Native/Expo)
└── README.md
```
 
---
 
<div align="center">
Desarrollado para la prueba técnica de **Simon Movilidad**
 
</div>
