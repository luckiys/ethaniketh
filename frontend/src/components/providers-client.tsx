'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ThemeProvider } from '@/components/theme-provider';

const Providers = dynamic(
  () => import('@/components/providers').then((m) => m.Providers),
  { ssr: false }
);

function useSuppressWalletConnectNoise() {
  useEffect(() => {
    const original = console.error;
    console.error = (...args: unknown[]) => {
      const first = args[0];
      const isEmptyObject =
        args.length >= 1 &&
        typeof first === 'object' &&
        first !== null &&
        !Array.isArray(first) &&
        Object.keys(first).length === 0;
      if (isEmptyObject) return;
      original.apply(console, args);
    };
    return () => {
      console.error = original;
    };
  }, []);
}

export function ProvidersClient({ children }: { children: React.ReactNode }) {
  useSuppressWalletConnectNoise();
  return (
    <ThemeProvider>
      <Providers>{children}</Providers>
    </ThemeProvider>
  );
}
