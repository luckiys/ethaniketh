import type { Metadata } from 'next';
import { Syne, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

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
    <html lang="en" className={`${syne.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen w-full font-sans antialiased bg-[#0a0e17] text-white overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
