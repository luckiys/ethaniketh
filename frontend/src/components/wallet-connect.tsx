'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

const WALLET_LABELS: Record<string, string> = {
  metamask: 'MetaMask',
  phantom: 'Phantom',
  injected: 'Browser Wallet',
  walletconnect: 'WalletConnect',
  'coinbase wallet': 'Coinbase Wallet',
};

const WALLET_ICONS: Record<string, string> = {
  metamask: '🦊',
  phantom: '👻',
  walletconnect: '🔗',
  'coinbase wallet': '💙',
  injected: '🌐',
};

function getWalletLabel(connector: { name?: string; id?: string }): string {
  const key = (connector.name || connector.id || '').toLowerCase();
  return WALLET_LABELS[key] || connector.name || connector.id || 'Wallet';
}

function getWalletIcon(connector: { name?: string; id?: string }): string {
  const key = (connector.name || connector.id || '').toLowerCase();
  return WALLET_ICONS[key] ?? '🔑';
}

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors = [], isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const [showWallets, setShowWallets] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleConnect = useCallback(
    (connector: (typeof connectors)[0]) => {
      try {
        reset();
        connect({ connector });
        setShowWallets(false);
      } catch (err) {
        console.error('Wallet connect error:', err);
        setShowWallets(false);
      }
    },
    [connect, reset]
  );

  useEffect(() => {
    if (!showWallets) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setShowWallets(false);
    };
    const id = setTimeout(() => document.addEventListener('click', handleClickOutside), 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showWallets]);

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
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowWallets((v) => !v);
        }}
        disabled={isPending}
        className="w-full px-4 py-2 rounded-md bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {showWallets && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 mb-2 w-full min-w-[180px] rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-2xl z-50"
        >
          <p className="px-2 py-1.5 text-xs font-medium text-zinc-500">Choose a wallet</p>
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              onClick={() => handleConnect(connector)}
              disabled={isPending}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-left text-sm text-zinc-200 hover:bg-zinc-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="text-base leading-none">{getWalletIcon(connector)}</span>
              {getWalletLabel(connector)}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2">
          <p className="text-xs text-red-400 leading-relaxed flex-1">
            {error.message.toLowerCase().includes('reject')
              ? 'Connection rejected.'
              : error.message.length > 80
              ? error.message.slice(0, 80) + '…'
              : error.message}
          </p>
          <button onClick={() => reset()} className="text-xs text-zinc-500 hover:text-zinc-300 underline shrink-0">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
