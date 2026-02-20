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
    idle: { dot: 'bg-zinc-500', text: 'text-zinc-500' },
    running: { dot: 'bg-amber-500 animate-pulse', text: 'text-amber-500' },
    done: { dot: 'bg-emerald-500', text: 'text-emerald-500' },
    error: { dot: 'bg-red-500', text: 'text-red-500' },
  };

  const s = statusConfig[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full sm:w-auto sm:min-w-[180px] sm:flex-1 text-left rounded-md border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors group"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-800">
              <Icon className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="min-w-0">
              <h4 className="font-medium text-zinc-200 text-sm truncate">{label}</h4>
              <span className={`inline-flex items-center gap-1 text-xs ${s.text}`}>
                <span className={`h-1 w-1 shrink-0 rounded-full ${s.dot}`} />
                {status}
              </span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-400 shrink-0" />
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed break-words">{desc}</p>
        {lastOutput && (
          <p className="text-xs text-zinc-500 font-mono break-words line-clamp-2">{lastOutput}</p>
        )}
        {nftId && (
          <p className="text-xs text-zinc-600 font-mono">
            {nftId.includes('mock') ? 'Identity linked' : `iNFT: ${nftId.slice(0, 16)}...`}
          </p>
        )}
      </div>
    </button>
  );
}
