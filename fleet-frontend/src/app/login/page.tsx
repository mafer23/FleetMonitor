'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, saveAuth } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(username, password);
      saveAuth(res.token, res.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {/* Background grid effect */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Glow behind card */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-fleet-accent/20 via-transparent to-cyan-500/10 blur-xl" />

        <div className="card-glow relative rounded-2xl border border-white/[0.06] bg-fleet-800 p-8 shadow-2xl">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-fleet-accent/10 ring-1 ring-fleet-accent/20">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-fleet-accent">
                <path d="M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM19 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
                <path d="M13 6h5l3 5v6h-2M5 17H3v-6l3-5h4" />
                <path d="M5 9h4m0-3v9" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Fleet Monitor</h1>
            <p className="mt-1 text-sm text-slate-400">Simon Movilidad — IoT Dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="w-full rounded-lg border border-white/[0.08] bg-fleet-900/60 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-fleet-accent/40 focus:ring-1 focus:ring-fleet-accent/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-white/[0.08] bg-fleet-900/60 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-fleet-accent/40 focus:ring-1 focus:ring-fleet-accent/20"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-fleet-accent px-4 py-3 text-sm font-semibold text-fleet-900 transition-all hover:bg-cyan-300 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-fleet-900 border-t-transparent" />
                  Ingresando...
                </span>
              ) : (
                'Ingresar al sistema'
              )}
            </button>
          </form>

          {/* Dev hint */}
          <p className="mt-6 text-center text-xs text-slate-500">
            Demo: <span className="font-mono text-slate-400">admin</span> / <span className="font-mono text-slate-400">password123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
