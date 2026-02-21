'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import {
  mainnet,
  base,
  polygon,
  arbitrum,
  optimism,
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
  hederaTestnet,
} from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '';

function alchemyUrl(chain: string): string {
  return `https://${chain}.g.alchemy.com/v2/${alchemyKey}`;
}

function buildTransports() {
  const fallback = http();
  if (!alchemyKey) {
    return {
      [mainnet.id]: fallback,
      [base.id]: fallback,
      [polygon.id]: fallback,
      [arbitrum.id]: fallback,
      [optimism.id]: fallback,
      [sepolia.id]: fallback,
      [baseSepolia.id]: fallback,
      [arbitrumSepolia.id]: fallback,
      [optimismSepolia.id]: fallback,
      [polygonAmoy.id]: fallback,
      [hederaTestnet.id]: fallback,
    };
  }
  return {
    [mainnet.id]: http(alchemyUrl('eth-mainnet')),
    [base.id]: http(alchemyUrl('base-mainnet')),
    [polygon.id]: http(alchemyUrl('polygon-mainnet')),
    [arbitrum.id]: http(alchemyUrl('arb-mainnet')),
    [optimism.id]: http(alchemyUrl('opt-mainnet')),
    [sepolia.id]: http(alchemyUrl('eth-sepolia')),
    [baseSepolia.id]: http(alchemyUrl('base-sepolia')),
    [arbitrumSepolia.id]: http(alchemyUrl('arb-sepolia')),
    [optimismSepolia.id]: http(alchemyUrl('opt-sepolia')),
    [polygonAmoy.id]: http(alchemyUrl('polygon-amoy')),
    [hederaTestnet.id]: fallback, // Alchemy doesn't support Hedera
  };
}

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
  chains: [
    base,
    mainnet,
    polygon,
    arbitrum,
    optimism,
    sepolia,
    baseSepolia,
    arbitrumSepolia,
    optimismSepolia,
    polygonAmoy,
    hederaTestnet,
  ],
  connectors: buildConnectors(),
  transports: buildTransports(),
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
