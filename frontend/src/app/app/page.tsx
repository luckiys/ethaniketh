'use client';

import Link from 'next/link';
import { Eye, Brain, Zap, ArrowRight } from 'lucide-react';

const AGENTS = [
  {
    icon: Eye,
    label: 'Watcher',
    accent: 'blue',
    tagline: 'Always watching. Never sleeping.',
    description:
      'Monitors your DeFi positions and market conditions in real time. Tracks holdings, fetches live prices, and identifies concentration risk. Surfaces alerts—single-asset dominance, volatile conditions—before you need to ask. Feeds clean data to the Strategist.',
  },
  {
    icon: Brain,
    label: 'Strategist',
    accent: 'violet',
    tagline: 'Thinks. Proposes. Never acts.',
    description:
      'Analyzes the Watcher’s data against your goal. Recommends rebalance, hold, reduce risk, or increase exposure. Scores risk 0–100 with worst-case analysis and clear reasoning. Waits for your explicit approval. AI-powered insight, human judgment.',
  },
  {
    icon: Zap,
    label: 'Executor',
    accent: 'emerald',
    tagline: 'Runs only when you sign.',
    description:
      'Executes the approved strategy step by step—swaps, stakes, transfers—only after you sign with EIP-712. Every action is logged on Hedera. No autonomous trading. No surprise transactions. You stay in control; the chain verifies.',
  },
];

const accentStyles = {
  blue: {
    icon: 'text-blue-400',
    iconBg: 'bg-blue-500/[0.08]',
    tagline: 'text-blue-400/90',
    border: 'border-blue-500/10',
    hoverBorder: 'group-hover:border-blue-500/20',
  },
  violet: {
    icon: 'text-violet-400',
    iconBg: 'bg-violet-500/[0.08]',
    tagline: 'text-violet-400/90',
    border: 'border-violet-500/10',
    hoverBorder: 'group-hover:border-violet-500/20',
  },
  emerald: {
    icon: 'text-emerald-400',
    iconBg: 'bg-emerald-500/[0.08]',
    tagline: 'text-emerald-400/90',
    border: 'border-emerald-500/10',
    hoverBorder: 'group-hover:border-emerald-500/20',
  },
};

export default function AppDashboard() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 px-8 lg:px-16 py-10 lg:py-14 max-w-4xl">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-[2rem] lg:text-[2.25rem] font-semibold text-zinc-50 tracking-[-0.02em] leading-tight">
            Dashboard
          </h1>
          <p className="mt-2 text-[1rem] text-zinc-500 leading-relaxed max-w-lg">
            Three agents work together to analyze, recommend, and execute—only when you approve. Start a run to begin.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="mb-14">
          <Link
            href="/app/run"
            className="group block relative overflow-hidden rounded-2xl bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700/80 transition-all duration-300 ease-out"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="relative flex items-center gap-5 p-6 lg:p-8">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800/60 group-hover:bg-blue-500/10 transition-colors duration-300">
                <ArrowRight className="h-5 w-5 text-zinc-400 group-hover:text-blue-400 transition-colors duration-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[1.125rem] font-semibold text-zinc-50 tracking-[-0.01em]">
                  Start a run
                </h2>
                <p className="mt-1 text-[0.9375rem] text-zinc-500 leading-relaxed">
                  Describe your goal, add holdings, and let the Strategist propose a plan. Review, sign, and execute—or reject.
                </p>
              </div>
              <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700/60 group-hover:border-blue-500/30 group-hover:bg-blue-500/5 transition-all duration-300">
                <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all duration-300" />
              </div>
            </div>
          </Link>
        </div>

        {/* How it works */}
        <div>
          <div className="mb-8">
            <p className="text-[0.6875rem] font-medium text-zinc-500 uppercase tracking-[0.12em]">
              How it works
            </p>
            <p className="mt-1.5 text-[0.9375rem] text-zinc-500 leading-relaxed">
              Three agents. One flow. You approve every step.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {AGENTS.map(({ icon: Icon, label, accent, tagline, description }) => {
              const styles = accentStyles[accent as keyof typeof accentStyles];
              return (
                <div
                  key={label}
                  className={`group relative rounded-2xl border ${styles.border} ${styles.hoverBorder} bg-zinc-900/40 p-5 transition-all duration-300 ease-out`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles.iconBg} ${styles.icon} mb-4`}>
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <p className={`text-[0.6875rem] font-medium uppercase tracking-[0.08em] ${styles.tagline}`}>
                    {tagline}
                  </p>
                  <h3 className="mt-1 text-[1rem] font-semibold text-zinc-100 tracking-[-0.01em]">
                    {label}
                  </h3>
                  <p className="mt-3 text-[0.875rem] text-zinc-500 leading-[1.6]">
                    {description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
