import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './globals.css';

// ssr: false prevents the WalletConnect/Reown SDK from running a server-side
// network fetch to api.web3modal.org on every request, which caused 13-34s
// page loads and DNS errors in environments without external network access.
const Providers = dynamic(
  () => import('@/components/providers').then((m) => m.Providers),
  { ssr: false }
);

export const metadata: Metadata = {
  title: 'AegisOS — AI automation OS for DeFi safety + yield',
  description: 'AI advises, humans decide, blockchain verifies.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen w-full antialiased overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
