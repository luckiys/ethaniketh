'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, base } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

const config = createConfig({
  chains: [base, mainnet],
  connectors: [
    injected({
      unstable_shimAsyncInject: 5000,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
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
