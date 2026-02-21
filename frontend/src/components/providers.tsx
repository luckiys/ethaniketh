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
        if (typeof window === 'undefined') return undefined;
        const w = window as Window & { phantom?: { ethereum?: unknown }; ethereum?: { isPhantom?: boolean } };
        const phantomProvider = w.phantom?.ethereum;
        const ethereumIsPhantom = w.ethereum?.isPhantom ? w.ethereum : undefined;
        return {
          id: 'phantom',
          name: 'Phantom',
          provider: phantomProvider ?? ethereumIsPhantom ?? undefined,
        };
      },
      unstable_shimAsyncInject: 2_000,
    }),
    coinbaseWallet({ appName: 'AegisOS' }),
  ];
  // WalletConnect: scan QR to connect 200+ wallets (Ledger, Safe, Rainbow, Trust, etc.)
  if (projectId) {
    try {
      list.push(walletConnect({ projectId }) as never);
    } catch {
      // WalletConnect unavailable
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
