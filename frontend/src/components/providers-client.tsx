'use client';

import dynamic from 'next/dynamic';

// ssr: false prevents the WalletConnect/Reown SDK from running a server-side
// network fetch to api.web3modal.org on every request, which caused 13-34s
// page loads and DNS errors in environments without external network access.
// Must live in a Client Component — Next.js 15 forbids ssr: false in Server Components.
const Providers = dynamic(
  () => import('@/components/providers').then((m) => m.Providers),
  { ssr: false }
);

export function ProvidersClient({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
