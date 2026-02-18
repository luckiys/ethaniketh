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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100">
            <ShieldCheck className="h-5 w-5 text-neutral-700" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-900">Approve Strategy</h2>
        </div>
        <div className="space-y-5">
          <div>
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Recommendation</span>
            <p className="mt-1 font-medium text-neutral-900">{plan.recommendation}</p>
          </div>
          <div className="flex gap-6">
            <div>
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Risk Score</span>
              <p className="mt-1 font-semibold text-neutral-900">{plan.riskScore}/100</p>
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Worst Case</span>
            <p className="mt-1 text-sm text-neutral-600">{plan.worstCaseAnalysis}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Reasoning</span>
            <p className="mt-1 text-sm text-neutral-600">{plan.reasoning}</p>
          </div>
          {plan.actions.length > 0 && (
            <div>
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</span>
              <ul className="mt-2 space-y-1.5 text-sm text-neutral-600 font-mono">
                {plan.actions.map((a, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-neutral-400">→</span>
                    {a.type} {a.amount} {a.token} → {a.to}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-neutral-500 font-mono">Plan hash: {planHash.slice(0, 20)}...</p>
        </div>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleApprove}
            disabled={disabled || status === 'signing'}
            className="flex-1 py-4 rounded-full bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'signing' ? 'Approving...' : isWalletConnected ? 'Sign & Approve' : 'Approve (Demo)'}
          </button>
          <button
            onClick={onReject}
            disabled={disabled}
            className="flex-1 py-4 rounded-full border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Reject
          </button>
        </div>
        {!isWalletConnected && (
          <p className="text-xs text-neutral-500 text-center mt-4">
            Connect wallet for real EIP-712 signature. Demo mode uses placeholder.
          </p>
        )}
      </div>
    </div>
  );
}
