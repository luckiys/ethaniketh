'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Wallet } from 'lucide-react';
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
  const autoImportedFor = useRef<string | null>(null);

  const { data: balance } = useBalance({
    address: walletAddress,
  });

  useEffect(() => {
    if (!walletAddress || !balance || disabled) return;
    const amt = parseFloat(formatUnits(balance.value, balance.decimals));
    if (amt <= 0) return;
    if (autoImportedFor.current === walletAddress) return;
    const isEmpty = !holdings.some((h) => h.symbol?.trim() && (h.amount > 0 || (h.valueUsd ?? 0) > 0));
    if (!isEmpty) return;
    autoImportedFor.current = walletAddress;
    setImporting(true);
    fetch('/api/eth-price')
      .then((r) => r.json())
      .then(({ ethUsd }: { ethUsd: number }) => {
        const amount = parseFloat(formatUnits(balance.value, balance.decimals));
        const valueUsd = ethUsd > 0 ? amount * ethUsd : 0;
        const symbol = balance.symbol || 'ETH';
        const existing = holdings.find((h) => h.symbol?.toUpperCase() === symbol?.toUpperCase());
        if (existing) {
          onChange(
            holdings.map((h) =>
              h.symbol?.toUpperCase() === symbol?.toUpperCase() ? { ...h, amount, valueUsd: valueUsd || h.valueUsd } : h
            )
          );
        } else {
          onChange([...holdings.filter((h) => h.symbol && (h.amount > 0 || (h.valueUsd ?? 0) > 0)), { symbol, amount, valueUsd }]);
        }
      })
      .finally(() => setImporting(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only run when wallet/balance available
  }, [walletAddress, balance?.value, disabled]);

  const importFromWallet = async () => {
    if (!walletAddress || !balance) return;
    setImporting(true);
    try {
      const res = await fetch('/api/eth-price');
      const { ethUsd } = (await res.json()) as { ethUsd: number };
      const amount = parseFloat(formatUnits(balance.value, balance.decimals));
      const valueUsd = ethUsd > 0 ? amount * ethUsd : 0;
      const symbol = balance.symbol || 'ETH';
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
        onChange([...holdings.filter((h) => h.symbol && (h.amount > 0 || (h.valueUsd ?? 0) > 0)), { symbol, amount, valueUsd }]);
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
    if (field === 'symbol') next[i] = { ...next[i], symbol: String(value) };
    else if (field === 'amount') next[i] = { ...next[i], amount: Number(value) || 0 };
    else if (field === 'valueUsd') next[i] = { ...next[i], valueUsd: Number(value) || 0 };
    onChange(next);
  };

  const removeRow = (i: number) => {
    onChange(holdings.filter((_, j) => j !== i));
  };

  const canImport = walletAddress && balance && parseFloat(formatUnits(balance.value, balance.decimals)) > 0 && !disabled;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-neutral-600">Holdings</label>
        <div className="flex items-center gap-2">
          {canImport && (
            <button
              type="button"
              onClick={importFromWallet}
              disabled={importing}
              className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
            >
              <Wallet className="h-4 w-4" />
              {importing ? 'Importing...' : 'Import from wallet'}
            </button>
          )}
          <button
            type="button"
            onClick={addRow}
            disabled={disabled}
            className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add row
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/80">
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Symbol</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Amount</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Value (USD)</th>
              <th className="w-12 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {holdings.map((h, i) => (
              <tr key={i} className="border-t border-neutral-100">
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={h.symbol}
                    onChange={(e) => updateRow(i, 'symbol', e.target.value)}
                    placeholder="ETH"
                    disabled={disabled}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={h.amount || ''}
                    onChange={(e) => updateRow(i, 'amount', e.target.value)}
                    placeholder="0"
                    disabled={disabled}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={h.valueUsd ?? ''}
                    onChange={(e) => updateRow(i, 'valueUsd', e.target.value)}
                    placeholder="0"
                    disabled={disabled}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={disabled}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {holdings.length === 0 && (
        <p className="text-sm text-neutral-500">
          {walletAddress ? 'Import from wallet or add a holding manually.' : 'Add at least one holding to start.'}
        </p>
      )}
    </div>
  );
}
