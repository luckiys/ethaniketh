'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, X, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { StrategyPlan } from '@aegisos/shared';

interface ApprovalModalProps {
  plan: StrategyPlan;
  planHash: string;
  alternatePlans?: StrategyPlan[];
  onApprove: (signature: string, signerAddress: string, signatureTimestamp?: string) => void;
  onReject: () => void;
  disabled?: boolean;
  signPlan: (planHash: string) => Promise<{ signature: string; address: string; signatureTimestamp?: string }>;
  isWalletConnected?: boolean;
}

// Risk score → visual color + label
function riskMeta(score: number): { label: string; bar: string; text: string } {
  if (score < 30) return { label: 'Low', bar: 'bg-emerald-500', text: 'text-emerald-400' };
  if (score < 55) return { label: 'Moderate', bar: 'bg-amber-400', text: 'text-amber-400' };
  if (score < 75) return { label: 'High', bar: 'bg-orange-500', text: 'text-orange-400' };
  return { label: 'Critical', bar: 'bg-red-500', text: 'text-red-400' };
}

// Plain-English action descriptions so non-technical users understand what will happen
function describeAction(a: StrategyPlan['actions'][number]): string {
  const amtStr = parseFloat(a.amount) > 0
    ? parseFloat(a.amount).toLocaleString(undefined, { maximumFractionDigits: 4 })
    : a.amount;
  switch (a.type) {
    case 'TRANSFER':
      return `Move ${amtStr} ${a.token} from ${a.from} → ${a.to} (reduce exposure)`;
    case 'SWAP':
      return `Swap ${amtStr} ${a.token} into ${a.to}`;
    case 'STAKE':
      return `Stake ${amtStr} ${a.token} to earn yield`;
    case 'UNSTAKE':
      return `Unstake ${amtStr} ${a.token} from ${a.from}`;
    default:
      return `${a.type} ${amtStr} ${a.token} → ${a.to}`;
  }
}

export function ApprovalModal({
  plan,
  planHash,
  alternatePlans = [],
  onApprove,
  onReject,
  disabled,
  signPlan,
  isWalletConnected = false,
}: ApprovalModalProps) {
  const [status, setStatus] = useState<'idle' | 'signing' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [humanReasoning, setHumanReasoning] = useState<string | null>(null);
  const [humanizing, setHumanizing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommended' | 'alternates'>('recommended');

  const risk = riskMeta(plan.riskScore);

  // LLM explains our logic in beginner-friendly steps (uses actual decision context when available)
  useEffect(() => {
    const ctx = (plan as { decisionContext?: Record<string, unknown> }).decisionContext;
    setHumanizing(true);

    if (ctx && Object.keys(ctx).length > 0) {
      fetch('/api/explain-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionContext: ctx }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.steps) setHumanReasoning(data.steps);
        })
        .catch(() => {})
        .finally(() => setHumanizing(false));
      return;
    }

    const combined = [plan.worstCaseAnalysis, plan.reasoning].filter(Boolean).join(' ').trim();
    if (!combined) {
      setHumanizing(false);
      return;
    }
    fetch('/api/humanize-reasoning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reasoning: plan.reasoning, worstCaseAnalysis: plan.worstCaseAnalysis }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.humanized) setHumanReasoning(data.humanized);
      })
      .catch(() => {})
      .finally(() => setHumanizing(false));
  }, [plan]);

  const handleApprove = async () => {
    setStatus('signing');
    setError(null);
    try {
      if (isWalletConnected) {
        const { signature, address, signatureTimestamp } = await signPlan(planHash);
        onApprove(signature, address, signatureTimestamp);
      } else {
        onApprove('0xDemoSignature-' + Date.now(), '0x0000000000000000000000000000000000000000');
      }
    } catch (e) {
      setError(String(e));
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-xl overflow-y-auto max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Approve Strategy</h2>
            <p className="text-xs text-zinc-500">Review every detail before signing.</p>
          </div>
        </div>

        {/* Tabs: Recommended | Alternate solutions */}
        {alternatePlans.length > 0 && (
          <div className="flex gap-1 mb-4 p-1 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('recommended')}
              className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${activeTab === 'recommended' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Recommended
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('alternates')}
              className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${activeTab === 'alternates' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Alternate solutions ({alternatePlans.length})
            </button>
          </div>
        )}

        <div className="space-y-4 text-sm">

          {/* Recommendation — only for primary plan when on recommended tab */}
          {activeTab === 'recommended' && (
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Recommendation</span>
            <p className="mt-0.5 font-semibold text-zinc-100 text-base">
              {plan.recommendation.replace(/_/g, ' ')}
            </p>
          </div>
          )}

          {/* Risk score — colored bar + label (or alternate list) */}
          {activeTab === 'alternates' ? (
            <div className="space-y-3">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Other options we considered</span>
              {alternatePlans.map((alt, i) => {
                const altRisk = riskMeta(alt.riskScore);
                return (
                  <div key={alt.planId} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-zinc-200">{alt.recommendation.replace(/_/g, ' ')}</span>
                      <span className={`text-xs font-semibold ${altRisk.text}`}>{alt.riskScore}/100</span>
                    </div>
                    {alt.actions.length > 0 && (
                      <ul className="mt-1.5 space-y-1 text-xs text-zinc-400">
                        {alt.actions.map((a, j) => (
                          <li key={j}>→ {describeAction(a)}</li>
                        ))}
                      </ul>
                    )}
                    {alt.actions.length === 0 && (
                      <p className="text-xs text-zinc-500 mt-1">No actions — hold current allocation.</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Risk Score</span>
                <span className={`text-xs font-semibold ${risk.text}`}>{risk.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${risk.bar}`}
                    style={{ width: `${plan.riskScore}%` }}
                  />
                </div>
                <span className={`text-sm font-bold tabular-nums ${risk.text}`}>
                  {plan.riskScore}
                  <span className="text-zinc-600 font-normal">/100</span>
                </span>
              </div>
            </div>

            {/* Step-by-step explanation — LLM translates our logic for beginners */}
            <div>
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                {humanizing ? 'Explaining our logic…' : 'Why we recommend this'}
              </span>
              <div className="mt-0.5 text-zinc-300 leading-relaxed text-sm">
                {humanizing && !humanReasoning ? (
                  <p className="text-zinc-500">Turning our analysis into plain language for you…</p>
                ) : humanReasoning ? (
                  <div className="whitespace-pre-wrap">{humanReasoning}</div>
                ) : (
                  <p>{`We recommend ${plan.recommendation.replace(/_/g, ' ').toLowerCase()} based on your portfolio. Expand below to see the full logic.`}</p>
                )}
              </div>
            </div>
          </>
          )}

          {/* Expandable: full technical logic — only when on recommended tab */}
          {activeTab === 'recommended' && (
          <div className="rounded-md border border-zinc-800 bg-zinc-900/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDetails((d) => !d)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left text-xs font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
            >
              <span>{showDetails ? 'Hide' : 'Show'} the detailed logic</span>
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showDetails && (
              <div className="px-3 pb-3 pt-0 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 font-mono leading-relaxed whitespace-pre-wrap">
                  {[plan.worstCaseAnalysis, plan.reasoning].filter(Boolean).join('\n\n') || '—'}
                </p>
              </div>
            )}
          </div>
          )}

          {/* Actions — plain English (only when on recommended tab) */}
          {activeTab === 'recommended' && plan.actions.length > 0 && (
            <div>
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</span>
              <ul className="mt-1.5 space-y-1.5">
                {plan.actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-zinc-300">
                    <span className="text-zinc-600 shrink-0 mt-0.5">→</span>
                    <span>{describeAction(a)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Simulation notice */}
          <div className="rounded-md border border-zinc-700/60 bg-zinc-900/60 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-400 leading-relaxed">
              <span className="font-medium text-zinc-300">About execution: </span>
              Approving logs this strategy to Hedera as an immutable on-chain audit trail.
              In this demo, token transfers are simulated — no real funds move.
              In production with Hedera credentials, approved TRANSFER actions execute via Hedera Token Service.
            </p>
          </div>

          {/* Plan hash */}
          <p className="text-xs text-zinc-600 font-mono">Plan hash: {planHash.slice(0, 20)}...</p>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-3">
          {activeTab !== 'alternates' && (
            <button
              onClick={handleApprove}
              disabled={disabled || status === 'signing'}
              className="flex-1 py-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === 'signing' ? 'Signing...' : isWalletConnected ? 'Sign & Approve' : 'Approve (Demo)'}
            </button>
          )}
          <button
            onClick={onReject}
            disabled={disabled}
            className="flex-1 py-3 rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Reject
          </button>
        </div>

        {!isWalletConnected && (
          <p className="text-xs text-zinc-500 text-center mt-3">
            Connect a wallet for real EIP-712 signing. Demo mode uses a placeholder signature.
          </p>
        )}
      </div>
    </div>
  );
}
