'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

const METAMASK_URL = 'https://metamask.io/download/';

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const [hasProvider, setHasProvider] = useState(false);

  useEffect(() => {
    setHasProvider(typeof window !== 'undefined' && !!(window as unknown as { ethereum?: unknown }).ethereum);
  }, []);

  const injectedConnector = connectors.find((c) => c.id === 'injected') ?? connectors[0];
  const isProviderError = error?.message?.toLowerCase().includes('provider not found') ?? false;

  const handleConnect = () => {
    if (injectedConnector) {
      reset();
      connect({ connector: injectedConnector });
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-3">
        {isConnected ? (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-mono text-slate-300 truncate max-w-[140px]" title={address}>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              {chain && (
                <span className="text-xs text-slate-500 hidden sm:inline">{chain.name}</span>
              )}
            </div>
            <button
              onClick={() => disconnect()}
              className="px-3 py-1.5 text-sm rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
            >
              Disconnect
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleConnect}
              disabled={isPending || !injectedConnector}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20"
            >
              {isPending ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </>
        )}
      </div>
      {!hasProvider && !isConnected && (
        <a
          href={METAMASK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-400/90 hover:text-cyan-300 transition-colors flex items-center gap-1"
        >
          Install MetaMask to connect →
        </a>
      )}
      {isProviderError && (
        <a
          href={METAMASK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-amber-400/90 hover:text-amber-300 transition-colors flex items-center gap-1"
        >
          No wallet detected. Install MetaMask →
        </a>
      )}
      {error && !isProviderError && (
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
