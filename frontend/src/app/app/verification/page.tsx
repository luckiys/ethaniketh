'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ShieldCheck, ArrowRight, ExternalLink, Clock, CheckCircle, Wallet } from 'lucide-react';

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
  const colors: Record<string, string> = {
    HOLD: 'bg-zinc-800 text-zinc-300',
    REBALANCE: 'bg-blue-950 text-blue-300 border border-blue-800',
    REDUCE_RISK: 'bg-red-950 text-red-300 border border-red-800',
    INCREASE_EXPOSURE: 'bg-green-950 text-green-300 border border-green-800',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[rec] ?? colors.HOLD}`}>
      {rec.replace(/_/g, ' ')}
    </span>
  );
}

function TxLink({ id, label }: { id: string; label: string }) {
  const isMock = id.startsWith('mock-');
  return (
    <div className="flex items-start gap-2">
      <span className="text-zinc-500 text-xs shrink-0 w-8 pt-0.5">{label}</span>
      {isMock ? (
        <span className="text-zinc-500 font-mono text-xs break-all">{id} (simulated)</span>
      ) : (
        <a
          href={`https://hashscan.io/testnet/transaction/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 font-mono text-xs break-all flex items-center gap-1"
        >
          {id}
          <ExternalLink className="h-3 w-3 shrink-0" />
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

  useEffect(() => {
    const key = getStorageKey(address);
    if (!key) {
      setRecords([]);
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? '[]');
      setRecords(stored);
    } catch {
      setRecords([]);
    }
  }, [address]);

  const clearHistory = () => {
    const key = getStorageKey(address);
    if (key) {
      localStorage.removeItem(key);
      setRecords([]);
    }
  };

  return (
    <div className="px-8 lg:px-16 py-10 lg:py-14 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[2rem] lg:text-[2.25rem] font-semibold text-zinc-50 tracking-[-0.02em] leading-tight">
            Verification
          </h1>
          <p className="mt-2 text-[0.9375rem] text-zinc-500 leading-relaxed max-w-lg">
            Your approval history, tied to your wallet. Every approved execution is logged to Hedera HCS.
          </p>
        </div>
        {records.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Clear history
          </button>
        )}
      </div>

      {!address ? (
        <div className="mt-10 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-10 text-center">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-800/80">
              <Wallet className="h-7 w-7 text-zinc-500" />
            </div>
          </div>
          <h2 className="mt-5 font-semibold text-zinc-200 text-lg">Connect your wallet</h2>
          <p className="mt-2 text-[0.9375rem] text-zinc-500 max-w-sm mx-auto leading-relaxed">
            Your verification history is tied to your wallet. Connect to see your approved transactions.
          </p>
          <p className="mt-4 text-[0.8125rem] text-zinc-600">
            Use the wallet button in the sidebar to connect.
          </p>
        </div>
      ) : records.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-10 text-center">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-800/80">
              <ShieldCheck className="h-7 w-7 text-zinc-500" />
            </div>
          </div>
          <h2 className="mt-5 font-semibold text-zinc-200 text-lg">No verifications yet</h2>
          <p className="mt-2 text-[0.9375rem] text-zinc-500 max-w-sm mx-auto leading-relaxed">
            Complete a run and approve a strategy to see your history here. Each approval is stored for this wallet.
          </p>
          <Link
            href="/app/run"
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-100 text-zinc-900 text-[0.9375rem] font-medium hover:bg-white transition-colors"
          >
            Start a run
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {records.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-xs font-mono text-zinc-500">{r.id.slice(0, 8)}...</span>
                  <RecommendationBadge rec={r.recommendation} />
                  {r.riskScore != null && (
                    <span className="text-xs text-zinc-500">risk {r.riskScore}/100</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-zinc-600 shrink-0">
                  <Clock className="h-3 w-3" />
                  {new Date(r.timestamp).toLocaleString()}
                </div>
              </div>

              {r.goal && (
                <p className="text-sm text-zinc-400 italic">&ldquo;{r.goal}&rdquo;</p>
              )}

              <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-950 p-3">
                {r.hcsTxId && <TxLink id={r.hcsTxId} label="HCS" />}
                {r.htsTxId && <TxLink id={r.htsTxId} label="HTS" />}
                {!r.hcsTxId && !r.htsTxId && (
                  <p className="text-xs text-zinc-600 font-mono">No on-chain transactions (HOLD or simulated)</p>
                )}
              </div>

              {r.signerAddress && (
                <p className="text-xs text-zinc-500 font-mono">
                  Signed by{' '}
                  {r.signerAddress === '0x0000000000000000000000000000000000000000'
                    ? 'Demo mode (no wallet)'
                    : r.signerAddress}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
