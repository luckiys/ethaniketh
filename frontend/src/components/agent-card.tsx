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
    idle:    { dot: 'bg-zinc-500',                   text: 'text-zinc-500',   label: 'Idle',     icon: 'text-zinc-500',   iconBg: 'bg-zinc-500/10', border: '' },
    running: { dot: 'bg-amber-500 animate-pulse',    text: 'text-amber-400',  label: 'Running',  icon: 'text-amber-400',  iconBg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    done:    { dot: 'bg-emerald-500',                text: 'text-emerald-400',label: 'Complete', icon: 'text-emerald-400',iconBg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    error:   { dot: 'bg-red-500',                    text: 'text-red-400',    label: 'Error',    icon: 'text-red-400',    iconBg: 'bg-red-500/10', border: 'border-red-500/30' },
  };

  const s = statusConfig[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full sm:w-auto sm:min-w-[200px] sm:flex-1 text-left rounded-xl border p-5 transition-all duration-200 group ${s.border}`}
      style={{
        background: 'var(--bg-card)',
        borderColor: s.border ? undefined : 'var(--border)',
      }}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${s.iconBg}`}>
              <Icon className={`h-4 w-4 transition-colors ${s.icon}`} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-[0.9375rem] truncate tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>{label}</h4>
              <span className={`inline-flex items-center gap-1.5 text-[0.75rem] ${s.text}`}>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                {s.label}
              </span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-all shrink-0" style={{ color: 'var(--text-muted)' }} />
        </div>
        <p className="text-[0.8125rem] leading-relaxed break-words" style={{ color: 'var(--text-tertiary)' }}>{desc}</p>
        {lastOutput && (
          <p className={`text-[0.75rem] font-mono break-words line-clamp-2 ${status === 'done' ? 'text-emerald-400/80' : ''}`}
            style={status !== 'done' ? { color: 'var(--text-tertiary)' } : undefined}>{lastOutput}</p>
        )}
        {nftId && (
          <p className="text-[0.6875rem] font-mono" style={{ color: 'var(--text-muted)' }}>
            {nftId.includes('mock') ? 'Identity linked' : `iNFT: ${nftId.slice(0, 16)}...`}
          </p>
        )}
      </div>
    </button>
  );
}
