'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  getToken,
  getUser,
  clearAuth,
  isAdmin,
  getVehicles,
  getVehicleLatest,
  getVehicleHistory,
  getAlerts,
  Vehicle,
  SensorReading,
  Alert,
} from '@/lib/api';
import {
  cacheVehicles,
  getCachedVehicles,
  cacheReadings,
  getCachedReadings,
  cacheAlerts,
  getCachedAlerts,
  isOnline,
  onConnectionChange,
} from '@/lib/offline';
import { useWebSocket } from '@/hooks/useWebSocket';
import VehicleCards from '@/components/VehicleCards';
import HistoryCharts from '@/components/HistoryCharts';
import AlertsPanel from '@/components/AlertsPanel';
import ConnectionStatus from '@/components/ConnectionStatus';

// Carga dinámica del mapa (solo cliente, no SSR)
const FleetMap = dynamic(() => import('@/components/FleetMap'), { ssr: false });

interface VehiclePosition {
  vehicle: Vehicle;
  reading: SensorReading;
}

export default function DashboardPage() {
  const router = useRouter();
  const [positions, setPositions] = useState<VehiclePosition[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  const user = getUser();
  const admin = isAdmin();

  // ── WebSocket: recibir actualizaciones en tiempo real ──
  const handleWSMessage = useCallback(
    (msg: { type: string; data: unknown }) => {
      if (msg.type === 'sensor_update') {
        const reading = msg.data as SensorReading;
        setPositions((prev) =>
          prev.map((p) =>
            p.vehicle.id === reading.vehicle_id
              ? { ...p, reading }
              : p
          )
        );
        // Actualizar historial si es el vehículo seleccionado
        if (reading.vehicle_id === selectedVehicle) {
          setHistory((prev) => [reading, ...prev].slice(0, 50));
        }
      }
      if (msg.type === 'alert' && admin) {
        loadAlerts();
      }
    },
    [selectedVehicle, admin]
  );

  const { connected: wsConnected } = useWebSocket(handleWSMessage);

  // ── Cargar datos iniciales (online o caché) ───────────
  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        if (isOnline()) {
          // Online: fetch API y guardar en caché
          const vehicles = await getVehicles();
          await cacheVehicles(vehicles);

          const positionsData = await Promise.all(
            vehicles.map(async (v) => {
              try {
                const reading = await getVehicleLatest(v.id);
                return { vehicle: v, reading };
              } catch {
                return null;
              }
            })
          );

          setPositions(positionsData.filter(Boolean) as VehiclePosition[]);

          if (admin) {
            await loadAlerts();
          }
        } else {
          // Offline: cargar desde IndexedDB
          const cachedVehicles = await getCachedVehicles();
          const cachedReadings = await Promise.all(
            cachedVehicles.map(async (v) => {
              const readings = await getCachedReadings(v.id);
              const latest = readings.sort(
                (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
              )[0];
              return latest ? { vehicle: v, reading: latest } : null;
            })
          );
          setPositions(cachedReadings.filter(Boolean) as VehiclePosition[]);

          if (admin) {
            setAlerts(await getCachedAlerts());
          }
        }
      } catch (err) {
        console.error('Error cargando datos:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Escuchar cambios de conexión
    const cleanup = onConnectionChange((isOn) => {
      setOnline(isOn);
      if (isOn) loadData(); // Re-fetch al volver online
    });
    return cleanup;
  }, [router, admin]);

  // ── Cargar historial cuando se selecciona un vehículo ──
  useEffect(() => {
    if (!selectedVehicle) {
      setHistory([]);
      return;
    }

    const loadHistory = async () => {
      try {
        if (isOnline()) {
          const data = await getVehicleHistory(selectedVehicle, 50);
          setHistory(data);
          await cacheReadings(data);
        } else {
          const cached = await getCachedReadings(selectedVehicle);
          setHistory(cached);
        }
      } catch (err) {
        console.error('Error cargando historial:', err);
      }
    };

    loadHistory();
  }, [selectedVehicle]);

  // ── Cargar alertas (solo admin) ────────────────────────
  const loadAlerts = async () => {
    try {
      const data = await getAlerts(false);
      setAlerts(data);
      await cacheAlerts(data);
    } catch (err) {
      console.error('Error cargando alertas:', err);
    }
  };

  // ── Logout ─────────────────────────────────────────────
  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  const selectedVehicleName =
    positions.find((p) => p.vehicle.id === selectedVehicle)?.vehicle.name || '';

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-fleet-accent border-t-transparent" />
          <p className="mt-4 text-sm text-slate-500">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fleet-900">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-fleet-900/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fleet-accent/10">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-fleet-accent">
                <path d="M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM19 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
                <path d="M13 6h5l3 5v6h-2M5 17H3v-6l3-5h4M5 9h4m0-3v9" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight">Fleet Monitor</span>
            {admin && (
              <span className="rounded-md bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-300">
                Admin
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {!online && (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                Offline
              </span>
            )}
            <span className="text-xs text-slate-500">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-red-500/30 hover:text-red-400"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Mapa */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Ubicación en vivo
          </h2>
          <FleetMap positions={positions} />
        </section>

        {/* Tarjetas de vehículos */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Flota ({positions.length} vehículos)
          </h2>
          <VehicleCards
            positions={positions}
            selectedId={selectedVehicle}
            onSelect={setSelectedVehicle}
          />
        </section>

        {/* Gráficos históricos (cuando se selecciona un vehículo) */}
        {selectedVehicle && (
          <section className="animate-fade-in">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Historial — {selectedVehicleName}
            </h2>
            <HistoryCharts readings={history} vehicleName={selectedVehicleName} />
          </section>
        )}

        {/* Alertas predictivas (solo admin) */}
        {admin && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Alertas predictivas
              </h2>
              {alerts.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {alerts.length}
                </span>
              )}
            </div>
            <AlertsPanel alerts={alerts} onAlertResolved={loadAlerts} />
          </section>
        )}
      </main>

      {/* Status bar */}
      <ConnectionStatus online={online} wsConnected={wsConnected} />
    </div>
  );
}
