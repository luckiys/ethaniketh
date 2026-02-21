import type { Metadata } from 'next';
import { ProvidersClient } from '@/components/providers-client';
import './globals.css';

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
        <ProvidersClient>{children}</ProvidersClient>
      </body>
    </html>
  );
}
