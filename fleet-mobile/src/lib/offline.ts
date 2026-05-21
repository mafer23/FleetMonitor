// ═══════════════════════════════════════════════════════
// Offline Cache — AsyncStorage para sincronización offline
// En móvil usamos AsyncStorage (key-value) en lugar de IndexedDB
// ═══════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Vehicle, SensorReading, Alert } from './api';

const KEYS = {
  VEHICLES: '@fleet_vehicles',
  READINGS_PREFIX: '@fleet_readings_', // + vehicleId
  ALERTS: '@fleet_alerts',
  LAST_SYNC: '@fleet_last_sync',
};

// ── Vehículos ──────────────────────────────────────────

export async function cacheVehicles(vehicles: Vehicle[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.VEHICLES, JSON.stringify(vehicles));
}

export async function getCachedVehicles(): Promise<Vehicle[]> {
  const raw = await AsyncStorage.getItem(KEYS.VEHICLES);
  return raw ? JSON.parse(raw) : [];
}

// ── Lecturas por vehículo ──────────────────────────────

export async function cacheReadings(vehicleId: number, readings: SensorReading[]): Promise<void> {
  const key = KEYS.READINGS_PREFIX + vehicleId;
  // Guardar solo las últimas 100 para no llenar el storage
  const trimmed = readings.slice(0, 100);
  await AsyncStorage.setItem(key, JSON.stringify(trimmed));
}

export async function getCachedReadings(vehicleId: number): Promise<SensorReading[]> {
  const key = KEYS.READINGS_PREFIX + vehicleId;
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

// ── Alertas ────────────────────────────────────────────

export async function cacheAlerts(alerts: Alert[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.ALERTS, JSON.stringify(alerts));
}

export async function getCachedAlerts(): Promise<Alert[]> {
  const raw = await AsyncStorage.getItem(KEYS.ALERTS);
  return raw ? JSON.parse(raw) : [];
}

// ── Timestamp de última sincronización ─────────────────

export async function setLastSync(): Promise<void> {
  await AsyncStorage.setItem(KEYS.LAST_SYNC, Date.now().toString());
}

export async function getLastSync(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(KEYS.LAST_SYNC);
  return raw ? parseInt(raw, 10) : null;
}

// ── Conectividad ───────────────────────────────────────

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true;
}

export function onConnectionChange(callback: (online: boolean) => void): () => void {
  const unsubscribe = NetInfo.addEventListener((state) => {
    callback(state.isConnected === true);
  });
  return unsubscribe;
}
