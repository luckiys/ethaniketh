'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, X, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, ArrowRight } from 'lucide-react';
import type { StrategyPlan } from '@mudra/shared';

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

function riskMeta(score: number): { label: string; bar: string; text: string; bg: string } {
  if (score < 30) return { label: 'Low', bar: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  if (score < 55) return { label: 'Moderate', bar: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10' };
  if (score < 75) return { label: 'High', bar: 'bg-orange-500', text: 'text-orange-400', bg: 'bg-orange-500/10' };
  return { label: 'Critical', bar: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10' };
}

function describeAction(a: StrategyPlan['actions'][number]): string {
  const amtStr = parseFloat(a.amount) > 0
    ? parseFloat(a.amount).toLocaleString(undefined, { maximumFractionDigits: 4 })
    : a.amount;
  switch (a.type) {
    case 'TRANSFER':
      return `Move ${amtStr} ${a.token} from ${a.from} → ${a.to}`;
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

function describeRecommendation(rec: string, riskScore: number, actions: StrategyPlan['actions']): string {
  const name = rec.replace(/_/g, ' ').toLowerCase();
  if (rec === 'HOLD') {
    return `Hold your current positions as-is. Your risk level (${riskScore}/100) is within acceptable bounds, so no changes are needed right now.`;
  }
  if (rec === 'REBALANCE') {
    const tokenMoves = actions.filter((a) => a.type === 'TRANSFER').map((a) => `${a.token}`).join(', ');
    return `Rebalance by adjusting ${tokenMoves || 'your holdings'} to reduce concentration risk. This brings your projected risk to ${riskScore}/100, improving diversification without drastically changing your strategy.`;
  }
  if (rec === 'REDUCE_RISK') {
    return `Aggressively reduce exposure to lower your risk from current levels down to ${riskScore}/100. This is a more conservative move, shifting funds toward stable assets to protect against downside.`;
  }
  if (rec === 'INCREASE_EXPOSURE') {
    return `Market conditions are favorable. Increase exposure to capture more upside, bringing projected risk to ${riskScore}/100.`;
  }
  return `${name} — projected risk score: ${riskScore}/100.`;
}

export function ApprovalModal({
  plan: originalPlan,
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
  const [expandedAlt, setExpandedAlt] = useState<number | null>(null);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number>(-1); // -1 = original

  const allPlans = [originalPlan, ...alternatePlans];
  const activePlan = selectedPlanIndex === -1 ? originalPlan : alternatePlans[selectedPlanIndex];
  const risk = riskMeta(activePlan.riskScore);
  const isOriginal = selectedPlanIndex === -1;

  useEffect(() => {
    const ctx = (activePlan as { decisionContext?: Record<string, unknown> }).decisionContext;
    setHumanizing(true);
    setHumanReasoning(null);

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

    const combined = [activePlan.worstCaseAnalysis, activePlan.reasoning].filter(Boolean).join(' ').trim();
    if (!combined) {
      setHumanizing(false);
      return;
    }
    fetch('/api/humanize-reasoning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reasoning: activePlan.reasoning, worstCaseAnalysis: activePlan.worstCaseAnalysis }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.humanized) setHumanReasoning(data.humanized);
      })
      .catch(() => {})
      .finally(() => setHumanizing(false));
  }, [activePlan]);

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border overflow-y-auto max-h-[92vh]"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>

        {/* Header */}
        <div className="flex items-center gap-3 p-6 pb-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Approve Strategy</h2>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Review every detail before signing.</p>
          </div>
          <button onClick={onReject} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-zinc-800/50">
            <X className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Active plan label */}
          {!isOriginal && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs font-medium text-blue-400">Viewing alternate plan</span>
              <button onClick={() => setSelectedPlanIndex(-1)} className="ml-auto text-xs text-blue-400 underline underline-offset-2 hover:text-blue-300">
                Back to recommended
              </button>
            </div>
          )}

          {/* Recommendation */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Recommendation</span>
            <p className="mt-1 font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
              {activePlan.recommendation.replace(/_/g, ' ')}
            </p>
          </div>

          {/* Risk score bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Risk Score</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${risk.text} ${risk.bg}`}>{risk.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-card-hover)' }}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${risk.bar}`}
                  style={{ width: `${activePlan.riskScore}%` }}
                />
              </div>
              <span className={`text-base font-bold tabular-nums ${risk.text}`}>
                {activePlan.riskScore}
                <span className="font-normal" style={{ color: 'var(--text-muted)' }}>/100</span>
              </span>
            </div>
          </div>

          {/* AI explanation */}
          <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
              {humanizing ? 'Explaining our logic…' : 'Why we recommend this'}
            </span>
            <div className="mt-2 leading-relaxed text-sm" style={{ color: 'var(--text-secondary)' }}>
              {humanizing && !humanReasoning ? (
                <p style={{ color: 'var(--text-tertiary)' }}>Turning our analysis into plain language for you…</p>
              ) : humanReasoning ? (
                <div className="whitespace-pre-wrap">{humanReasoning}</div>
              ) : (
                <p>{`We recommend ${activePlan.recommendation.replace(/_/g, ' ').toLowerCase()} based on your portfolio. Expand below to see the full logic.`}</p>
              )}
            </div>
          </div>

          {/* Technical details dropdown */}
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={() => setShowDetails((d) => !d)}
              className="w-full flex items-center justify-between px-4 py-3 text-left text-xs font-medium transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <span>{showDetails ? 'Hide' : 'Show'} detailed logic</span>
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showDetails && (
              <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-mono leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-tertiary)' }}>
                  {[activePlan.worstCaseAnalysis, activePlan.reasoning].filter(Boolean).join('\n\n') || '—'}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          {activePlan.actions.length > 0 && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Actions</span>
              <ul className="mt-2 space-y-2">
                {activePlan.actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm rounded-lg border px-3 py-2.5"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    <ArrowRight className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--accent-blue)' }} />
                    <span>{describeAction(a)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Alternate plans — expandable cards */}
          {alternatePlans.length > 0 && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
                Alternative Options ({alternatePlans.length})
              </span>
              <div className="mt-2 space-y-2">
                {alternatePlans.map((alt, i) => {
                  const altRisk = riskMeta(alt.riskScore);
                  const isExpanded = expandedAlt === i;
                  const isSelected = selectedPlanIndex === i;
                  return (
                    <div key={alt.planId} className="rounded-xl border overflow-hidden transition-all"
                      style={{
                        background: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                        borderColor: isSelected ? 'var(--accent-blue)' : 'var(--border)',
                      }}>
                      <button
                        type="button"
                        onClick={() => setExpandedAlt(isExpanded ? null : i)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {alt.recommendation.replace(/_/g, ' ')}
                            </span>
                            {isSelected && (
                              <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">Active</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className={`text-xs font-semibold ${altRisk.text}`}>Risk: {alt.riskScore}/100</span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {alt.actions.length > 0 ? `${alt.actions.length} action${alt.actions.length > 1 ? 's' : ''}` : 'No actions'}
                            </span>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} /> : <ChevronDown className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
                          {/* Why this option works */}
                          <div className="pt-3">
                            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>Why this works</span>
                            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                              {describeRecommendation(alt.recommendation, alt.riskScore, alt.actions)}
                            </p>
                          </div>

                          {/* Risk comparison */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-card-hover)' }}>
                              <div className={`h-full rounded-full ${altRisk.bar}`} style={{ width: `${alt.riskScore}%` }} />
                            </div>
                            <span className={`text-xs font-bold tabular-nums ${altRisk.text}`}>{alt.riskScore}/100</span>
                          </div>

                          {/* Actions */}
                          {alt.actions.length > 0 ? (
                            <ul className="space-y-1.5">
                              {alt.actions.map((a, j) => (
                                <li key={j} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  <ArrowRight className="h-3 w-3 shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
                                  {describeAction(a)}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No actions — hold current allocation.</p>
                          )}

                          {/* Use this plan button */}
                          <button
                            onClick={() => setSelectedPlanIndex(isSelected ? -1 : i)}
                            className="w-full py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 border"
                            style={{
                              background: isSelected ? 'transparent' : 'var(--accent-blue)',
                              color: isSelected ? 'var(--text-secondary)' : '#ffffff',
                              borderColor: isSelected ? 'var(--border)' : 'transparent',
                            }}
                          >
                            {isSelected ? 'Switch back to recommended' : 'Use this plan instead'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Simulation notice */}
          <div className="rounded-xl border p-3 flex items-start gap-2.5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>About execution: </span>
              Approving logs this strategy to Hedera as an immutable audit trail.
              In this demo, token transfers are simulated — no real funds move.
            </p>
          </div>

          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Plan: {planHash.slice(0, 24)}...</p>
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex gap-3" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={handleApprove}
            disabled={disabled || status === 'signing'}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'signing' ? 'Signing...' : isWalletConnected ? 'Sign & Approve' : 'Approve (Demo)'}
          </button>
          <button
            onClick={onReject}
            disabled={disabled}
            className="flex-1 py-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <X className="h-4 w-4" />
            Reject
          </button>
        </div>

        {error && (
          <div className="mx-6 mb-6 rounded-xl border border-red-500/20 bg-red-950/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {!isWalletConnected && (
          <p className="text-xs text-center pb-4" style={{ color: 'var(--text-muted)' }}>
            Connect a wallet for real EIP-712 signing. Demo mode uses a placeholder signature.
          </p>
        )}
      </div>
    </div>
  );
}
