// ═══════════════════════════════════════════════════════
// API CLIENT — Fetch wrapper con autenticación y offline
// ═══════════════════════════════════════════════════════

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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

// ── Token management ───────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fleet_token');
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('fleet_user');
  return raw ? JSON.parse(raw) : null;
}

export function saveAuth(token: string, user: User): void {
  localStorage.setItem('fleet_token', token);
  localStorage.setItem('fleet_user', JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem('fleet_token');
  localStorage.removeItem('fleet_user');
}

export function isAdmin(): boolean {
  const user = getUser();
  return user?.role === 'admin';
}

// ── Fetch wrapper ──────────────────────────────────────

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('No autorizado');
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

export async function getVehicleHistory(
  vehicleId: number,
  limit = 50
): Promise<SensorReading[]> {
  return apiFetch<SensorReading[]>(`/api/vehicles/${vehicleId}/history?limit=${limit}`);
}

export async function getAlerts(resolved = false): Promise<Alert[]> {
  return apiFetch<Alert[]>(`/api/alerts?resolved=${resolved}`);
}

export async function resolveAlert(alertId: number): Promise<void> {
  await apiFetch(`/api/alerts/${alertId}/resolve`, { method: 'PUT' });
}

export async function sendSensorData(data: {
  device_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  fuel_level: number;
  fuel_capacity: number;
  consumption: number;
  temperature: number;
}): Promise<SensorReading> {
  return apiFetch<SensorReading>('/api/sensors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
