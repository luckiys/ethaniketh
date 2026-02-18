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
    idle: { dot: 'bg-slate-500/80', text: 'text-slate-400', border: 'border-slate-600/60' },
    running: { dot: 'bg-cyan-400 animate-pulse', text: 'text-cyan-400', border: 'border-cyan-500/40' },
    done: { dot: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    error: { dot: 'bg-red-400', text: 'text-red-400', border: 'border-red-500/40' },
  };

  const s = statusConfig[status];

  return (
    <div
      className={`min-w-[220px] rounded-2xl border p-5 transition-all duration-300 bg-gradient-to-br ${color} ${s.border} hover:border-opacity-60`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/5">
            <Icon className="h-5 w-5 text-slate-400" />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-white truncate">{label}</h4>
            <span className={`inline-flex items-center gap-1.5 text-xs ${s.text}`}>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
              <span>{status}</span>
            </span>
          </div>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
        {lastOutput && (
          <p className="text-xs text-slate-300 font-mono break-words line-clamp-2">{lastOutput}</p>
        )}
        {nftId && (
          <p className="text-xs text-slate-500 font-mono">
            {nftId.includes('mock') ? 'Identity linked' : `iNFT: ${nftId.slice(0, 16)}...`}
          </p>
        )}
      </div>
    </div>
  );
}
