'use client';

import Link from 'next/link';
import { Eye, Brain, Zap, ArrowRight, Shield, Activity, Lock, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

const AGENTS = [
  {
    icon: Eye,
    label: 'Watcher',
    accent: 'blue',
    tagline: 'Always watching. Never sleeping.',
    description:
      'Monitors your DeFi positions and market conditions in real time. Tracks holdings, fetches live prices, and identifies concentration risk.',
    capabilities: ['Live price tracking', 'Concentration alerts', 'Market regime detection', 'Fear & Greed index'],
  },
  {
    icon: Brain,
    label: 'Strategist',
    accent: 'violet',
    tagline: 'Thinks. Proposes. Never acts.',
    description:
      'Analyzes the Watcher\'s data against your goal. Recommends rebalance, hold, reduce risk, or increase exposure with clear reasoning.',
    capabilities: ['Goal-aware analysis', 'Risk scoring 0–100', 'Worst-case modeling', 'AI-powered reasoning'],
  },
  {
    icon: Zap,
    label: 'Executor',
    accent: 'emerald',
    tagline: 'Runs only when you sign.',
    description:
      'Executes the approved strategy step by step—only after you sign with EIP-712. Every action is logged on Hedera.',
    capabilities: ['EIP-712 signatures', 'Hedera audit trail', 'Token transfers', 'Schedule automation'],
  },
];

const STATS = [
  { label: 'Agents', value: '3', desc: 'Working together' },
  { label: 'Risk Factors', value: '5', desc: 'Analyzed per run' },
  { label: 'Approval', value: '100%', desc: 'Human controlled' },
  { label: 'On-chain', value: 'All', desc: 'Hedera verified' },
];

const accentMap = {
  blue: {
    gradient: 'from-blue-500/20 to-blue-600/5',
    border: 'hover:border-blue-500/30',
    activeBorder: 'border-blue-500/40',
    iconBg: 'bg-blue-500/10',
    icon: 'text-blue-400',
    tag: 'text-blue-400',
    dot: 'bg-blue-400',
    pill: 'bg-blue-500/10 text-blue-400',
  },
  violet: {
    gradient: 'from-violet-500/20 to-violet-600/5',
    border: 'hover:border-violet-500/30',
    activeBorder: 'border-violet-500/40',
    iconBg: 'bg-violet-500/10',
    icon: 'text-violet-400',
    tag: 'text-violet-400',
    dot: 'bg-violet-400',
    pill: 'bg-violet-500/10 text-violet-400',
  },
  emerald: {
    gradient: 'from-emerald-500/20 to-emerald-600/5',
    border: 'hover:border-emerald-500/30',
    activeBorder: 'border-emerald-500/40',
    iconBg: 'bg-emerald-500/10',
    icon: 'text-emerald-400',
    tag: 'text-emerald-400',
    dot: 'bg-emerald-400',
    pill: 'bg-emerald-500/10 text-emerald-400',
  },
};

export default function AppDashboard() {
  const [activeAgent, setActiveAgent] = useState(0);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] w-full">
      {/* Hero section */}
      <div className="w-full px-8 lg:px-12 xl:px-16 pt-10 lg:pt-14 pb-8">
        <div className="max-w-6xl">
          <div className="flex items-start justify-between gap-8 flex-wrap">
            <div className="flex-1 min-w-[300px]">
              <h1 className="text-[2.5rem] lg:text-[3rem] font-bold tracking-[-0.03em] leading-[1.1]"
                style={{ color: 'var(--text-primary)' }}>
                Dashboard
              </h1>
              <p className="mt-3 text-lg leading-relaxed max-w-xl" style={{ color: 'var(--text-secondary)' }}>
                Three AI agents analyze, recommend, and execute — but only when you give the green light.
                Every decision is yours.
              </p>
            </div>

            {/* Quick stats */}
            <div className="flex gap-3 flex-wrap">
              {STATS.map((stat) => (
                <div key={stat.label} className="rounded-xl border px-4 py-3 min-w-[100px] transition-all duration-200"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{stat.value}</div>
                  <div className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="w-full px-8 lg:px-12 xl:px-16 pb-10">
        <Link
          href="/app/run"
          className="group block relative overflow-hidden rounded-2xl border transition-all duration-300 ease-out max-w-6xl"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.06] via-violet-500/[0.03] to-emerald-500/[0.06] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center gap-6 p-6 lg:p-8">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-all duration-300"
              style={{ background: 'var(--bg-card-hover)' }}>
              <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform duration-300"
                style={{ color: 'var(--accent-blue)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
                Start a new run
              </h2>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Describe your investment goal, add your holdings, and let the agents propose a risk-adjusted strategy.
              </p>
            </div>
            <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300"
              style={{ borderColor: 'var(--border)' }}>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-all duration-300"
                style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>
        </Link>
      </div>

      {/* Agent showcase — interactive tabs */}
      <div className="w-full px-8 lg:px-12 xl:px-16 pb-12 flex-1">
        <div className="max-w-6xl">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
              How it works
            </p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
              Three agents. One flow. You approve every step.
            </h2>
          </div>

          {/* Agent selector tabs */}
          <div className="flex gap-2 mb-6">
            {AGENTS.map((agent, i) => {
              const a = accentMap[agent.accent as keyof typeof accentMap];
              const isActive = i === activeAgent;
              return (
                <button
                  key={agent.label}
                  onClick={() => setActiveAgent(i)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                    isActive ? a.activeBorder : 'border-transparent'
                  }`}
                  style={{
                    background: isActive ? 'var(--bg-card)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  }}
                >
                  <agent.icon className={`h-4 w-4 ${isActive ? a.icon : ''}`} strokeWidth={1.75} />
                  {agent.label}
                </button>
              );
            })}
          </div>

          {/* Active agent detail card */}
          {(() => {
            const agent = AGENTS[activeAgent];
            const a = accentMap[agent.accent as keyof typeof accentMap];
            return (
              <div
                className="rounded-2xl border overflow-hidden transition-all duration-300"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                <div className={`relative bg-gradient-to-br ${a.gradient} px-8 py-8`}>
                  <div className="flex items-start gap-5">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${a.iconBg}`}>
                      <agent.icon className={`h-7 w-7 ${a.icon}`} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${a.tag}`}>
                        {agent.tagline}
                      </p>
                      <h3 className="mt-1 text-2xl font-bold tracking-[-0.02em]"
                        style={{ color: 'var(--text-primary)' }}>
                        {agent.label}
                      </h3>
                      <p className="mt-3 text-[0.9375rem] leading-relaxed max-w-2xl"
                        style={{ color: 'var(--text-secondary)' }}>
                        {agent.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-6 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] mb-3"
                    style={{ color: 'var(--text-muted)' }}>
                    Capabilities
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.map((cap) => (
                      <span key={cap} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${a.pill}`}>
                        <CheckCircle2 className="h-3 w-3" />
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Trust badges */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: 'Non-custodial', desc: 'Your keys never leave your wallet. Mudra reads balances — never takes custody.' },
              { icon: Activity, title: 'On-chain audit', desc: 'Every recommendation and execution is logged immutably on Hedera Consensus Service.' },
              { icon: Lock, title: 'Human-in-the-loop', desc: 'No autonomous trading. Your EIP-712 signature is the only trigger for execution.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border p-5 transition-all duration-200"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="h-4 w-4" style={{ color: 'var(--accent-emerald)' }} strokeWidth={1.75} />
                  <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h4>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
