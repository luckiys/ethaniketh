'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, base, polygon, arbitrum, optimism } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

function buildConnectors() {
  const list = [
    injected({ target: 'metaMask' }),
    injected({
      target() {
        return {
          id: 'phantom',
          name: 'Phantom',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          provider: typeof window !== 'undefined' ? (window as any).phantom?.ethereum : undefined,
        };
      },
    }),
    coinbaseWallet({ appName: 'AegisOS' }),
  ];
  // WalletConnect requires a valid project ID and network access to Reown relay.
  // Wrap in try-catch so a bad/missing project ID never crashes the whole config.
  if (projectId) {
    try {
      list.push(walletConnect({ projectId }) as never);
    } catch {
      // WalletConnect unavailable — injected wallets still work
    }
  }
  return list;
}

const config = createConfig({
  chains: [base, mainnet, polygon, arbitrum, optimism],
  connectors: buildConnectors(),
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
