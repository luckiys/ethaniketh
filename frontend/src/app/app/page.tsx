'use client';

import Link from 'next/link';
import { Eye, Brain, Zap, ArrowRight } from 'lucide-react';

export default function AppDashboard() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-zinc-100">Dashboard</h1>
      <p className="mt-1 text-zinc-500 text-sm">
        Start a run to let the Watcher, Strategist, and Executor work for you.
      </p>

      <div className="mt-10">
        <Link
          href="/app/run"
          className="flex items-center gap-4 p-6 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900 transition-colors group"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
            <ArrowRight className="h-5 w-5 text-zinc-400 group-hover:text-zinc-200" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-medium text-zinc-100">Start a run</h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              Describe your goal, add holdings, and let the agents propose a strategy.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
        </Link>
      </div>

      <div className="mt-12">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">How it works</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Eye,   label: 'Watcher',    desc: 'Monitors your portfolio and market conditions', color: 'text-blue-400' },
            { icon: Brain, label: 'Strategist',  desc: 'Analyzes risk and proposes a plan',            color: 'text-violet-400' },
            { icon: Zap,   label: 'Executor',    desc: 'Runs only after you sign',                     color: 'text-emerald-400' },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div
              key={label}
              className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/30"
            >
              <Icon className={`h-5 w-5 ${color}`} />
              <h3 className="mt-2 font-medium text-zinc-200 text-sm">{label}</h3>
              <p className="mt-1 text-xs text-zinc-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
