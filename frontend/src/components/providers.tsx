'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, base, polygon, arbitrum, optimism } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// Get free project ID from https://cloud.walletconnect.com — demo works on localhost
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'b56e18d47c72ab683b10814fe9495694';

const config = createConfig({
  chains: [base, mainnet, polygon, arbitrum, optimism],
  connectors: [
    // Generic injected: covers MetaMask, Frame, Rainbow, and any EIP-1193 extension
    injected({ target: 'metaMask' }),
    // Phantom EVM: only shows when Phantom is installed — reads window.phantom.ethereum
    // which is Phantom's dedicated EVM provider (separate from window.ethereum)
    injected({
      target() {
        return {
          id: 'phantom',
          name: 'Phantom',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          provider:
            typeof window !== 'undefined'
              ? (window as any).phantom?.ethereum
              : undefined,
        };
      },
    }),
    walletConnect({ projectId }),
    coinbaseWallet({ appName: 'AegisOS' }),
  ],
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
