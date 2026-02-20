'use client';

import { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import type { StrategyPlan } from '@aegisos/shared';

interface ApprovalModalProps {
  plan: StrategyPlan;
  planHash: string;
  onApprove: (signature: string, signerAddress: string) => void;
  onReject: () => void;
  disabled?: boolean;
  signPlan: (planHash: string) => Promise<{ signature: string; address: string }>;
  isWalletConnected?: boolean;
}

export function ApprovalModal({
  plan,
  planHash,
  onApprove,
  onReject,
  disabled,
  signPlan,
  isWalletConnected = false,
}: ApprovalModalProps) {
  const [status, setStatus] = useState<'idle' | 'signing' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setStatus('signing');
    setError(null);
    try {
      if (isWalletConnected) {
        const { signature, address } = await signPlan(planHash);
        onApprove(signature, address);
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
      <div className="w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-800">
            <ShieldCheck className="h-4 w-4 text-zinc-400" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">Approve Strategy</h2>
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Recommendation</span>
            <p className="mt-0.5 font-medium text-zinc-200">{plan.recommendation}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Risk Score</span>
            <p className="mt-0.5 font-medium text-zinc-200">{plan.riskScore}/100</p>
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Worst Case</span>
            <p className="mt-0.5 text-zinc-400">{plan.worstCaseAnalysis}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Reasoning</span>
            <p className="mt-0.5 text-zinc-400">{plan.reasoning}</p>
          </div>
          {plan.actions.length > 0 && (
            <div>
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</span>
              <ul className="mt-1.5 space-y-1 text-zinc-400 font-mono">
                {plan.actions.map((a, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-zinc-500">→</span>
                    {a.type} {a.amount} {a.token} → {a.to}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-zinc-600 font-mono">Plan hash: {planHash.slice(0, 20)}...</p>
        </div>
        {error && (
          <div className="mt-4 rounded-md border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-400">{error}</div>
        )}
        <div className="mt-5 flex gap-3">
          <button
            onClick={handleApprove}
            disabled={disabled || status === 'signing'}
            className="flex-1 py-3 rounded-md bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'signing' ? 'Approving...' : isWalletConnected ? 'Sign & Approve' : 'Approve (Demo)'}
          </button>
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
          <p className="text-xs text-zinc-500 text-center mt-4">
            Connect wallet for real EIP-712 signature. Demo mode uses placeholder.
          </p>
        )}
      </div>
    </div>
  );
}
