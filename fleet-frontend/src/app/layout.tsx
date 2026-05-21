import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fleet Monitor — Simon Movilidad',
  description: 'Sistema de monitoreo IoT para flotas vehiculares',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-fleet-900 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
