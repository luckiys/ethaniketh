'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { ShieldCheck } from 'lucide-react';
import { HoldingsInput } from '@/components/holdings-input';
import { AgentCard } from '@/components/agent-card';
import { AgentDetailModal } from '@/components/agent-detail-modal';
import { ApprovalModal } from '@/components/approval-modal';
import { RiskSettingsModal, riskLabel, riskColor } from '@/components/risk-settings-modal';
import type { RiskSetting } from '@/components/risk-settings-modal';
import type { Holding, AgentEvent, StrategyPlan, AgentId } from '@mudra/shared';
import { signApproval } from '@/lib/sign';

function loadRiskSetting(): RiskSetting {
  if (typeof window === 'undefined') return { mode: 'medium', value: 54 };
  try {
    const stored = localStorage.getItem('mudra-risk-setting');
    if (stored) {
      const parsed = JSON.parse(stored) as RiskSetting;
      if (parsed && parsed.mode && typeof parsed.value === 'number') return parsed;
    }
  } catch {}
  return { mode: 'medium', value: 54 };
}

export default function RunPage() {
  const [goal, setGoal] = useState('Maximize yield while keeping risk low');
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [riskSetting, setRiskSettingState] = useState<RiskSetting>(loadRiskSetting);

  const setRiskSetting = useCallback((s: RiskSetting) => {
    setRiskSettingState(s);
    try { localStorage.setItem('mudra-risk-setting', JSON.stringify(s)); } catch {}
  }, []);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<{
    hederaTopicId?: string;
    agentNftIds?: { watcher: string; strategist: string; executor: string };
    lastHcsTxId?: string;
    htsTxId?: string;
    approvedPlanHash?: string;
    signature?: string;
    signerAddress?: string;
  } | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [plan, setPlan] = useState<StrategyPlan | null>(null);
  const [planHash, setPlanHash] = useState<string | null>(null);
  const [stratBrainCid, setStratBrainCid] = useState<string | null>(null);
  const [alternatePlans, setAlternatePlans] = useState<StrategyPlan[]>([]);
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'awaiting_approval' | 'executed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [agentDetail, setAgentDetail] = useState<AgentId | null>(null);

  const { address, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const agentStatus: Record<'watcher' | 'strategist' | 'executor', 'idle' | 'running' | 'done' | 'error'> = (() => {
    const fromEvents = {
      watcher: events.some((e) => e.agentId === 'watcher' && e.payload?.portfolioValue != null) ? 'done' as const : events.some((e) => e.agentId === 'watcher') ? 'running' as const : 'idle' as const,
      strategist: events.some((e) => e.type === 'APPROVAL_REQUEST') ? 'done' as const : events.some((e) => e.agentId === 'strategist') ? 'running' as const : 'idle' as const,
      executor: events.some((e) => e.agentId === 'executor' && e.type === 'EXECUTED') ? 'done' as const : events.some((e) => e.agentId === 'executor') ? 'running' as const : 'idle' as const,
    };
    if (status === 'starting' || status === 'running') {
      return {
        watcher: plan ? 'done' : fromEvents.watcher === 'idle' && sessionId ? 'running' : fromEvents.watcher,
        strategist: plan ? 'done' : fromEvents.strategist === 'idle' && sessionId ? 'running' : fromEvents.strategist,
        executor: sessionState?.htsTxId ? 'done' : fromEvents.executor,
      };
    }
    if (status === 'awaiting_approval') return { watcher: 'done', strategist: 'done', executor: 'idle' };
    if (status === 'executed') return { watcher: 'done', strategist: 'done', executor: 'done' };
    return fromEvents;
  })();

  useEffect(() => {
    let lastCount = 0;
    const poll = async () => {
      try {
        const res = await fetch('/api/events');
        const data = (await res.json()) as AgentEvent[];
        const filtered = sessionId ? data.filter((e) => e.sessionId === sessionId) : data.slice(-20);
        if (filtered.length !== lastCount || filtered.length > 0) {
          setEvents(filtered.slice(-99));
          lastCount = filtered.length;
        }
      } catch {}
    };
    poll();
    const id = setInterval(poll, status === 'starting' || status === 'running' || status === 'awaiting_approval' ? 400 : 1000);
    return () => clearInterval(id);
  }, [sessionId, status]);

  const startSession = useCallback(async () => {
    const trimmed = goal.trim();
    if (!trimmed) { setError('Describe your goal in plain words.'); return; }
    setStatus('starting');
    setError(null);
    setEvents([]);
    setPlan(null);
    setPlanHash(null);
    const validHoldings = holdings.filter((h) => h.symbol?.trim() && (h.amount > 0 || (h.valueUsd ?? 0) > 0));
    if (validHoldings.length === 0) {
      setError('Add at least one holding. Connect your wallet and use Import from wallet, or add manually.');
      setStatus('idle');
      return;
    }
    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: trimmed, holdings: validHoldings, walletAddress: address, riskPreference: riskSetting.value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start');
      setSessionId(data.sessionId);
      setSessionState({ hederaTopicId: data.hederaTopicId, agentNftIds: data.agentNftIds });
      setStatus('running');

      const runRes = await fetch(`/api/session/${data.sessionId}/run`, { method: 'POST' });
      const runData = await runRes.json();
      if (!runRes.ok) throw new Error(runData.error || 'Failed to run');
      setPlan(runData.plan);
      setPlanHash(runData.planHash ?? null);
      setStratBrainCid(runData.stratBrainCid ?? null);
      setAlternatePlans(runData.alternatePlans ?? []);
      const sessionRes = await fetch(`/api/session/${data.sessionId}`);
      const sessionData = await sessionRes.json();
      setSessionState((s) => ({ ...s, ...sessionData }));
      setStatus(runData.plan ? 'awaiting_approval' : 'running');
    } catch (e) {
      setError(String(e));
      setStatus('error');
    }
  }, [goal, holdings, address, riskSetting]);

  const handleApprove = useCallback(
    async (signature: string, signerAddress: string, signatureTimestamp?: string) => {
      if (!sessionId || !plan || !planHash) return;
      const hashToStore = planHash;
      const planSnapshot = plan;
      setPlan(null);
      setPlanHash(null);
      try {
        const res = await fetch(`/api/session/${sessionId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approval: { planId: planSnapshot.planId, planHash, signature, signerAddress, timestamp: new Date().toISOString(), signatureTimestamp } }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Approval failed');
        const sessionRes = await fetch(`/api/session/${sessionId}`);
        const sessionData = await sessionRes.json();
        setSessionState((s) => ({ ...s, htsTxId: sessionData.htsTxId, lastHcsTxId: sessionData.lastHcsTxId, signature, signerAddress, approvedPlanHash: hashToStore }));
        setStatus('executed');
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            const record = { id: sessionId, timestamp: new Date().toISOString(), goal, recommendation: planSnapshot.recommendation, riskScore: planSnapshot.riskScore, hcsTxId: sessionData.lastHcsTxId, htsTxId: sessionData.htsTxId, signerAddress };
            const storageKey = address ? `mudra-verifications-${address.toLowerCase()}` : 'mudra-verifications';
            const prev = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
            const next = [record, ...prev].slice(0, 20);
            localStorage.setItem(storageKey, JSON.stringify(next));
            window.dispatchEvent(new CustomEvent('mudra-verification-saved', { detail: { key: storageKey } }));
          } catch (e) {
            console.warn('Failed to save verification to localStorage:', e);
          }
        }
      } catch (e) { setError(String(e)); }
    },
    [sessionId, plan, planHash, goal, address]
  );

  const handleReject = useCallback(() => {
    if (!sessionId) return;
    const rejectedPlan = plan;
    setPlan(null);
    setPlanHash(null);
    setAlternatePlans([]);
    setStatus('idle');
    fetch(`/api/session/${sessionId}/reject`, { method: 'POST' }).catch(() => {});
    if (typeof window !== 'undefined' && window.localStorage && rejectedPlan) {
      try {
        const record = { id: sessionId, timestamp: new Date().toISOString(), goal, recommendation: rejectedPlan.recommendation, riskScore: rejectedPlan.riskScore, status: 'rejected' as const };
        const storageKey = address ? `mudra-verifications-${address.toLowerCase()}` : 'mudra-verifications';
        const prev = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
        const next = [record, ...prev].slice(0, 20);
        localStorage.setItem(storageKey, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('mudra-verification-saved', { detail: { key: storageKey } }));
      } catch {}
    }
  }, [sessionId, plan, goal, address]);

  const signPlan = useCallback(async (hash: string) => {
    if (!walletClient || !address) throw new Error('Connect wallet to sign');
    const SIGN_CHAIN_ID = 84532;
    if (chain?.id !== SIGN_CHAIN_ID && switchChainAsync) await switchChainAsync({ chainId: SIGN_CHAIN_ID });
    return signApproval(walletClient, address, plan!.planId, hash);
  }, [walletClient, address, plan, chain?.id, switchChainAsync]);

  const resetSession = () => {
    setSessionId(null); setSessionState(null); setEvents([]); setPlan(null);
    setPlanHash(null); setStratBrainCid(null); setAlternatePlans([]); setStatus('idle'); setError(null);
  };

  const hasValidGoal = goal.trim().length > 0;
  const hasValidHoldings = holdings.some((h) => h.symbol?.trim() && (h.amount > 0 || (h.valueUsd ?? 0) > 0));

  return (
    <div className="px-8 lg:px-12 xl:px-16 py-10 lg:py-14 w-full">
      {/* Header */}
      <div className="mb-10 max-w-6xl">
        <div className="flex items-center gap-3">
          <h1 className="text-[2.5rem] lg:text-[3rem] font-bold tracking-[-0.03em] leading-[1.1]"
            style={{ color: 'var(--text-primary)' }}>
            Run
          </h1>
          {(status === 'starting' || status === 'running') && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[0.75rem] font-medium text-amber-400 uppercase tracking-[0.06em]">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />Running
            </span>
          )}
          {status === 'awaiting_approval' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[0.75rem] font-medium text-blue-400 uppercase tracking-[0.06em]">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />Awaiting approval
            </span>
          )}
          {status === 'executed' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[0.75rem] font-medium text-emerald-400 uppercase tracking-[0.06em]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Executed
            </span>
          )}
        </div>
        <p className="mt-3 text-lg leading-relaxed max-w-xl" style={{ color: 'var(--text-secondary)' }}>
          Describe your goal and let the agents propose a strategy. You approve every step.
        </p>
      </div>

      {status === 'awaiting_approval' && plan && (
        <div className="mb-8 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-3 max-w-6xl">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[0.9375rem] text-amber-200/90">Strategy ready — review and approve below</span>
        </div>
      )}

      <div className="flex flex-col gap-8 max-w-6xl">
        {/* Session config */}
        <section className="rounded-2xl border p-6 lg:p-8 w-full transition-colors"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--text-muted)' }}>Session</h2>
          <p className="text-[0.9375rem] mb-6" style={{ color: 'var(--text-secondary)' }}>Configure your goal, holdings, and risk tolerance.</p>
          <div className="space-y-5">
            <div>
              <label className="block text-[0.8125rem] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>What do you want to achieve?</label>
              <p className="text-[0.6875rem] mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Describe in plain language — e.g. &quot;Saving for a house&quot;, &quot;Maximize yield&quot;, &quot;Protect my capital&quot;</p>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Maximize yield while keeping risk low, or: I want to preserve my savings for retirement"
                rows={4}
                className="w-full rounded-xl border px-4 py-3 text-[0.9375rem] outline-none focus:ring-1 focus:ring-blue-500/30 resize-none transition-colors"
                style={{
                  background: 'var(--bg-input)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <HoldingsInput holdings={holdings} onChange={setHoldings} disabled={!!sessionId} walletAddress={address} />

            {/* Risk setting display bar */}
            <div className="flex items-center justify-between rounded-xl border px-4 py-3"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className={`h-4 w-4 ${riskColor(riskSetting.mode)}`} />
                <span className="text-[0.8125rem]" style={{ color: 'var(--text-tertiary)' }}>Risk tolerance</span>
                <span className={`text-[0.8125rem] font-semibold ${riskColor(riskSetting.mode)}`}>{riskLabel(riskSetting)}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRiskModal(true)}
                disabled={!!sessionId}
                className="text-[0.8125rem] disabled:opacity-50 transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Change
              </button>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={startSession}
                disabled={status === 'starting' || !hasValidGoal || !hasValidHoldings}
                className="flex-1 py-3 rounded-xl text-[0.9375rem] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                style={{ background: 'var(--accent-blue)', color: '#ffffff' }}
              >
                {status === 'starting' ? 'Running...' : 'Start & Run'}
              </button>
              <button
                type="button"
                onClick={() => setShowRiskModal(true)}
                disabled={!!sessionId}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-[0.9375rem] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  riskSetting.mode === 'low' ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                  : riskSetting.mode === 'high' ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                  : riskSetting.mode === 'custom' ? 'border-violet-500/30 text-violet-400 hover:bg-violet-500/10'
                  : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Risk
              </button>
              {sessionId && status !== 'starting' && (
                <button onClick={resetSession} className="px-4 py-3 rounded-xl border text-[0.9375rem] font-medium transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  New Session
                </button>
              )}
            </div>
          </div>
          {sessionId && sessionState && (
            <div className="mt-6 pt-5 border-t text-[0.75rem] font-mono" style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
              Session: {sessionId.slice(0, 8)}... · HCS: {sessionState.hederaTopicId?.replace?.('mock-', '') ?? sessionState.hederaTopicId}
            </div>
          )}
        </section>

        {/* Agents */}
        <section className="rounded-2xl border p-6 lg:p-8 w-full transition-colors"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--text-muted)' }}>Agents</h2>
          <p className="text-[0.9375rem] mb-5" style={{ color: 'var(--text-secondary)' }}>Click an agent to learn what it does.</p>
          <div className="flex flex-col sm:flex-row gap-4 sm:flex-wrap">
            <AgentCard agentId="watcher" status={agentStatus.watcher} nftId={sessionState?.agentNftIds?.watcher}
              lastOutput={(() => { const last = events.filter((e) => e.agentId === 'watcher').slice(-1)[0]; const val = last?.payload?.portfolioValue; return val != null ? `Portfolio: $${Number(val).toLocaleString()}` : undefined; })()}
              onClick={() => setAgentDetail('watcher')} />
            <AgentCard agentId="strategist" status={agentStatus.strategist} nftId={sessionState?.agentNftIds?.strategist}
              lastOutput={plan ? `${plan.recommendation} (risk: ${plan.riskScore})` : undefined}
              onClick={() => setAgentDetail('strategist')} />
            <AgentCard agentId="executor" status={agentStatus.executor} nftId={sessionState?.agentNftIds?.executor}
              lastOutput={sessionState?.htsTxId ? `Tx: ${sessionState.htsTxId.slice(0, 20)}...` : undefined}
              onClick={() => setAgentDetail('executor')} />
          </div>
        </section>
      </div>

      <div className="mt-8 flex flex-col gap-8 max-w-6xl">
        {/* Activity Log */}
        <section className="rounded-2xl border p-6 lg:p-8 w-full transition-colors"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--text-muted)' }}>Activity Log</h2>
          <p className="text-[0.9375rem] mb-4" style={{ color: 'var(--text-secondary)' }}>Events from the current session.</p>
          <div className="max-h-40 overflow-y-auto space-y-2 font-mono text-[0.75rem] rounded-xl border p-4"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            {events.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)' }}>Events will appear here when you run a session.</p>
            ) : (
              events.map((e, i) => (
                <div key={i} className="flex gap-4 py-1.5 border-b last:border-0" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-primary)' }}>{e.type}</span>
                  <span>{e.agentId}</span>
                  <span className="ml-auto" style={{ color: 'var(--text-tertiary)' }}>{new Date(e.timestamp).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Verification */}
        <section className="rounded-2xl border p-6 lg:p-8 w-full transition-colors"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--text-muted)' }}>Verification</h2>
          <p className="text-[0.9375rem] mb-4" style={{ color: 'var(--text-secondary)' }}>On-chain IDs for this session.</p>
          <div className="space-y-2 text-[0.75rem] font-mono rounded-xl border p-4"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            {sessionState?.agentNftIds && (
              <div className="space-y-1 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <p className="font-sans" style={{ color: 'var(--text-tertiary)' }}>Agent iNFTs (Hedera HTS · 0g brain)</p>
                {(['watcher', 'strategist', 'executor'] as const).map((a) => (
                  <p key={a} className="truncate" style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)' }}>{a}: </span>{sessionState.agentNftIds![a]}</p>
                ))}
              </div>
            )}
            {stratBrainCid && <p className="text-emerald-400 break-all"><span style={{ color: 'var(--text-tertiary)' }}>0g brain: </span>0g://{stratBrainCid}</p>}
            {sessionState?.lastHcsTxId && <p className="break-all" style={{ color: 'var(--text-primary)' }}><span style={{ color: 'var(--text-tertiary)' }}>HCS: </span>{sessionState.lastHcsTxId}</p>}
            {sessionState?.htsTxId && <p className="break-all" style={{ color: 'var(--text-primary)' }}><span style={{ color: 'var(--text-tertiary)' }}>HTS: </span>{sessionState.htsTxId}</p>}
            {sessionState?.signature && <p className="break-all" style={{ color: 'var(--text-primary)' }}><span style={{ color: 'var(--text-tertiary)' }}>Signed by: </span>{sessionState.signerAddress}</p>}
            {!sessionState && <p style={{ color: 'var(--text-tertiary)' }}>Complete a run and approve a plan to see verification details.</p>}
          </div>
        </section>
      </div>

      {error && (
        <div className="mt-8 p-5 rounded-xl border border-red-500/20 bg-red-950/20 text-[0.9375rem] text-red-300 max-w-6xl">{error}</div>
      )}

      {plan && planHash && (
        <ApprovalModal plan={plan} planHash={planHash} alternatePlans={alternatePlans} onApprove={handleApprove} onReject={handleReject} signPlan={signPlan} isWalletConnected={!!(walletClient && address)} />
      )}
      <AgentDetailModal agentId={agentDetail} onClose={() => setAgentDetail(null)} />

      {showRiskModal && (
        <RiskSettingsModal current={riskSetting} onSave={(s) => setRiskSetting(s)} onClose={() => setShowRiskModal(false)} />
      )}
    </div>
  );
}
