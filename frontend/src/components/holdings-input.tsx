'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Wallet, RefreshCw } from 'lucide-react';
import { useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import type { Holding } from '@aegisos/shared';

interface HoldingsInputProps {
  holdings: Holding[];
  onChange: (holdings: Holding[]) => void;
  disabled?: boolean;
  walletAddress?: `0x${string}` | undefined;
}

export function HoldingsInput({ holdings, onChange, disabled, walletAddress }: HoldingsInputProps) {
  const [importing, setImporting] = useState(false);
  // symbol → live USD price, fetched once per unique symbol set
  const [prices, setPrices] = useState<Record<string, number>>({});
  const lastSymbolKey = useRef<string>('');
  const autoImportedFor = useRef<string | null>(null);
  const [walletChecked, setWalletChecked] = useState(false);

  const { data: balance } = useBalance({ address: walletAddress });

  // Fetch live prices whenever the set of symbols in the table changes.
  useEffect(() => {
    const symbols = [
      ...new Set(holdings.map((h) => h.symbol?.toUpperCase()).filter(Boolean)),
    ];
    const key = symbols.sort().join(',');
    if (!key || key === lastSymbolKey.current) return;
    lastSymbolKey.current = key;

    fetch(`/api/prices?symbols=${key}`)
      .then((r) => r.json())
      .then(({ prices: p }: { prices: Record<string, number> }) => {
        if (Object.keys(p).length > 0) {
          setPrices((prev) => ({ ...prev, ...p }));
        }
      })
      .catch(() => {});
  }, [holdings]);

  // Auto-import ETH balance when wallet first connects
  useEffect(() => {
    if (!walletAddress || disabled) return;
    if (autoImportedFor.current === walletAddress) return;

    // Mark that we've checked this wallet (even if balance is zero)
    if (balance !== undefined) {
      autoImportedFor.current = walletAddress;
      setWalletChecked(true);

      const amt = parseFloat(formatUnits(balance.value, balance.decimals));
      if (amt <= 0) return; // no ETH — show empty state, don't import

      const isEmpty = !holdings.some((h) => h.symbol?.trim() && (h.amount > 0 || (h.valueUsd ?? 0) > 0));
      if (!isEmpty) return;

      setImporting(true);
      fetch('/api/eth-price')
        .then((r) => r.json())
        .then(({ ethUsd }: { ethUsd: number }) => {
          const amount = parseFloat(formatUnits(balance.value, balance.decimals));
          const valueUsd = ethUsd > 0 ? parseFloat((amount * ethUsd).toFixed(2)) : 0;
          const symbol = balance.symbol || 'ETH';
          if (ethUsd > 0) setPrices((prev) => ({ ...prev, [symbol.toUpperCase()]: ethUsd }));
          const existing = holdings.find((h) => h.symbol?.toUpperCase() === symbol.toUpperCase());
          if (existing) {
            onChange(
              holdings.map((h) =>
                h.symbol?.toUpperCase() === symbol.toUpperCase()
                  ? { ...h, amount, valueUsd: valueUsd || h.valueUsd }
                  : h
              )
            );
          } else {
            onChange([
              ...holdings.filter((h) => h.symbol && (h.amount > 0 || (h.valueUsd ?? 0) > 0)),
              { symbol, amount, valueUsd },
            ]);
          }
        })
        .finally(() => setImporting(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, balance?.value, balance, disabled]);

  // Reset wallet check state when wallet disconnects
  useEffect(() => {
    if (!walletAddress) {
      setWalletChecked(false);
      autoImportedFor.current = null;
    }
  }, [walletAddress]);

  const importFromWallet = async () => {
    if (!walletAddress || !balance) return;
    setImporting(true);
    try {
      const res = await fetch('/api/eth-price');
      const { ethUsd } = (await res.json()) as { ethUsd: number };
      const amount = parseFloat(formatUnits(balance.value, balance.decimals));
      const valueUsd = ethUsd > 0 ? parseFloat((amount * ethUsd).toFixed(2)) : 0;
      const symbol = balance.symbol || 'ETH';
      if (ethUsd > 0) setPrices((prev) => ({ ...prev, [symbol.toUpperCase()]: ethUsd }));
      const existing = holdings.find((h) => h.symbol.toUpperCase() === symbol.toUpperCase());
      if (existing) {
        onChange(
          holdings.map((h) =>
            h.symbol.toUpperCase() === symbol.toUpperCase()
              ? { ...h, amount, valueUsd: valueUsd || h.valueUsd }
              : h
          )
        );
      } else {
        onChange([
          ...holdings.filter((h) => h.symbol && (h.amount > 0 || (h.valueUsd ?? 0) > 0)),
          { symbol, amount, valueUsd },
        ]);
      }
    } finally {
      setImporting(false);
    }
  };

  const addRow = () => {
    onChange([...holdings, { symbol: 'ETH', amount: 0, valueUsd: 0 }]);
  };

  const updateRow = (i: number, field: keyof Holding, value: string | number) => {
    const next = [...holdings];
    const row = next[i];
    if (!row) return;

    if (field === 'symbol') {
      next[i] = { ...row, symbol: String(value) };
    } else if (field === 'amount') {
      const amount = Number(value) || 0;
      const sym = row.symbol?.toUpperCase();
      const livePrice = sym ? prices[sym] : undefined;
      next[i] = livePrice != null
        ? { ...row, amount, valueUsd: parseFloat((amount * livePrice).toFixed(2)) }
        : { ...row, amount };
    } else if (field === 'valueUsd') {
      next[i] = { ...row, valueUsd: Number(value) || 0 };
    }
    onChange(next);
  };

  const removeRow = (i: number) => {
    onChange(holdings.filter((_, j) => j !== i));
  };

  const canImport =
    walletAddress && balance && parseFloat(formatUnits(balance.value, balance.decimals)) > 0 && !disabled;

  // Wallet is connected but has no ETH balance and we've checked
  const walletHasNoHoldings =
    walletAddress &&
    walletChecked &&
    balance !== undefined &&
    parseFloat(formatUnits(balance.value, balance.decimals)) <= 0 &&
    holdings.length === 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-400">Holdings</label>
        <div className="flex items-center gap-2">
          {canImport && (
            <button
              type="button"
              onClick={importFromWallet}
              disabled={importing}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${importing ? 'animate-spin' : ''}`} />
              {importing ? 'Importing...' : 'Refresh from wallet'}
            </button>
          )}
          {walletAddress && !canImport && !walletHasNoHoldings && (
            <button
              type="button"
              onClick={importFromWallet}
              disabled={importing || !balance}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors"
            >
              <Wallet className="h-4 w-4" />
              {importing ? 'Importing...' : 'Import from wallet'}
            </button>
          )}
          <button
            type="button"
            onClick={addRow}
            disabled={disabled}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add row
          </button>
        </div>
      </div>

      {/* Empty state: wallet connected but no holdings found */}
      {walletHasNoHoldings ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 px-4 py-6 text-center">
          <Wallet className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-400">This account has no holdings</p>
          <p className="text-xs text-zinc-600 mt-1">Add a holding manually or connect a wallet with a balance.</p>
          <button
            type="button"
            onClick={addRow}
            disabled={disabled}
            className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors mx-auto"
          >
            <Plus className="h-4 w-4" />
            Add manually
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-md border border-zinc-800 overflow-hidden bg-zinc-950">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="text-left px-3 py-2 font-medium text-zinc-500 text-xs">Symbol</th>
                  <th className="text-left px-3 py-2 font-medium text-zinc-500 text-xs">Amount</th>
                  <th className="text-left px-3 py-2 font-medium text-zinc-500 text-xs">
                    Value (USD)
                    {Object.keys(prices).length > 0 && (
                      <span className="ml-1 text-emerald-500 font-normal normal-case">· live</span>
                    )}
                  </th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {holdings.map((h, i) => {
                  const sym = h.symbol?.toUpperCase();
                  const hasLivePrice = sym ? sym in prices : false;
                  return (
                    <tr key={i} className="border-t border-zinc-800">
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={h.symbol}
                          onChange={(e) => updateRow(i, 'symbol', e.target.value)}
                          placeholder="ETH"
                          disabled={disabled}
                          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100 placeholder-zinc-500 text-xs outline-none focus:border-zinc-600"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          value={h.amount || ''}
                          onChange={(e) => updateRow(i, 'amount', e.target.value)}
                          placeholder="0"
                          disabled={disabled}
                          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100 placeholder-zinc-500 text-xs outline-none focus:border-zinc-600"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="relative">
                          {hasLivePrice && (
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-500 text-xs pointer-events-none select-none">
                              ~
                            </span>
                          )}
                          <input
                            type="number"
                            value={h.valueUsd ?? ''}
                            onChange={(e) => updateRow(i, 'valueUsd', e.target.value)}
                            placeholder="0"
                            disabled={disabled}
                            className={`w-full rounded border border-zinc-700 bg-zinc-900 py-1.5 text-zinc-100 placeholder-zinc-500 text-xs outline-none focus:border-zinc-600 ${
                              hasLivePrice ? 'pl-5 pr-2' : 'px-2'
                            }`}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          disabled={disabled}
                          className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/30 disabled:opacity-50 transition-colors"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {holdings.length === 0 && !walletHasNoHoldings && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-xs text-zinc-500">
                      {walletAddress ? 'Import from wallet or add a holding manually.' : 'Add at least one holding to start.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
