'use client';

import { Plus } from 'lucide-react';
import type { Holding } from '@aegisos/shared';

interface HoldingsInputProps {
  holdings: Holding[];
  onChange: (holdings: Holding[]) => void;
  disabled?: boolean;
}

export function HoldingsInput({ holdings, onChange, disabled }: HoldingsInputProps) {
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-400">Holdings</label>
        <button
          type="button"
          onClick={addRow}
          disabled={disabled}
          className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add row
        </button>
      </div>
      <div className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 font-medium text-slate-500">Symbol</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Amount</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Value (USD)</th>
              <th className="w-12 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {holdings.map((h, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={h.symbol}
                    onChange={(e) => updateRow(i, 'symbol', e.target.value)}
                    placeholder="ETH"
                    disabled={disabled}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-colors"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={h.amount || ''}
                    onChange={(e) => updateRow(i, 'amount', e.target.value)}
                    placeholder="0"
                    disabled={disabled}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-colors"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={h.valueUsd ?? ''}
                    onChange={(e) => updateRow(i, 'valueUsd', e.target.value)}
                    placeholder="0"
                    disabled={disabled}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-colors"
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={disabled}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
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
        <p className="text-sm text-slate-500">Add at least one holding to start.</p>
      )}
    </div>
  );
}
