'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ExternalLink } from 'lucide-react';

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

const INSTALL_LINKS: Record<string, string> = {
  phantom: 'https://phantom.app/',
  metamask: 'https://metamask.io/download/',
  'coinbase wallet': 'https://www.coinbase.com/wallet/downloads',
};

function getWalletLabel(connector: { name?: string; id?: string }): string {
  const key = (connector.name || connector.id || '').toLowerCase();
  return WALLET_LABELS[key] || connector.name || connector.id || 'Wallet';
}

function getWalletIcon(connector: { name?: string; id?: string }): string {
  const key = (connector.name || connector.id || '').toLowerCase();
  return WALLET_ICONS[key] ?? '🔑';
}

function isWalletInstalled(connector: { name?: string; id?: string }): boolean {
  if (typeof window === 'undefined') return true;
  const key = (connector.name || connector.id || '').toLowerCase();
  if (key === 'phantom') return !!(window as Window & { phantom?: { ethereum?: unknown } }).phantom?.ethereum;
  if (key === 'metamask') return !!(window as Window & { ethereum?: { isMetaMask?: boolean } }).ethereum?.isMetaMask;
  if (key === 'walletconnect') return true;
  return true;
}

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors = [], isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const handleConnect = useCallback(
    (connector: (typeof connectors)[0]) => {
      reset();
      setConnectingId(connector.uid);
      connect({ connector });
    },
    [connect, reset]
  );

  useEffect(() => {
    if (isConnected) {
      setOpen(false);
      setConnectingId(null);
    }
  }, [isConnected]);

  useEffect(() => {
    if (!isPending) setConnectingId(null);
  }, [isPending]);

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
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          disabled={isPending}
          className="w-full px-4 py-2 rounded-md bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Connecting...' : 'Connect Wallet'}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl focus:outline-none"
          onPointerDownOutside={(e) => {
            if (isPending) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (isPending) e.preventDefault();
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold text-zinc-100">
              Connect wallet
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={isPending}
                className="rounded p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <p className="text-[0.9375rem] text-zinc-500 mb-5 leading-relaxed">
            Choose a wallet to connect. A popup will open—approve the connection in your wallet.
          </p>
          <div className="space-y-2">
            {connectors.map((connector) => {
              const label = getWalletLabel(connector);
              const installed = isWalletInstalled(connector);
              const installLink = INSTALL_LINKS[(connector.name || connector.id || '').toLowerCase()];
              const isConnecting = connectingId === connector.uid;
              return (
                <div key={connector.uid} className="flex flex-col gap-1">
                  <div className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg leading-none">{getWalletIcon(connector)}</span>
                      <span className="font-medium text-zinc-200">{label}</span>
                      {isConnecting && (
                        <span className="text-xs text-amber-400">Connecting…</span>
                      )}
                    </div>
                    {installed ? (
                      <button
                        type="button"
                        onClick={() => handleConnect(connector)}
                        disabled={isPending && !isConnecting}
                        className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Connect
                      </button>
                    ) : installLink ? (
                      <a
                        href={installLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                      >
                        Install
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                  {!installed && installLink && (
                    <p className="text-[0.75rem] text-zinc-500 px-4">
                      {label} not detected. Install it first, then refresh this page.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {error && (
            <div className="mt-5 p-4 rounded-xl border border-red-500/20 bg-red-950/20 flex items-start justify-between gap-3">
              <p className="text-[0.8125rem] text-red-300 flex-1">
                {error.message.toLowerCase().includes('reject')
                  ? 'Connection rejected. Try again and approve in your wallet.'
                  : error.message.length > 100
                  ? error.message.slice(0, 100) + '…'
                  : error.message}
              </p>
              <button
                onClick={() => reset()}
                className="text-[0.8125rem] text-zinc-400 hover:text-zinc-200 underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
