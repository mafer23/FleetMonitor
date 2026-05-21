'use client';

// ═══════════════════════════════════════════════════════
// AlertsPanel — Panel de alertas predictivas (solo admin)
// ═══════════════════════════════════════════════════════

import { Alert, resolveAlert } from '@/lib/api';
import { useState } from 'react';

interface AlertsPanelProps {
  alerts: Alert[];
  onAlertResolved: () => void;
}

export default function AlertsPanel({ alerts, onAlertResolved }: AlertsPanelProps) {
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const handleResolve = async (id: number) => {
    setResolvingId(id);
    try {
      await resolveAlert(id);
      onAlertResolved();
    } catch (err) {
      console.error('Error resolviendo alerta:', err);
    } finally {
      setResolvingId(null);
    }
  };

  const iconMap: Record<string, string> = {
    low_fuel: '⛽',
    high_temp: '🌡️',
    speeding: '💨',
  };

  if (alerts.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-white/[0.06] bg-fleet-800">
        <p className="text-sm text-slate-500">Sin alertas activas</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div
          key={alert.id}
          className="animate-slide-up rounded-xl border border-white/[0.06] bg-fleet-800 p-4 transition-colors hover:bg-fleet-700"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg">{iconMap[alert.type] || '⚠️'}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`alert-badge ${alert.severity}`}>
                    {alert.severity}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(alert.created_at).toLocaleString('es')}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                  {alert.message}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleResolve(alert.id)}
              disabled={resolvingId === alert.id}
              className="shrink-0 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:border-green-500/30 hover:bg-green-500/10 hover:text-green-400 disabled:opacity-40"
            >
              {resolvingId === alert.id ? '...' : 'Resolver'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
