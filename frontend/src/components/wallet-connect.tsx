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
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-mono text-slate-300 truncate max-w-[140px]" title={address}>
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
          {chain && <span className="text-xs text-slate-500 hidden sm:inline">{chain.name}</span>}
        </div>
        <button
          onClick={() => disconnect()}
          className="px-3 py-1.5 text-sm rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
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
        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {showWallets && (
        <div className="absolute top-full right-0 mt-2 w-64 rounded-xl border border-white/10 bg-[#0f1624] p-2 shadow-xl z-50">
          <p className="px-3 py-2 text-xs text-slate-500 font-medium">Choose a wallet</p>
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => handleConnect(connector)}
              disabled={!connector.ready}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="font-medium">{getWalletLabel(connector)}</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-red-400/90">{error.message}</p>
          <button onClick={() => reset()} className="text-xs text-slate-500 hover:text-slate-400 underline">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
