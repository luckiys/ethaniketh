'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

const WALLET_LABELS: Record<string, string> = {
  injected: 'Browser Wallet',
  walletConnect: 'WalletConnect',
  'coinbase wallet': 'Coinbase Wallet',
};

function getWalletLabel(connector: { name?: string; id?: string }): string {
  const key = (connector.name || connector.id || '').toLowerCase();
  return WALLET_LABELS[key] || connector.name || connector.id || 'Wallet';
}

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const [showWallets, setShowWallets] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowWallets(false);
    };
    if (showWallets) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showWallets]);

  const handleConnect = (connector: (typeof connectors)[0]) => {
    reset();
    connect({ connector });
    setShowWallets(false);
  };

  if (isConnected) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900/50">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-zinc-300 truncate max-w-[120px]" title={address}>
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
          {chain && <span className="text-xs text-zinc-500 hidden sm:inline">{chain.name}</span>}
        </div>
        <button
          onClick={() => disconnect()}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative flex flex-col gap-2">
      <button
        onClick={() => setShowWallets(!showWallets)}
        disabled={isPending}
        className="w-full px-4 py-2 rounded-md bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {showWallets && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-md border border-zinc-800 bg-zinc-900 p-2 shadow-xl z-50">
          <p className="px-2 py-1.5 text-xs font-medium text-zinc-500">Choose a wallet</p>
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => handleConnect(connector)}
              disabled={!connector.ready}
              className="w-full flex items-center gap-2 px-2 py-2 rounded text-left text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {getWalletLabel(connector)}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-red-400">{error.message}</p>
          <button onClick={() => reset()} className="text-xs text-zinc-500 hover:text-zinc-300 underline">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
