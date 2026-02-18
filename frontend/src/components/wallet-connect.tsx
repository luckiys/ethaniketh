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
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-sm font-medium text-neutral-700 truncate max-w-[140px]" title={address}>
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
          {chain && <span className="text-xs text-neutral-500 hidden sm:inline">{chain.name}</span>}
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative flex flex-col items-end gap-2">
      <button
        onClick={() => setShowWallets(!showWallets)}
        disabled={isPending}
        className="px-6 py-2.5 rounded-full bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {showWallets && (
        <div className="absolute top-full right-0 mt-2 w-64 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl z-50">
          <p className="px-3 py-2 text-xs font-medium text-neutral-500">Choose a wallet</p>
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => handleConnect(connector)}
              disabled={!connector.ready}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {getWalletLabel(connector)}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-red-600">{error.message}</p>
          <button onClick={() => reset()} className="text-xs text-neutral-500 hover:text-neutral-700 underline">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
