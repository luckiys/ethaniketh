'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';

// ssr: false prevents the WalletConnect/Reown SDK from running a server-side
// network fetch to api.web3modal.org on every request, which caused 13-34s
// page loads and DNS errors in environments without external network access.
// Must live in a Client Component — Next.js 15 forbids ssr: false in Server Components.
const Providers = dynamic(
  () => import('@/components/providers').then((m) => m.Providers),
  { ssr: false }
);

/**
 * Suppress WalletConnect's benign empty-object console errors.
 * The @walletconnect/core logger sometimes emits `{}` which clutters the console
 * and triggers Next.js error overlay without actionable info.
 */
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
  return <Providers>{children}</Providers>;
}
