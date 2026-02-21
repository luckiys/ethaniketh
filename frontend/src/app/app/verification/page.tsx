'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ShieldCheck, ArrowRight, ExternalLink, Clock, CheckCircle, Wallet, FileCheck } from 'lucide-react';

interface VerificationRecord {
  id: string;
  timestamp: string;
  goal: string;
  recommendation: string;
  riskScore: number;
  hcsTxId?: string;
  htsTxId?: string;
  signerAddress?: string;
}

function RecommendationBadge({ rec }: { rec: string }) {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    HOLD: { bg: 'bg-zinc-800/80', text: 'text-zinc-300', border: 'border-zinc-700/50' },
    REBALANCE: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
    REDUCE_RISK: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
    INCREASE_EXPOSURE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  };
  const c = config[rec] ?? config.HOLD;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[0.6875rem] font-semibold uppercase tracking-[0.06em] border ${c.bg} ${c.text} ${c.border}`}>
      {rec.replace(/_/g, ' ')}
    </span>
  );
}

function TxLink({ id, label }: { id: string; label: string }) {
  const isMock = id.startsWith('mock-');
  return (
    <div className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0 border-b border-zinc-800/80 last:border-0">
      <span className="text-[0.6875rem] font-medium text-zinc-500 uppercase tracking-wider shrink-0 w-10">
        {label}
      </span>
      {isMock ? (
        <span className="text-[0.8125rem] font-mono text-zinc-500 break-all">{id} (simulated)</span>
      ) : (
        <a
          href={`https://hashscan.io/testnet/transaction/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 text-[0.8125rem] font-mono text-blue-400 hover:text-blue-300 break-all"
        >
          <span className="truncate max-w-[200px] sm:max-w-[280px]">{id}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
        </a>
      )}
    </div>
  );
}

function getStorageKey(address: string | undefined) {
  return address ? `aegisos-verifications-${address.toLowerCase()}` : null;
}

export default function VerificationPage() {
  const { address } = useAccount();
  const [records, setRecords] = useState<VerificationRecord[]>([]);

  const loadRecords = useCallback(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const key = getStorageKey(address);
      const fallbackKey = 'aegisos-verifications';
      const keysToRead = key ? [key, fallbackKey] : [fallbackKey];
      const seen = new Set<string>();
      const merged: VerificationRecord[] = [];
      for (const k of keysToRead) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const arr = JSON.parse(raw) as VerificationRecord[];
        for (const r of arr) {
          if (!seen.has(r.id)) {
            seen.add(r.id);
            merged.push(r);
          }
        }
      }
      merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecords(merged.slice(0, 20));
    } catch {
      setRecords([]);
    }
  }, [address]);

  useEffect(() => {
    loadRecords();
    const onSaved = () => loadRecords();
    window.addEventListener('aegisos-verification-saved', onSaved);
    window.addEventListener('storage', onSaved);
    return () => {
      window.removeEventListener('aegisos-verification-saved', onSaved);
      window.removeEventListener('storage', onSaved);
    };
  }, [loadRecords]);

  const clearHistory = () => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const key = getStorageKey(address);
    if (key) localStorage.removeItem(key);
    localStorage.removeItem('aegisos-verifications');
    setRecords([]);
  };

  return (
    <div className="px-8 lg:px-16 py-10 lg:py-14 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[2rem] lg:text-[2.25rem] font-semibold text-zinc-50 tracking-[-0.02em] leading-tight">
            Verification
          </h1>
          <p className="mt-2 text-[0.9375rem] text-zinc-500 leading-relaxed max-w-lg">
            Your approval history, tied to your wallet. Every approved execution is logged to Hedera HCS.
          </p>
          {records.length > 0 && (
            <p className="mt-3 text-[0.8125rem] text-zinc-600">
              {records.length} {records.length === 1 ? 'record' : 'records'} · On-chain audit trail
            </p>
          )}
        </div>
        {records.length > 0 && (
          <button
            onClick={clearHistory}
            className="shrink-0 text-[0.8125rem] text-zinc-500 hover:text-zinc-300 transition-colors py-1"
          >
            Clear history
          </button>
        )}
      </div>

      {!address ? (
        <div className="mt-12 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/80 border border-zinc-700/50">
              <Wallet className="h-8 w-8 text-zinc-500" />
            </div>
          </div>
          <h2 className="mt-6 font-semibold text-zinc-200 text-xl">Connect your wallet</h2>
          <p className="mt-3 text-[0.9375rem] text-zinc-500 max-w-sm mx-auto leading-relaxed">
            Your verification history is tied to your wallet. Connect to see your approved transactions.
          </p>
          <p className="mt-5 text-[0.8125rem] text-zinc-600">
            Use the wallet button in the sidebar to connect.
          </p>
        </div>
      ) : records.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/80 border border-zinc-700/50">
              <ShieldCheck className="h-8 w-8 text-zinc-500" />
            </div>
          </div>
          <h2 className="mt-6 font-semibold text-zinc-200 text-xl">No verifications yet</h2>
          <p className="mt-3 text-[0.9375rem] text-zinc-500 max-w-sm mx-auto leading-relaxed">
            Complete a run and approve a strategy to see your history here. Each approval is stored for this wallet.
          </p>
          <Link
            href="/app/run"
            className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-100 text-zinc-900 text-[0.9375rem] font-semibold hover:bg-white transition-colors"
          >
            Start a run
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-6">
          {records.map((r) => (
            <div
              key={r.id}
              className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden hover:border-zinc-700/60 transition-colors"
            >
              {/* Card header */}
              <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-zinc-800/60">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <RecommendationBadge rec={r.recommendation} />
                      {r.riskScore != null && (
                        <span className="text-[0.75rem] text-zinc-500 font-medium">
                          Risk {r.riskScore}/100
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[0.6875rem] font-mono text-zinc-600">
                      Session {r.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[0.8125rem] text-zinc-500 shrink-0">
                  <Clock className="h-4 w-4" />
                  {new Date(r.timestamp).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {/* Goal */}
              {r.goal && (
                <div className="px-6 py-4 bg-zinc-950/40">
                  <p className="text-[0.6875rem] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                    Goal
                  </p>
                  <p className="text-[0.9375rem] text-zinc-300 leading-relaxed italic">
                    &ldquo;{r.goal}&rdquo;
                  </p>
                </div>
              )}

              {/* On-chain IDs */}
              <div className="px-6 py-4">
                <p className="text-[0.6875rem] font-medium text-zinc-500 uppercase tracking-wider mb-3">
                  On-chain verification
                </p>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4">
                  {r.hcsTxId && <TxLink id={r.hcsTxId} label="HCS" />}
                  {r.htsTxId && <TxLink id={r.htsTxId} label="HTS" />}
                  {!r.hcsTxId && !r.htsTxId && (
                    <div className="py-4 flex items-center gap-3">
                      <FileCheck className="h-4 w-4 text-zinc-600 shrink-0" />
                      <p className="text-[0.8125rem] text-zinc-500">
                        No on-chain transactions (HOLD or simulated)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Signer */}
              {r.signerAddress && (
                <div className="px-6 py-4 border-t border-zinc-800/60">
                  <p className="text-[0.75rem] text-zinc-500">
                    Signed by{' '}
                    <span className="font-mono text-zinc-400">
                      {r.signerAddress === '0x0000000000000000000000000000000000000000'
                        ? 'Demo mode (no wallet)'
                        : `${r.signerAddress.slice(0, 6)}...${r.signerAddress.slice(-4)}`}
                    </span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
