'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { WalletConnect } from '@/components/wallet-connect';
import { HoldingsInput } from '@/components/holdings-input';
import { AgentCard } from '@/components/agent-card';
import { AgentDetailModal } from '@/components/agent-detail-modal';
import { ApprovalModal } from '@/components/approval-modal';
import type { Holding, AgentEvent, StrategyPlan, AgentId } from '@aegisos/shared';
import { signApproval } from '@/lib/sign';
import Link from 'next/link';

const HEDERA_EXPLORER = 'https://hashscan.io/testnet/transaction';

export default function AppPage() {
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
    if (!trimmed) {
      setError('Describe your goal in plain words.');
      return;
    }
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
        body: JSON.stringify({ goal: trimmed, holdings: validHoldings, walletAddress: address }),
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
            approval: { planId: plan.planId, planHash, signature, signerAddress, timestamp: new Date().toISOString() },
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Approval failed');
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
      if (chain?.id !== BASE_CHAIN_ID && switchChainAsync) await switchChainAsync({ chainId: BASE_CHAIN_ID });
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

  const hasValidGoal = goal.trim().length > 0;
  const hasValidHoldings = holdings.some((h) => h.symbol?.trim() && (h.amount > 0 || (h.valueUsd ?? 0) > 0));

  return (
    <div className="min-h-screen w-full bg-[#fafafa]">
      <div className="w-full max-w-4xl mx-auto px-6 sm:px-8 py-12 sm:py-16">
        <Link href="/" className="inline-block mb-8 text-neutral-600 hover:text-neutral-900 text-sm font-medium">
          ← Back to home
        </Link>
        {status === 'awaiting_approval' && plan && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-amber-800 font-medium">Strategy ready — review and approve below</span>
          </div>
        )}

        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-16">
          <div>
            <h1 className="text-4xl sm:text-5xl font-semibold text-neutral-900 tracking-tight">AegisOS</h1>
            <p className="mt-2 text-lg text-neutral-600">AI advises, humans decide, blockchain verifies.</p>
          </div>
          <WalletConnect />
        </header>

        <div className="grid gap-8 lg:grid-cols-2 mb-12">
          <section className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-900 mb-6">Session</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">What do you want to achieve?</label>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Describe your goal in plain words..."
                  rows={4}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 placeholder-neutral-400 outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 resize-none"
                />
              </div>
              <HoldingsInput holdings={holdings} onChange={setHoldings} disabled={!!sessionId} walletAddress={address} />
              <div className="flex gap-3 pt-2">
                <button
                  onClick={startSession}
                  disabled={status === 'starting' || !hasValidGoal || !hasValidHoldings}
                  className="flex-1 py-4 rounded-full bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {status === 'starting' ? 'Running...' : 'Start & Run'}
                </button>
                {sessionId && status !== 'starting' && (
                  <button onClick={resetSession} className="px-6 py-4 rounded-full border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 font-medium transition-colors">
                    New Session
                  </button>
                )}
              </div>
            </div>
            {sessionId && sessionState && (
              <div className="mt-6 pt-6 border-t border-neutral-100 text-xs text-neutral-500 font-mono">
                Session: {sessionId.slice(0, 8)}... · HCS: {sessionState.hederaTopicId?.replace?.('mock-', '') ?? sessionState.hederaTopicId}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Agents</h2>
            <p className="text-sm text-neutral-600 mb-6">Click an agent to learn what it does.</p>
            <div className="flex flex-col sm:flex-row gap-4 sm:flex-wrap sm:justify-center">
              <AgentCard agentId="watcher" status={agentStatus.watcher} nftId={sessionState?.agentNftIds?.watcher} lastOutput={(() => { const last = events.filter((e) => e.agentId === 'watcher').slice(-1)[0]; const val = last?.payload?.portfolioValue; return val != null ? `Portfolio: $${Number(val).toLocaleString()}` : undefined; })()} onClick={() => setAgentDetail('watcher')} />
              <AgentCard agentId="strategist" status={agentStatus.strategist} nftId={sessionState?.agentNftIds?.strategist} lastOutput={plan ? `${plan.recommendation} (risk: ${plan.riskScore})` : undefined} onClick={() => setAgentDetail('strategist')} />
              <AgentCard agentId="executor" status={agentStatus.executor} nftId={sessionState?.agentNftIds?.executor} lastOutput={sessionState?.htsTxId ? `Tx: ${sessionState.htsTxId.slice(0, 20)}...` : undefined} onClick={() => setAgentDetail('executor')} />
            </div>
          </section>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 mb-12">
          <section className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Activity Log</h2>
            <div className="max-h-48 overflow-y-auto space-y-2 font-mono text-sm rounded-xl border border-neutral-100 bg-neutral-50/50 p-4">
              {events.length === 0 ? <p className="text-neutral-500">Events will appear here when you run a session.</p> : events.map((e, i) => (
                <div key={i} className="flex gap-4 text-neutral-600 py-2 border-b border-neutral-100 last:border-0">
                  <span className="font-medium text-neutral-800 shrink-0">{e.type}</span>
                  <span>{e.agentId}</span>
                  <span className="ml-auto text-neutral-500">{new Date(e.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Verification</h2>
            <div className="space-y-4 text-sm font-mono rounded-xl border border-neutral-100 bg-neutral-50/50 p-5">
              {sessionState?.lastHcsTxId && <p className="text-neutral-700">HCS: {sessionState.lastHcsTxId}</p>}
              {sessionState?.htsTxId && <p className="text-neutral-700">HTS: {sessionState.htsTxId}</p>}
              {sessionState?.signature && <p className="text-neutral-700 break-all">Signed by {sessionState.signerAddress}</p>}
              {!sessionState?.lastHcsTxId && !sessionState?.htsTxId && !sessionState?.signature && <p className="text-neutral-500">Complete a run and approve a plan to see verification details.</p>}
            </div>
          </section>
        </div>

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
      </div>

      {plan && planHash && <ApprovalModal plan={plan} planHash={planHash} onApprove={handleApprove} onReject={handleReject} signPlan={signPlan} isWalletConnected={!!(walletClient && address)} />}
      <AgentDetailModal agentId={agentDetail} onClose={() => setAgentDetail(null)} />
    </div>
  );
}
