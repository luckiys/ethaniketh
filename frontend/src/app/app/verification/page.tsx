'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function VerificationPage() {
  const [recentSessions, setRecentSessions] = useState<Array<{ id: string; hcsTxId?: string; htsTxId?: string }>>([]);

  useEffect(() => {
    // In a full implementation, you'd fetch from an API or localStorage
    // For now, show empty state with CTA to run
    setRecentSessions([]);
  }, []);

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-zinc-100">Verification</h1>
      <p className="mt-1 text-zinc-500 text-sm">
        View on-chain verification for your approved executions. Every action is logged on Hedera.
      </p>

      {recentSessions.length === 0 ? (
        <div className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800">
              <ShieldCheck className="h-6 w-6 text-zinc-500" />
            </div>
          </div>
          <h2 className="mt-4 font-medium text-zinc-200">No verifications yet</h2>
          <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto">
            Complete a run and approve a strategy to see HCS and HTS transaction IDs here.
          </p>
          <Link
            href="/app/run"
            className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-white transition-colors"
          >
            Start a run
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {recentSessions.map((s) => (
            <div
              key={s.id}
              className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50"
            >
              <p className="text-xs font-mono text-zinc-500">Session {s.id.slice(0, 8)}...</p>
              {s.hcsTxId && <p className="mt-2 text-sm text-zinc-300 font-mono">HCS: {s.hcsTxId}</p>}
              {s.htsTxId && <p className="mt-1 text-sm text-zinc-300 font-mono">HTS: {s.htsTxId}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
