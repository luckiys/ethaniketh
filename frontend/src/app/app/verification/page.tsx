'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import {
  ShieldCheck, ArrowRight, ExternalLink, Clock, CheckCircle,
  Wallet, FileCheck, XCircle, ChevronDown, Filter,
} from 'lucide-react';

interface VerificationRecord {
  id: string;
  timestamp: string;
  goal: string;
  recommendation: string;
  riskScore: number;
  hcsTxId?: string;
  htsTxId?: string;
  signerAddress?: string;
  status?: 'approved' | 'rejected';
}

type FilterMode = 'all' | 'approved' | 'rejected';

function riskMeta(score: number) {
  if (score < 30) return { label: 'Low', text: 'text-emerald-400', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500' };
  if (score < 55) return { label: 'Moderate', text: 'text-amber-400', bg: 'bg-amber-500/10', bar: 'bg-amber-400' };
  if (score < 75) return { label: 'High', text: 'text-orange-400', bg: 'bg-orange-500/10', bar: 'bg-orange-500' };
  return { label: 'Critical', text: 'text-red-400', bg: 'bg-red-500/10', bar: 'bg-red-500' };
}

function RecommendationBadge({ rec }: { rec: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    HOLD: { bg: 'bg-zinc-500/10', text: 'text-zinc-400' },
    REBALANCE: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
    REDUCE_RISK: { bg: 'bg-red-500/10', text: 'text-red-400' },
    INCREASE_EXPOSURE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  };
  const c = config[rec] ?? config.HOLD;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[0.6875rem] font-semibold uppercase tracking-[0.04em] ${c.bg} ${c.text}`}>
      {rec.replace(/_/g, ' ')}
    </span>
  );
}

function StatusBadge({ status }: { status: 'approved' | 'rejected' }) {
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.6875rem] font-semibold uppercase tracking-[0.04em] bg-red-500/10 text-red-400">
        <XCircle className="h-3 w-3" />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.6875rem] font-semibold uppercase tracking-[0.04em] bg-emerald-500/10 text-emerald-400">
      <CheckCircle className="h-3 w-3" />
      Approved
    </span>
  );
}

function TxLink({ id, label }: { id: string; label: string }) {
  const isMock = id.startsWith('mock-');
  return (
    <div className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
      <span className="text-[0.6875rem] font-semibold uppercase tracking-wider shrink-0 w-10"
        style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      {isMock ? (
        <span className="text-[0.8125rem] font-mono break-all" style={{ color: 'var(--text-tertiary)' }}>{id} (simulated)</span>
      ) : (
        <a
          href={`https://hashscan.io/testnet/transaction/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 text-[0.8125rem] font-mono text-blue-400 hover:text-blue-300 break-all"
        >
          <span className="truncate max-w-[260px]">{id}</span>
          <ExternalLink className="h-3 w-3 shrink-0 opacity-60 group-hover:opacity-100" />
        </a>
      )}
    </div>
  );
}

function getStorageKey(address: string | undefined) {
  return address ? `mudra-verifications-${address.toLowerCase()}` : null;
}

function VerificationCard({ record, isExpanded, onToggle }: { record: VerificationRecord; isExpanded: boolean; onToggle: () => void }) {
  const risk = riskMeta(record.riskScore);
  const recordStatus = record.status ?? (record.hcsTxId || record.htsTxId || record.signerAddress ? 'approved' : 'approved');
  const isRejected = recordStatus === 'rejected';

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all duration-200"
      style={{
        background: 'var(--bg-card)',
        borderColor: isExpanded ? 'var(--accent-blue)' : 'var(--border)',
      }}
    >
      {/* Clickable header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center gap-4 transition-colors"
      >
        {/* Status icon */}
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isRejected ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
          {isRejected
            ? <XCircle className="h-5 w-5 text-red-400" />
            : <CheckCircle className="h-5 w-5 text-emerald-400" />}
        </div>

        {/* Summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <RecommendationBadge rec={record.recommendation} />
            <StatusBadge status={recordStatus} />
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${risk.bg} ${risk.text}`}>
              {record.riskScore}/100
            </span>
          </div>
          <p className="mt-1.5 text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
            {record.goal}
          </p>
        </div>

        {/* Timestamp + chevron */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Clock className="h-3.5 w-3.5" />
            {new Date(record.timestamp).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          />
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          {/* Goal */}
          <div className="px-5 py-4" style={{ background: 'var(--bg-card-hover)' }}>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--text-muted)' }}>Goal</p>
            <p className="text-sm leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>
              &ldquo;{record.goal}&rdquo;
            </p>
          </div>

          {/* Risk meter */}
          <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-muted)' }}>Risk Score</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-card-hover)' }}>
                <div className={`h-full rounded-full transition-all ${risk.bar}`} style={{ width: `${record.riskScore}%` }} />
              </div>
              <span className={`text-sm font-bold tabular-nums ${risk.text}`}>
                {record.riskScore}
                <span style={{ color: 'var(--text-muted)' }} className="font-normal">/100</span>
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${risk.bg} ${risk.text}`}>{risk.label}</span>
            </div>
          </div>

          {/* Timestamp (mobile) */}
          <div className="sm:hidden px-5 py-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs">
              {new Date(record.timestamp).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>

          {/* On-chain IDs */}
          {!isRejected && (
            <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--text-muted)' }}>On-chain Verification</p>
              <div className="rounded-xl border p-3 space-y-1" style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                {record.hcsTxId && <TxLink id={record.hcsTxId} label="HCS" />}
                {record.htsTxId && <TxLink id={record.htsTxId} label="HTS" />}
                {!record.hcsTxId && !record.htsTxId && (
                  <div className="py-2 flex items-center gap-2.5">
                    <FileCheck className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No on-chain transactions (HOLD or simulated)</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rejection reason */}
          {isRejected && (
            <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300/90">
                  You rejected this strategy. No execution was performed and no on-chain record was created.
                </p>
              </div>
            </div>
          )}

          {/* Signer */}
          {record.signerAddress && (
            <div className="px-5 py-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Signed by</span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                {record.signerAddress === '0x0000000000000000000000000000000000000000'
                  ? 'Demo mode (no wallet)'
                  : `${record.signerAddress.slice(0, 6)}...${record.signerAddress.slice(-4)}`}
              </span>
            </div>
          )}

          {/* Session ID footer */}
          <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <span className="text-[0.6875rem] font-mono" style={{ color: 'var(--text-muted)' }}>Session: {record.id}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerificationPage() {
  const { address } = useAccount();
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');

  const loadRecords = useCallback(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const key = getStorageKey(address);
      const fallbackKey = 'mudra-verifications';
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
      setRecords(merged.slice(0, 50));
    } catch {
      setRecords([]);
    }
  }, [address]);

  useEffect(() => {
    loadRecords();
    const onSaved = () => loadRecords();
    window.addEventListener('mudra-verification-saved', onSaved);
    window.addEventListener('storage', onSaved);
    return () => {
      window.removeEventListener('mudra-verification-saved', onSaved);
      window.removeEventListener('storage', onSaved);
    };
  }, [loadRecords]);

  const clearHistory = () => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const key = getStorageKey(address);
    if (key) localStorage.removeItem(key);
    localStorage.removeItem('mudra-verifications');
    setRecords([]);
  };

  const filtered = records.filter((r) => {
    const status = r.status ?? 'approved';
    if (filter === 'approved') return status === 'approved';
    if (filter === 'rejected') return status === 'rejected';
    return true;
  });

  const approvedCount = records.filter((r) => (r.status ?? 'approved') === 'approved').length;
  const rejectedCount = records.filter((r) => r.status === 'rejected').length;

  return (
    <div className="px-8 lg:px-12 xl:px-16 py-10 lg:py-14 w-full">
      <div className="max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-[2.5rem] lg:text-[3rem] font-bold tracking-[-0.03em] leading-[1.1]"
              style={{ color: 'var(--text-primary)' }}>
              Verification
            </h1>
            <p className="mt-3 text-lg leading-relaxed max-w-xl" style={{ color: 'var(--text-secondary)' }}>
              Your approval history, tied to your wallet. Every decision is recorded here.
            </p>
          </div>
          {records.length > 0 && (
            <button
              onClick={clearHistory}
              className="shrink-0 text-sm px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
            >
              Clear history
            </button>
          )}
        </div>

        {/* Stats + Filter bar */}
        {records.length > 0 && (
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            {/* Stats pills */}
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                {records.length} total
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" />
                {approvedCount} approved
              </div>
              {rejectedCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400">
                  <XCircle className="h-3.5 w-3.5" />
                  {rejectedCount} rejected
                </div>
              )}
            </div>

            {/* Filter */}
            <div className="flex items-center gap-1 ml-auto rounded-lg border p-0.5"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <Filter className="h-3.5 w-3.5 mx-2" style={{ color: 'var(--text-muted)' }} />
              {(['all', 'approved', 'rejected'] as FilterMode[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all"
                  style={{
                    background: filter === f ? 'var(--bg-card-hover)' : 'transparent',
                    color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {!address ? (
          <div className="mt-12 rounded-2xl border p-16 text-center"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
                <Wallet className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
            <h2 className="mt-6 font-semibold text-xl" style={{ color: 'var(--text-primary)' }}>Connect your wallet</h2>
            <p className="mt-3 text-[0.9375rem] max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Your verification history is tied to your wallet. Connect to see your approved and rejected strategies.
            </p>
          </div>
        ) : records.length === 0 ? (
          <div className="mt-12 rounded-2xl border p-16 text-center"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
                <ShieldCheck className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
            <h2 className="mt-6 font-semibold text-xl" style={{ color: 'var(--text-primary)' }}>No verifications yet</h2>
            <p className="mt-3 text-[0.9375rem] max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Complete a run and approve or reject a strategy. Every decision is recorded here.
            </p>
            <Link
              href="/app/run"
              className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-[0.9375rem] font-semibold transition-colors"
              style={{ background: 'var(--accent-blue)', color: '#ffffff' }}
            >
              Start a run
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border p-12 text-center"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              No {filter} records found.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {filtered.map((r) => (
              <VerificationCard
                key={r.id}
                record={r}
                isExpanded={expandedId === r.id}
                onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
