'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, base, polygon, arbitrum, optimism } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// Get free project ID from https://cloud.walletconnect.com — demo works on localhost
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'b56e18d47c72ab683b10814fe9495694';

const config = createConfig({
  chains: [base, mainnet, polygon, arbitrum, optimism],
  connectors: [
    injected({ unstable_shimAsyncInject: 5000 }), // MetaMask, Brave, Trust, etc.
    walletConnect({ projectId }), // 300+ mobile & desktop wallets via QR
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

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
