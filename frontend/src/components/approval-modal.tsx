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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-xl rounded-2xl border border-cyan-500/20 bg-[#0f1624] p-6 shadow-2xl shadow-cyan-500/10 ring-1 ring-white/5">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck className="h-6 w-6 text-cyan-400" />
          <h2 className="text-xl font-semibold text-white">Approve Strategy</h2>
        </div>
        <div className="space-y-5">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Recommendation</span>
            <p className="mt-1 font-medium text-white">{plan.recommendation}</p>
          </div>
          <div className="flex gap-6">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Risk Score</span>
              <p className="mt-1 font-semibold text-cyan-400">{plan.riskScore}/100</p>
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Worst Case</span>
            <p className="mt-1 text-sm text-slate-300">{plan.worstCaseAnalysis}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Reasoning</span>
            <p className="mt-1 text-sm text-slate-300">{plan.reasoning}</p>
          </div>
          {plan.actions.length > 0 && (
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</span>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
                {plan.actions.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 font-mono">
                    <span className="text-cyan-400">→</span>
                    {a.type} {a.amount} {a.token} → {a.to}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-slate-500 font-mono">Plan hash: {planHash.slice(0, 20)}...</p>
        </div>
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleApprove}
            disabled={disabled || status === 'signing'}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20"
          >
            {status === 'signing' ? 'Approving...' : isWalletConnected ? 'Sign & Approve' : 'Approve (Demo)'}
          </button>
          <button
            onClick={onReject}
            disabled={disabled}
            className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <X className="h-4 w-4" />
            Reject
          </button>
        </div>
        {!isWalletConnected && (
          <p className="text-xs text-slate-500 text-center mt-4">
            Connect wallet for real EIP-712 signature. Demo mode uses placeholder.
          </p>
        )}
      </div>
    </div>
  );
}
