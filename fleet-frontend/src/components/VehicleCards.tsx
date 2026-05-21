'use client';

// ═══════════════════════════════════════════════════════
// VehicleCards — Tarjetas resumen de vehículos
// ═══════════════════════════════════════════════════════

import { Vehicle, SensorReading } from '@/lib/api';

interface VehiclePosition {
  vehicle: Vehicle;
  reading: SensorReading;
}

interface VehicleCardsProps {
  positions: VehiclePosition[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function VehicleCards({ positions, selectedId, onSelect }: VehicleCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {positions.map(({ vehicle, reading }, i) => {
        const autonomy =
          reading.consumption > 0
            ? (reading.fuel_capacity * (reading.fuel_level / 100)) / reading.consumption
            : 999;
        const isLow = autonomy < 1;
        const isSelected = selectedId === vehicle.id;

        return (
          <button
            key={vehicle.id}
            onClick={() => onSelect(vehicle.id)}
            className={`card-glow animate-slide-up rounded-xl border p-4 text-left transition-all ${
              isSelected
                ? 'border-fleet-accent/30 bg-fleet-accent/[0.06]'
                : 'border-white/[0.06] bg-fleet-800 hover:border-white/[0.1] hover:bg-fleet-700'
            }`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">{vehicle.name}</span>
              <div className="flex items-center gap-1.5">
                <div className="status-live" />
                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                  en línea
                </span>
              </div>
            </div>

            <div className="mb-3 font-mono text-xs text-slate-500">{vehicle.device_id}</div>

            <div className="grid grid-cols-3 gap-2">
              {/* Velocidad */}
              <div className="rounded-lg bg-fleet-900/60 px-2 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Vel</div>
                <div className="mt-0.5 font-mono text-sm font-semibold text-cyan-400">
                  {reading.speed.toFixed(0)}
                </div>
                <div className="text-[10px] text-slate-500">km/h</div>
              </div>

              {/* Combustible */}
              <div className="rounded-lg bg-fleet-900/60 px-2 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Fuel</div>
                <div
                  className={`mt-0.5 font-mono text-sm font-semibold ${
                    reading.fuel_level < 15
                      ? 'text-red-400'
                      : reading.fuel_level < 40
                        ? 'text-amber-400'
                        : 'text-green-400'
                  }`}
                >
                  {reading.fuel_level.toFixed(0)}%
                </div>
                <div className="text-[10px] text-slate-500">nivel</div>
              </div>

              {/* Temperatura */}
              <div className="rounded-lg bg-fleet-900/60 px-2 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Temp</div>
                <div
                  className={`mt-0.5 font-mono text-sm font-semibold ${
                    reading.temperature > 90 ? 'text-red-400' : 'text-slate-200'
                  }`}
                >
                  {reading.temperature.toFixed(0)}°
                </div>
                <div className="text-[10px] text-slate-500">°C</div>
              </div>
            </div>

            {/* Alerta de autonomía */}
            {isLow && (
              <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5">
                <span className="text-xs">⚠️</span>
                <span className="text-xs font-medium text-red-300">
                  Autonomía: {autonomy.toFixed(1)}h — Combustible bajo
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
