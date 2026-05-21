// ═══════════════════════════════════════════════════════
// useWebSocket — Hook para recibir datos en tiempo real
// ═══════════════════════════════════════════════════════

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getToken } from '@/lib/api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

interface WSMessage {
  type: string;
  data: unknown;
  admin_only: boolean;
}

type MessageHandler = (msg: WSMessage) => void;

export function useWebSocket(onMessage: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) return;

    // Cerrar conexión existente
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);

    ws.onopen = () => {
      setConnected(true);
      console.log('🟢 WebSocket conectado');
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        onMessage(msg);
      } catch (err) {
        console.error('WS: mensaje inválido', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('🔴 WebSocket desconectado. Reconectando en 3s...');
      reconnectTimeout.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error('WS error:', err);
      ws.close();
    };

    wsRef.current = ws;
  }, [onMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return { connected };
}
