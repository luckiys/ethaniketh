'use client';

import { useEffect } from 'react';
import { Eye, Brain, Zap, X } from 'lucide-react';

type AgentId = 'watcher' | 'strategist' | 'executor';

const DETAILS: Record<AgentId, { label: string; icon: typeof Eye; description: string; bullets: string[] }> = {
  watcher: {
    label: 'Watcher',
    icon: Eye,
    description: 'The Watcher continuously monitors your portfolio and market conditions.',
    bullets: [
      'Tracks your holdings and their current values',
      'Fetches live prices from trusted sources',
      'Identifies concentration risk and market regime',
      'Surfaces alerts (e.g. single asset >50%, volatile conditions)',
      'Feeds clean data to the Strategist for decision-making',
    ],
  },
  strategist: {
    label: 'Strategist',
    icon: Brain,
    description: 'The Strategist analyzes the Watcher’s data and proposes a plan—never executes.',
    bullets: [
      'Evaluates risk based on your goal and holdings',
      'Recommends actions: rebalance, hold, reduce risk, or increase exposure',
      'Provides worst-case analysis and reasoning',
      'Scores risk from 0–100 so you can decide',
      'Waits for your explicit approval before anything happens',
    ],
  },
  executor: {
    label: 'Executor',
    icon: Zap,
    description: 'The Executor runs only after you sign and approve the plan.',
    bullets: [
      'Executes the approved strategy step by step',
      'Logs every action to Hedera for verification',
      'Never acts without your signed approval',
      'Records the transaction on-chain for transparency',
      'You stay in control—AI advises, you decide',
    ],
  },
};

interface AgentDetailModalProps {
  agentId: AgentId | null;
  onClose: () => void;
}

export function AgentDetailModal({ agentId, onClose }: AgentDetailModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!agentId) return null;

  const { label, icon: Icon, description, bullets } = DETAILS[agentId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-detail-title"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-800">
            <Icon className="h-5 w-5 text-zinc-400" />
          </div>
          <h2 id="agent-detail-title" className="text-lg font-semibold text-zinc-100">
            {label}
          </h2>
        </div>
        <p className="mb-4 text-sm text-zinc-400 leading-relaxed">{description}</p>
        <ul className="space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-zinc-400">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
