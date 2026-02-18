'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { WalletConnect } from '@/components/wallet-connect';
import { HoldingsInput } from '@/components/holdings-input';
import { AgentCard } from '@/components/agent-card';
import { ApprovalModal } from '@/components/approval-modal';
import type { Holding, AgentEvent, StrategyPlan } from '@aegisos/shared';
import { signApproval } from '@/lib/sign';
import { Activity, Shield, FileCheck } from 'lucide-react';

const HEDERA_EXPLORER = 'https://hashscan.io/testnet/transaction';

export default function Home() {
  const [goal, setGoal] = useState('Maximize yield while keeping risk low');
  const [holdings, setHoldings] = useState<Holding[]>([{ symbol: 'ETH', amount: 1, valueUsd: 2500 }]);
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
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'awaiting_approval' | 'executed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

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
    if (status === 'awaiting_approval') {
      return { watcher: 'done', strategist: 'done', executor: 'idle' };
    }
    if (status === 'executed') {
      return { watcher: 'done', strategist: 'done', executor: 'done' };
    }
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
    const interval = status === 'starting' || status === 'running' || status === 'awaiting_approval' ? 400 : 1000;
    const id = setInterval(poll, interval);
    return () => clearInterval(id);
  }, [sessionId, status]);

  const startSession = useCallback(async () => {
    setStatus('starting');
    setError(null);
    setEvents([]);
    setPlan(null);
    setPlanHash(null);
    const validHoldings = holdings.filter((h) => h.symbol?.trim() && (h.amount > 0 || (h.valueUsd ?? 0) > 0));
    if (validHoldings.length === 0) {
      setError('Add at least one holding with symbol and amount or value');
      setStatus('idle');
      return;
    }
    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goal.trim(),
          holdings: validHoldings,
          walletAddress: address,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start');
      setSessionId(data.sessionId);
      setSessionState({
        hederaTopicId: data.hederaTopicId,
        agentNftIds: data.agentNftIds,
      });
      setStatus('running');

      const runRes = await fetch(`/api/session/${data.sessionId}/run`, {
        method: 'POST',
      });
      const runData = await runRes.json();
      if (!runRes.ok) throw new Error(runData.error || 'Failed to run');
      setPlan(runData.plan);
      setPlanHash(runData.planHash ?? null);
      const sessionRes = await fetch(`/api/session/${data.sessionId}`);
      const sessionData = await sessionRes.json();
      setSessionState((s) => ({ ...s, ...sessionData }));
      setStatus(runData.plan ? 'awaiting_approval' : 'running');
    } catch (e) {
      setError(String(e));
      setStatus('error');
    }
  }, [goal, holdings, address]);

  const handleApprove = useCallback(
    async (signature: string, signerAddress: string) => {
      if (!sessionId || !plan || !planHash) return;
      const hashToStore = planHash;
      setPlan(null);
      setPlanHash(null);
      try {
        const res = await fetch(`/api/session/${sessionId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            approval: {
              planId: plan.planId,
              planHash,
              signature,
              signerAddress,
              timestamp: new Date().toISOString(),
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Approval failed');
        const sessionRes = await fetch(`/api/session/${sessionId}`);
        const sessionData = await sessionRes.json();
        setSessionState((s) => ({
          ...s,
          htsTxId: sessionData.htsTxId,
          lastHcsTxId: sessionData.lastHcsTxId,
          signature,
          signerAddress,
          approvedPlanHash: hashToStore,
        }));
        setStatus('executed');
      } catch (e) {
        setError(String(e));
      }
    },
    [sessionId, plan, planHash]
  );

  const handleReject = useCallback(async () => {
    if (!sessionId) return;
    await fetch(`/api/session/${sessionId}/reject`, { method: 'POST' });
    setPlan(null);
    setPlanHash(null);
    setStatus('idle');
  }, [sessionId]);

  const signPlan = useCallback(
    async (hash: string) => {
      if (!walletClient || !address) throw new Error('Connect wallet to sign');
      const BASE_CHAIN_ID = 8453;
      if (chain?.id !== BASE_CHAIN_ID && switchChainAsync) {
        await switchChainAsync({ chainId: BASE_CHAIN_ID });
      }
      return signApproval(walletClient, address, plan!.planId, hash);
    },
    [walletClient, address, plan, chain?.id, switchChainAsync]
  );

  const resetSession = () => {
    setSessionId(null);
    setSessionState(null);
    setEvents([]);
    setPlan(null);
    setPlanHash(null);
    setStatus('idle');
    setError(null);
  };

  return (
    <div className="min-h-screen w-full bg-grid-pattern flex flex-col items-center">
      <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Awaiting approval banner */}
        {status === 'awaiting_approval' && plan && (
          <div className="mb-6 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-cyan-200 font-medium">Strategy ready — review and approve below</span>
            </div>
          </div>
        )}

        {/* Header - centered layout */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8 w-full">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              AegisOS
            </h1>
            <p className="mt-2 text-slate-400 text-lg">AI advises, humans decide, blockchain verifies.</p>
          </div>
          <WalletConnect />
        </header>

        {/* Main grid - centered, equal columns */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8 w-full">
          {/* Session card */}
          <section className="glass-card rounded-2xl p-6 shadow-glow">
            <h2 className="text-lg font-semibold mb-5 text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-400" />
              Session
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Goal</label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Maximize yield while keeping risk low"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-colors"
                />
              </div>
              <HoldingsInput holdings={holdings} onChange={setHoldings} disabled={!!sessionId} />
              <div className="flex gap-3 pt-2">
                <button
                  onClick={startSession}
                  disabled={status === 'starting' || !goal.trim() || holdings.length === 0 || !holdings.some((h) => h.symbol && (h.amount > 0 || (h.valueUsd ?? 0) > 0))}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20"
                >
                  {status === 'starting' ? 'Running...' : 'Start & Run'}
                </button>
                {sessionId && status !== 'starting' && (
                  <button
                    onClick={resetSession}
                    className="px-5 py-3.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
                  >
                    New Session
                  </button>
                )}
              </div>
            </div>
            {sessionId && sessionState && (
              <div className="mt-5 pt-5 border-t border-white/10 space-y-1.5 text-xs text-slate-500 font-mono">
                <p>Session: {sessionId.slice(0, 8)}...</p>
                <p>HCS: {sessionState.hederaTopicId?.replace?.('mock-', '') ?? sessionState.hederaTopicId}</p>
              </div>
            )}
          </section>

          {/* Agents card */}
          <section className="glass-card rounded-2xl p-6 shadow-glow">
            <h2 className="text-lg font-semibold mb-5 text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-400" />
              Agents
            </h2>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 w-full">
              <AgentCard
                agentId="watcher"
                status={agentStatus.watcher}
                nftId={sessionState?.agentNftIds?.watcher}
                lastOutput={(() => {
                  const last = events.filter((e) => e.agentId === 'watcher').slice(-1)[0];
                  const val = last?.payload?.portfolioValue;
                  return val != null ? `Portfolio: $${Number(val).toLocaleString()}` : undefined;
                })()}
              />
              <AgentCard
                agentId="strategist"
                status={agentStatus.strategist}
                nftId={sessionState?.agentNftIds?.strategist}
                lastOutput={plan ? `${plan.recommendation} (risk: ${plan.riskScore})` : undefined}
              />
              <AgentCard
                agentId="executor"
                status={agentStatus.executor}
                nftId={sessionState?.agentNftIds?.executor}
                lastOutput={sessionState?.htsTxId ? `Tx: ${sessionState.htsTxId.slice(0, 20)}...` : undefined}
              />
            </div>
          </section>
        </div>

        {/* Timeline + Proof - side by side on large screens */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8 w-full">
          <section className="glass-card rounded-2xl p-6 shadow-glow w-full">
            <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-400 shrink-0" />
              Live Timeline
            </h2>
            <div className="max-h-44 overflow-y-auto space-y-2 font-mono text-sm rounded-xl bg-white/[0.02] border border-white/5 p-4">
              {events.length === 0 && (
                <p className="text-slate-500 flex items-center gap-2">
                  <span className="text-slate-600">●</span> Events will appear here when you run a session...
                </p>
              )}
              {events.map((e, i) => (
                <div key={i} className="flex gap-4 text-slate-400 py-1">
                  <span className="text-cyan-400 font-medium shrink-0">{e.type}</span>
                  <span className="text-slate-500">{e.agentId}</span>
                  <span className="text-slate-600 ml-auto">{new Date(e.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card rounded-2xl p-6 shadow-glow w-full">
          <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-cyan-400" />
            Proof
          </h2>
          <div className="space-y-3 text-sm font-mono rounded-xl bg-white/[0.02] border border-white/5 p-4">
            {sessionState?.lastHcsTxId && (
              <p className="text-slate-400">
                HCS: <span className="text-slate-300">{sessionState.lastHcsTxId}</span>
                {(sessionState.lastHcsTxId.startsWith('0.0.') || sessionState.lastHcsTxId.includes('@')) && (
                  <a href={`${HEDERA_EXPLORER}/${sessionState.lastHcsTxId}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-cyan-400 hover:text-cyan-300 transition-colors">
                    View →
                  </a>
                )}
              </p>
            )}
            {sessionState?.htsTxId && (
              <p className="text-slate-400">
                HTS: <span className="text-slate-300">{sessionState.htsTxId}</span>
              </p>
            )}
            {sessionState?.approvedPlanHash && sessionState?.signature && (
              <p className="text-slate-400">
                Plan hash: {sessionState.approvedPlanHash} | Signed by {sessionState.signerAddress}
              </p>
            )}
            {!sessionState?.lastHcsTxId && !sessionState?.htsTxId && !sessionState?.signature && (
              <p className="text-slate-500 flex items-center gap-2">
                <span className="text-slate-600">●</span> Complete a run to see proof...
              </p>
            )}
          </div>
          </section>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400 flex items-center gap-3">
            <span className="text-red-500">!</span>
            {error}
          </div>
        )}
      </div>

      {plan && planHash && (
        <ApprovalModal
          plan={plan}
          planHash={planHash}
          onApprove={handleApprove}
          onReject={handleReject}
          signPlan={signPlan}
          isWalletConnected={!!(walletClient && address)}
        />
      )}
    </div>
  );
}
