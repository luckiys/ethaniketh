'use client';

import { Eye, Brain, Zap, ChevronRight } from 'lucide-react';

type AgentId = 'watcher' | 'strategist' | 'executor';

const CONFIG: Record<AgentId, { label: string; desc: string; icon: typeof Eye }> = {
  watcher: {
    label: 'Watcher',
    desc: 'Monitors portfolio & market',
    icon: Eye,
  },
  strategist: {
    label: 'Strategist',
    desc: 'Assesses risk & proposes',
    icon: Brain,
  },
  executor: {
    label: 'Executor',
    desc: 'Executes approved plan',
    icon: Zap,
  },
};

interface AgentCardProps {
  agentId: AgentId;
  status: 'idle' | 'running' | 'done' | 'error';
  nftId?: string;
  lastOutput?: string;
  onClick?: () => void;
}

export function AgentCard({ agentId, status, nftId, lastOutput, onClick }: AgentCardProps) {
  const { label, desc, icon: Icon } = CONFIG[agentId];

  const statusConfig = {
    idle: { dot: 'bg-neutral-300', text: 'text-neutral-500' },
    running: { dot: 'bg-amber-500 animate-pulse', text: 'text-amber-600' },
    done: { dot: 'bg-emerald-500', text: 'text-emerald-600' },
    error: { dot: 'bg-red-500', text: 'text-red-600' },
  };

  const s = statusConfig[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full sm:w-auto sm:min-w-[200px] sm:flex-1 text-left rounded-2xl border border-neutral-200 bg-white p-6 hover:border-neutral-300 hover:shadow-sm transition-all duration-200 group"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-100">
              <Icon className="h-6 w-6 text-neutral-600" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-neutral-900 truncate">{label}</h4>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.text}`}>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                {status}
              </span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-neutral-400 group-hover:text-neutral-600 shrink-0" />
        </div>
        <p className="text-sm text-neutral-600 leading-relaxed break-words">{desc}</p>
        {lastOutput && (
          <p className="text-xs text-neutral-500 font-mono break-words line-clamp-2">{lastOutput}</p>
        )}
        {nftId && (
          <p className="text-xs text-neutral-400 font-mono">
            {nftId.includes('mock') ? 'Identity linked' : `iNFT: ${nftId.slice(0, 16)}...`}
          </p>
        )}
      </div>
    </button>
  );
}
