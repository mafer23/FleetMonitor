# Fleet Mobile — React Native (Expo)

## Requisitos previos

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app en tu teléfono (iOS/Android)

## Instalación

```bash
cd fleet-mobile
npm install
```

## Configuración de la API

Edita la URL en `src/lib/api.ts` y `src/hooks/useWebSocket.ts`:

```typescript
// Android Emulator → localhost del PC
const API_URL = 'http://10.0.2.2:8080';

// iOS Simulator → localhost directo
const API_URL = 'http://localhost:8080';

// Dispositivo físico → IP local del PC
const API_URL = 'http://192.168.1.X:8080';
```

## Ejecutar

```bash
# Iniciar Expo
npx expo start

# Opciones:
# Escanear QR con Expo Go (teléfono físico)
# Presionar 'a' para Android emulator
# Presionar 'i' para iOS simulator
```

## Funcionalidades

- **Mapa interactivo** con marcadores por color de combustible
- **Tarjetas de vehículo** con velocidad, fuel y temperatura
- **Gráficos históricos** de combustible y velocidad
- **Alertas predictivas** (solo admin) con resolución
- **Push notifications** locales al recibir alertas por WebSocket
- **Sincronización offline** con AsyncStorage
- **Auto-reconexión** WebSocket cada 5 segundos
- **Pull-to-refresh** para actualizar datos

## Estructura

```
fleet-mobile/
├── App.tsx                          # Navegación principal
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx          # Autenticación
│   │   └── DashboardScreen.tsx      # Dashboard con mapa
│   ├── components/
│   │   ├── VehicleCard.tsx          # Tarjeta de vehículo
│   │   ├── FuelChart.tsx            # Gráficos históricos
│   │   └── AlertsList.tsx           # Lista de alertas
│   ├── lib/
│   │   ├── api.ts                   # Cliente API
│   │   ├── offline.ts              # Cache AsyncStorage
│   │   ├── notifications.ts        # Push notifications
│   │   ├── store.ts                # Estado global (Zustand)
│   │   └── theme.ts                # Tokens de diseño
│   └── hooks/
│       └── useWebSocket.ts         # WebSocket con auto-reconexión
├── app.json                        # Config Expo
└── package.json
```
