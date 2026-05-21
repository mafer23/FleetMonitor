// ═══════════════════════════════════════════════════════
// theme.ts — Tokens de diseño compartidos
// Misma paleta que el frontend web
// ═══════════════════════════════════════════════════════

export const colors = {
  bg: {
    primary: '#0a0e1a',
    card: '#111827',
    cardHover: '#1a2332',
    elevated: '#243044',
  },
  accent: '#22d3ee',
  accentDim: '#0e7490',
  text: {
    primary: '#f1f5f9',
    secondary: '#94a3b8',
    muted: '#64748b',
  },
  border: '#1e293b',
  borderLight: 'rgba(255,255,255,0.06)',
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },
  fuel: {
    high: '#10b981',
    medium: '#f59e0b',
    low: '#ef4444',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const fonts = {
  regular: { fontSize: 14, color: colors.text.primary },
  small: { fontSize: 12, color: colors.text.secondary },
  caption: { fontSize: 10, color: colors.text.muted, textTransform: 'uppercase' as const, letterSpacing: 0.8 },
  heading: { fontSize: 18, fontWeight: '600' as const, color: colors.text.primary },
  mono: { fontFamily: 'monospace', fontSize: 11, color: colors.text.muted },
};

export function fuelColor(level: number): string {
  if (level < 15) return colors.fuel.low;
  if (level < 40) return colors.fuel.medium;
  return colors.fuel.high;
}
