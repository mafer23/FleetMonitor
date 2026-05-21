// ═══════════════════════════════════════════════════════
// Notifications — Push notifications con Expo
// Registra token y muestra notificaciones locales de alertas
// ═══════════════════════════════════════════════════════

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configurar cómo se muestran las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Registrar para push notifications ──────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  // Solo funciona en dispositivos reales, no en simuladores
  if (!Device.isDevice) {
    console.log('Push notifications requieren dispositivo físico');
    return null;
  }

  // Pedir permisos
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permisos de notificación no concedidos');
    return null;
  }

  // Configurar canal para Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('fleet-alerts', {
      name: 'Alertas de Flota',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22d3ee',
    });
  }

  // Obtener token de Expo Push
  const tokenData = await Notifications.getExpoPushTokenAsync();
  console.log('Push token:', tokenData.data);
  return tokenData.data;
}

// ── Enviar notificación local (para alertas del WebSocket) ──

export async function showLocalAlert(title: string, body: string, data?: object): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null, // inmediata
  });
}

// ── Listener para cuando el usuario toca una notificación ──

export function addNotificationResponseListener(
  callback: (notification: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
