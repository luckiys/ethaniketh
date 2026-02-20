'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { HoldingsInput } from '@/components/holdings-input';
import { AgentCard } from '@/components/agent-card';
import { AgentDetailModal } from '@/components/agent-detail-modal';
import { ApprovalModal } from '@/components/approval-modal';
import type { Holding, AgentEvent, StrategyPlan, AgentId } from '@aegisos/shared';
import { signApproval } from '@/lib/sign';

export default function RunPage() {
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
  const [stratBrainCid, setStratBrainCid] = useState<string | null>(null);
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
      setStratBrainCid(runData.stratBrainCid ?? null);
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
          body: JSON.stringify({
            approval: { planId: planSnapshot.planId, planHash, signature, signerAddress, timestamp: new Date().toISOString(), signatureTimestamp },
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Approval failed');
        const sessionRes = await fetch(`/api/session/${sessionId}`);
        const sessionData = await sessionRes.json();
        const newState = {
          htsTxId: sessionData.htsTxId,
          lastHcsTxId: sessionData.lastHcsTxId,
          signature,
          signerAddress,
          approvedPlanHash: hashToStore,
        };
        setSessionState((s) => ({ ...s, ...newState }));
        setStatus('executed');
        // Save completed session to localStorage for verification page
        try {
          const record = {
            id: sessionId,
            timestamp: new Date().toISOString(),
            goal,
            recommendation: planSnapshot.recommendation,
            riskScore: planSnapshot.riskScore,
            hcsTxId: sessionData.lastHcsTxId,
            htsTxId: sessionData.htsTxId,
            signerAddress,
          };
          const prev = JSON.parse(localStorage.getItem('aegisos-verifications') ?? '[]');
          localStorage.setItem('aegisos-verifications', JSON.stringify([record, ...prev].slice(0, 20)));
        } catch {}
      } catch (e) {
        setError(String(e));
      }
    },
    [sessionId, plan, planHash, goal]
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
    setStratBrainCid(null);
    setStatus('idle');
    setError(null);
  };

  const hasValidGoal = goal.trim().length > 0;
  const hasValidHoldings = holdings.some((h) => h.symbol?.trim() && (h.amount > 0 || (h.valueUsd ?? 0) > 0));

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-zinc-100">Run</h1>
      <p className="mt-1 text-zinc-500 text-sm">
        Describe your goal and let the agents propose a strategy. You approve every step.
      </p>

      {status === 'awaiting_approval' && plan && (
        <div className="mt-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-sm text-amber-200">Strategy ready — review and approve below</span>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-base font-medium text-zinc-100 mb-4">Session</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">What do you want to achieve?</label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe your goal in plain words..."
                rows={4}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-zinc-100 placeholder-zinc-500 text-sm outline-none focus:border-zinc-600 resize-none"
              />
            </div>
            <HoldingsInput holdings={holdings} onChange={setHoldings} disabled={!!sessionId} walletAddress={address} />
            <div className="flex gap-3 pt-2">
              <button
                onClick={startSession}
                disabled={status === 'starting' || !hasValidGoal || !hasValidHoldings}
                className="flex-1 py-3 rounded-md bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {status === 'starting' ? 'Running...' : 'Start & Run'}
              </button>
              {sessionId && status !== 'starting' && (
                <button
                  onClick={resetSession}
                  className="px-4 py-3 rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 text-sm font-medium transition-colors"
                >
                  New Session
                </button>
              )}
            </div>
          </div>
          {sessionId && sessionState && (
            <div className="mt-4 pt-4 border-t border-zinc-800 text-xs text-zinc-500 font-mono">
              Session: {sessionId.slice(0, 8)}... · HCS: {sessionState.hederaTopicId?.replace?.('mock-', '') ?? sessionState.hederaTopicId}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-base font-medium text-zinc-100 mb-1">Agents</h2>
          <p className="text-sm text-zinc-500 mb-4">Click an agent to learn what it does.</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:flex-wrap">
            <AgentCard
              agentId="watcher"
              status={agentStatus.watcher}
              nftId={sessionState?.agentNftIds?.watcher}
              lastOutput={(() => {
                const last = events.filter((e) => e.agentId === 'watcher').slice(-1)[0];
                const val = last?.payload?.portfolioValue;
                return val != null ? `Portfolio: $${Number(val).toLocaleString()}` : undefined;
              })()}
              onClick={() => setAgentDetail('watcher')}
            />
            <AgentCard
              agentId="strategist"
              status={agentStatus.strategist}
              nftId={sessionState?.agentNftIds?.strategist}
              lastOutput={plan ? `${plan.recommendation} (risk: ${plan.riskScore})` : undefined}
              onClick={() => setAgentDetail('strategist')}
            />
            <AgentCard
              agentId="executor"
              status={agentStatus.executor}
              nftId={sessionState?.agentNftIds?.executor}
              lastOutput={sessionState?.htsTxId ? `Tx: ${sessionState.htsTxId.slice(0, 20)}...` : undefined}
              onClick={() => setAgentDetail('executor')}
            />
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-base font-medium text-zinc-100 mb-2">Activity Log</h2>
          <div className="max-h-40 overflow-y-auto space-y-2 font-mono text-xs rounded-md border border-zinc-800 bg-zinc-950 p-3">
            {events.length === 0 ? (
              <p className="text-zinc-500">Events will appear here when you run a session.</p>
            ) : (
              events.map((e, i) => (
                <div key={i} className="flex gap-4 text-zinc-400 py-1.5 border-b border-zinc-800 last:border-0">
                  <span className="font-medium text-zinc-300 shrink-0">{e.type}</span>
                  <span>{e.agentId}</span>
                  <span className="ml-auto text-zinc-500">{new Date(e.timestamp).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-base font-medium text-zinc-100 mb-2">Verification</h2>
          <div className="space-y-2 text-xs font-mono rounded-md border border-zinc-800 bg-zinc-950 p-4">
            {/* iNFT agent identities — show as soon as session starts */}
            {sessionState?.agentNftIds && (
              <div className="space-y-1 pb-2 border-b border-zinc-800">
                <p className="text-zinc-500 font-sans">Agent iNFTs (Hedera HTS · 0g brain)</p>
                {(['watcher', 'strategist', 'executor'] as const).map((a) => (
                  <p key={a} className="text-zinc-400 truncate">
                    <span className="text-zinc-600">{a}: </span>{sessionState.agentNftIds![a]}
                  </p>
                ))}
              </div>
            )}
            {/* Strategy brain archived to 0g after strategist runs */}
            {stratBrainCid && (
              <p className="text-emerald-400 break-all">
                <span className="text-zinc-500">0g brain: </span>0g://{stratBrainCid}
              </p>
            )}
            {sessionState?.lastHcsTxId && (
              <p className="text-zinc-300 break-all">
                <span className="text-zinc-500">HCS: </span>{sessionState.lastHcsTxId}
              </p>
            )}
            {sessionState?.htsTxId && (
              <p className="text-zinc-300 break-all">
                <span className="text-zinc-500">HTS: </span>{sessionState.htsTxId}
              </p>
            )}
            {sessionState?.signature && (
              <p className="text-zinc-300 break-all">
                <span className="text-zinc-500">Signed by: </span>{sessionState.signerAddress}
              </p>
            )}
            {!sessionState && (
              <p className="text-zinc-500">Complete a run and approve a plan to see verification details.</p>
            )}
          </div>
        </section>
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-lg border border-red-900/50 bg-red-950/20 text-sm text-red-300">
          {error}
        </div>
      )}

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
      <AgentDetailModal agentId={agentDetail} onClose={() => setAgentDetail(null)} />
    </div>
  );
}
