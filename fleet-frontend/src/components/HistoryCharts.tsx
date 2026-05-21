'use client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { SensorReading } from '@/lib/api';

interface HistoryChartsProps {
  readings: SensorReading[];
  vehicleName: string;
}

export default function HistoryCharts({ readings, vehicleName }: HistoryChartsProps) {
    const data = [...readings].reverse().map((r) => ({
    time: new Date(r.recorded_at).toLocaleTimeString('es', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    speed: r.speed,
    fuel: r.fuel_level,
    temp: r.temperature,
    autonomy:
      r.consumption > 0
        ? +((r.fuel_capacity * (r.fuel_level / 100)) / r.consumption).toFixed(1)
        : 0,
  }));

  const tooltipStyle = {
    contentStyle: {
      background: '#1a2332',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      fontSize: '12px',
      color: '#f1f5f9',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    },
    labelStyle: { color: '#94a3b8', marginBottom: 4 },
  };

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-white/[0.06] bg-fleet-800">
        <p className="text-sm text-slate-500">Sin datos históricos aún</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Velocidad */}
      <div className="rounded-xl border border-white/[0.06] bg-fleet-800 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Velocidad</h3>
            <p className="text-xs text-slate-500">{vehicleName} — últimas lecturas</p>
          </div>
          <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 font-mono text-xs text-cyan-400">
            km/h
          </span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            />
            <Tooltip {...tooltipStyle} />
            <Line
              type="monotone"
              dataKey="speed"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#22d3ee' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Combustible + autonomía */}
      <div className="rounded-xl border border-white/[0.06] bg-fleet-800 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Combustible</h3>
            <p className="text-xs text-slate-500">Nivel (%) y autonomía estimada (horas)</p>
          </div>
          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-xs text-amber-400">
            % / hrs
          </span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            />
            <Tooltip {...tooltipStyle} />
            <Area
              type="monotone"
              dataKey="fuel"
              stroke="#f59e0b"
              fill="rgba(245, 158, 11, 0.1)"
              strokeWidth={2}
              name="Combustible %"
            />
            <Line
              type="monotone"
              dataKey="autonomy"
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              name="Autonomía hrs"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
