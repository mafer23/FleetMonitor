// ═══════════════════════════════════════════════════════
// Store — Estado global con Zustand
// Maneja auth, vehículos, lecturas y conectividad
// ═══════════════════════════════════════════════════════

import { create } from 'zustand';
import {
  User,
  Vehicle,
  SensorReading,
  Alert,
  getToken,
  getUser as fetchUser,
  getVehicles as fetchVehicles,
  getVehicleLatest,
  getVehicleHistory as fetchHistory,
  getAlerts as fetchAlerts,
  login as apiLogin,
  saveAuth,
  clearAuth as clearApiAuth,
} from './api';
import {
  cacheVehicles,
  getCachedVehicles,
  cacheReadings,
  getCachedReadings,
  cacheAlerts,
  getCachedAlerts,
  isOnline,
  setLastSync,
} from './offline';

interface VehiclePosition {
  vehicle: Vehicle;
  reading: SensorReading;
}

interface FleetStore {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Data
  positions: VehiclePosition[];
  selectedVehicleId: number | null;
  history: SensorReading[];
  alerts: Alert[];

  // Status
  online: boolean;
  loading: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadVehicles: () => Promise<void>;
  selectVehicle: (id: number | null) => Promise<void>;
  loadAlerts: () => Promise<void>;
  updateReading: (reading: SensorReading) => void;
  setOnline: (online: boolean) => void;
}

export const useFleetStore = create<FleetStore>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  positions: [],
  selectedVehicleId: null,
  history: [],
  alerts: [],
  online: true,
  loading: true,

  // Inicializar: verificar si hay sesión guardada
  initialize: async () => {
    try {
      const token = await getToken();
      const user = await fetchUser();
      if (token && user) {
        set({ token, user, isAuthenticated: true });
        await get().loadVehicles();
        if (user.role === 'admin') {
          await get().loadAlerts();
        }
      }
    } catch {
      // Sin sesión guardada
    } finally {
      set({ loading: false });
    }
  },

  // Login
  login: async (username, password) => {
    const res = await apiLogin(username, password);
    await saveAuth(res.token, res.user);
    set({ token: res.token, user: res.user, isAuthenticated: true });
    await get().loadVehicles();
    if (res.user.role === 'admin') {
      await get().loadAlerts();
    }
  },

  // Logout
  logout: async () => {
    await clearApiAuth();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      positions: [],
      history: [],
      alerts: [],
    });
  },

  // Cargar vehículos con sus últimas lecturas
  loadVehicles: async () => {
    set({ loading: true });
    try {
      const connected = await isOnline();
      set({ online: connected });

      if (connected) {
        const vehicles = await fetchVehicles();
        await cacheVehicles(vehicles);

        const positions = (
          await Promise.all(
            vehicles.map(async (v) => {
              try {
                const reading = await getVehicleLatest(v.id);
                return { vehicle: v, reading };
              } catch {
                return null;
              }
            })
          )
        ).filter(Boolean) as VehiclePosition[];

        set({ positions });
        await setLastSync();
      } else {
        // Modo offline
        const vehicles = await getCachedVehicles();
        const positions = (
          await Promise.all(
            vehicles.map(async (v) => {
              const readings = await getCachedReadings(v.id);
              const latest = readings.sort(
                (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
              )[0];
              return latest ? { vehicle: v, reading: latest } : null;
            })
          )
        ).filter(Boolean) as VehiclePosition[];

        set({ positions });
      }
    } catch (err) {
      console.error('Error cargando vehículos:', err);
    } finally {
      set({ loading: false });
    }
  },

  // Seleccionar vehículo y cargar historial
  selectVehicle: async (id) => {
    set({ selectedVehicleId: id, history: [] });
    if (!id) return;

    try {
      const connected = await isOnline();
      if (connected) {
        const data = await fetchHistory(id, 50);
        set({ history: data });
        await cacheReadings(id, data);
      } else {
        const cached = await getCachedReadings(id);
        set({ history: cached });
      }
    } catch (err) {
      console.error('Error cargando historial:', err);
    }
  },

  // Cargar alertas (solo admin)
  loadAlerts: async () => {
    try {
      const connected = await isOnline();
      if (connected) {
        const data = await fetchAlerts(false);
        set({ alerts: data });
        await cacheAlerts(data);
      } else {
        const cached = await getCachedAlerts();
        set({ alerts: cached });
      }
    } catch (err) {
      console.error('Error cargando alertas:', err);
    }
  },

  // Actualizar lectura desde WebSocket
  updateReading: (reading) => {
    set((state) => ({
      positions: state.positions.map((p) =>
        p.vehicle.id === reading.vehicle_id ? { ...p, reading } : p
      ),
      history:
        state.selectedVehicleId === reading.vehicle_id
          ? [reading, ...state.history].slice(0, 50)
          : state.history,
    }));
  },

  setOnline: (online) => set({ online }),
}));
