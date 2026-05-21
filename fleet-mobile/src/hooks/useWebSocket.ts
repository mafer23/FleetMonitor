// ═══════════════════════════════════════════════════════
// useWebSocket — Hook para WebSocket en React Native
// Auto-reconexión y notificaciones push para alertas
// ═══════════════════════════════════════════════════════

import { useEffect, useRef, useCallback, useState } from 'react';
import { useFleetStore } from '../lib/store';
import { getToken, SensorReading } from '../lib/api';
import { showLocalAlert } from '../lib/notifications';

const WS_URL = 'ws://192.168.1.4:8080'; 
interface WSMessage {
  type: string;
  data: unknown;
  admin_only: boolean;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
  const updateReading = useFleetStore((s) => s.updateReading);
  const loadAlerts = useFleetStore((s) => s.loadAlerts);
  const user = useFleetStore((s) => s.user);

  const connect = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);

    ws.onopen = () => {
      setConnected(true);
      console.log('🟢 WS Mobile conectado');
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);

        if (msg.type === 'sensor_update') {
          updateReading(msg.data as SensorReading);
        }

        if (msg.type === 'alert' && user?.role === 'admin') {
          // Mostrar notificación push local
          const alertData = msg.data as { vehicle_id: number; type: string; autonomy: number };
          showLocalAlert(
            '⚠️ Alerta de Combustible',
            `Vehículo ${alertData.vehicle_id}: autonomía de ${alertData.autonomy.toFixed(1)} horas`,
            alertData
          );
          loadAlerts();
        }
      } catch (err) {
        console.error('WS: mensaje inválido', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('🔴 WS desconectado. Reconectando en 5s...');
      reconnectRef.current = setTimeout(connect, 5000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [updateReading, loadAlerts, user]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return { connected };
}
