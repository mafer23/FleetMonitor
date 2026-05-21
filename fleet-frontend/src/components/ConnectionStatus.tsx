'use client';

// ═══════════════════════════════════════════════════════
// ConnectionStatus — Indicador de estado online/offline
// ═══════════════════════════════════════════════════════

interface ConnectionStatusProps {
  online: boolean;
  wsConnected: boolean;
}

export default function ConnectionStatus({ online, wsConnected }: ConnectionStatusProps) {
  if (online && wsConnected) return null; // Todo bien, no mostrar nada

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium shadow-lg backdrop-blur-sm ${
        !online
          ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
          : 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
      }`}
    >
      {!online ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0112 9c-1.74 0-3.41.46-4.88 1.28M5 12.55a10.94 10.94 0 00-3.07 2.21" />
            <path d="M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0" />
            <circle cx="12" cy="20" r="1" />
          </svg>
          Modo offline — datos desde caché
        </>
      ) : (
        <>
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
          Reconectando WebSocket...
        </>
      )}
    </div>
  );
}
