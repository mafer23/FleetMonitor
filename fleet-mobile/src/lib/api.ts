// ═══════════════════════════════════════════════════════
// API Client — Versión React Native
// Usa AsyncStorage en lugar de localStorage
// ═══════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.4:8080'; // Android emulator → localhost
// Para iOS simulator usar http://localhost:8080
// Para dispositivo físico usar la IP de tu PC ej: http://192.168.1.X:8080

// ── Tipos ──────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'viewer';
  created_at: string;
}

export interface Vehicle {
  id: number;
  device_id: string;
  plate: string;
  name: string;
  created_at: string;
}

export interface SensorReading {
  id: number;
  vehicle_id: number;
  latitude: number;
  longitude: number;
  speed: number;
  fuel_level: number;
  fuel_capacity: number;
  consumption: number;
  temperature: number;
  recorded_at: string;
}

export interface Alert {
  id: number;
  vehicle_id: number;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  resolved: boolean;
  created_at: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ── Token Management (AsyncStorage) ────────────────────

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('fleet_token');
}

export async function getUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem('fleet_user');
  return raw ? JSON.parse(raw) : null;
}

export async function saveAuth(token: string, user: User): Promise<void> {
  await AsyncStorage.multiSet([
    ['fleet_token', token],
    ['fleet_user', JSON.stringify(user)],
  ]);
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove(['fleet_token', 'fleet_user']);
}

export async function isAdmin(): Promise<boolean> {
  const user = await getUser();
  return user?.role === 'admin';
}

// ── Fetch wrapper ──────────────────────────────────────

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    await clearAuth();
    throw new Error('NO_AUTH');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Endpoints ──────────────────────────────────────────

export async function login(username: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function getVehicles(): Promise<Vehicle[]> {
  return apiFetch<Vehicle[]>('/api/vehicles');
}

export async function getVehicleLatest(vehicleId: number): Promise<SensorReading> {
  return apiFetch<SensorReading>(`/api/vehicles/${vehicleId}/latest`);
}

export async function getVehicleHistory(vehicleId: number, limit = 50): Promise<SensorReading[]> {
  return apiFetch<SensorReading[]>(`/api/vehicles/${vehicleId}/history?limit=${limit}`);
}

export async function getAlerts(resolved = false): Promise<Alert[]> {
  return apiFetch<Alert[]>(`/api/alerts?resolved=${resolved}`);
}

export async function resolveAlert(alertId: number): Promise<void> {
  await apiFetch(`/api/alerts/${alertId}/resolve`, { method: 'PUT' });
}
