'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    router.replace(token ? '/dashboard' : '/login');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-fleet-accent border-t-transparent" />
    </div>
  );
}
