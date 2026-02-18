'use client';

import { Eye, Brain, Zap } from 'lucide-react';

type AgentId = 'watcher' | 'strategist' | 'executor';

const CONFIG: Record<AgentId, { label: string; desc: string; icon: typeof Eye; color: string }> = {
  watcher: {
    label: 'Watcher',
    desc: 'Monitors portfolio & market',
    icon: Eye,
    color: 'from-cyan-500/20 to-cyan-600/5',
  },
  strategist: {
    label: 'Strategist',
    desc: 'Assesses risk & proposes',
    icon: Brain,
    color: 'from-violet-500/20 to-violet-600/5',
  },
  executor: {
    label: 'Executor',
    desc: 'Executes approved plan',
    icon: Zap,
    color: 'from-amber-500/20 to-amber-600/5',
  },
};

interface AgentCardProps {
  agentId: AgentId;
  status: 'idle' | 'running' | 'done' | 'error';
  nftId?: string;
  lastOutput?: string;
}

export function AgentCard({ agentId, status, nftId, lastOutput }: AgentCardProps) {
  const { label, desc, icon: Icon, color } = CONFIG[agentId];

  const statusConfig = {
    idle: {
      dot: 'bg-slate-500/80',
      text: 'text-slate-400',
      border: 'border-slate-600/60',
    },
    running: {
      dot: 'bg-cyan-400 animate-pulse',
      text: 'text-cyan-400',
      border: 'border-cyan-500/40',
    },
    done: {
      dot: 'bg-emerald-400',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
    },
    error: {
      dot: 'bg-red-400',
      text: 'text-red-400',
      border: 'border-red-500/40',
    },
  };

  const s = statusConfig[status];

  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-300 bg-gradient-to-br ${color} ${s.border} hover:border-opacity-60`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/5">
          <Icon className="h-6 w-6 text-slate-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-white">{label}</h4>
            <span className={`inline-flex items-center gap-1.5 text-xs ${s.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {status}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-400">{desc}</p>
          {lastOutput && (
            <p className="mt-3 text-xs text-slate-300 line-clamp-2 font-mono">{lastOutput}</p>
          )}
          {nftId && (
            <p className="mt-2 text-[11px] text-slate-500 font-mono whitespace-nowrap overflow-hidden text-ellipsis" title={nftId}>
              {nftId.includes('mock') ? 'Identity linked' : `iNFT: ${nftId.slice(0, 16)}...`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
