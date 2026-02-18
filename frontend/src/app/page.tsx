'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { LandingNav } from '@/components/landing-nav';
import { Eye, Brain, Zap, Shield, Lock, ChevronDown } from 'lucide-react';
import './landing.css';

const FEATURES = [
  {
    icon: Eye,
    title: 'Watcher',
    desc: 'Monitors your portfolio and market conditions in real time. Tracks holdings, fetches prices, and surfaces alerts.',
  },
  {
    icon: Brain,
    title: 'Strategist',
    desc: 'Analyzes risk and proposes actions—never executes. You review every recommendation before anything happens.',
  },
  {
    icon: Zap,
    title: 'Executor',
    desc: 'Runs only after you sign. Logs every action to Hedera for verification. You stay in control.',
  },
];

// Research-backed stats supporting human-in-the-loop DeFi (Halborn Top 100 DeFi Hacks 2024, Hedera)
const STATS = [
  { value: 56.5, suffix: '%', label: 'Of 2024 DeFi attacks were off-chain account breaches' },
  { value: 80.5, suffix: '%', label: 'Of funds lost from compromised accounts' },
  { value: 10.8, suffix: '%', label: 'Of losses from audited protocols vs 20% hacked' },
  { value: 100, suffix: '%', label: 'Human approval required before execution' },
];

export default function LandingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-visible');
          } else {
            entry.target.classList.remove('animate-visible');
          }
        });
      },
      { threshold: 0, rootMargin: '-80px 0px -80px 0px' }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing fixed inset-0 bg-black">
      <LandingNav />

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center bg-black gradient-mesh px-6 sm:px-8">
        <div className="w-full max-w-5xl mx-auto text-center" data-stagger>
          <h1 className="landing-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-white tracking-tight mb-8 leading-[1.05]" data-animate>
            AI advises.
            <br />
            Humans decide.
            <br />
            Blockchain verifies.
          </h1>
          <p className="text-lg sm:text-xl text-neutral-400 mb-12 max-w-lg mx-auto font-medium leading-relaxed" data-animate>
            AegisOS is a 3-agent operating system for DeFi. Your AI never acts without your signed approval. Every step is verifiable on Hedera.
          </p>
          <Link
            href="/app"
            className="inline-block px-8 py-4 rounded-lg bg-blue-600 text-white font-semibold text-base hover:bg-blue-500 transition-colors"
            data-animate
          >
            Launch AegisOS
          </Link>
        </div>
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <a href="#features" className="flex flex-col items-center gap-1 text-blue-500/70 hover:text-blue-400 transition-colors scroll-indicator">
            <span className="text-[10px] font-semibold uppercase tracking-widest">Scroll</span>
            <ChevronDown className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative min-h-screen flex flex-col items-center justify-center py-20 px-6 sm:px-8 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" aria-hidden />
        <div className="w-full max-w-5xl mx-auto">
          <h2 className="landing-heading text-3xl sm:text-4xl text-white text-center mb-4" data-animate>
            Three agents. One flow.
          </h2>
          <p className="text-neutral-500 text-center max-w-md mx-auto mb-12 text-base font-medium" data-animate>
            Watcher monitors, Strategist proposes, Executor runs—only after you approve.
          </p>
          <div className="grid md:grid-cols-3 gap-5" data-stagger>
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="p-5 rounded-xl border border-white/10 bg-white/[0.02] text-center"
                data-animate
              >
                <div className="w-14 h-14 rounded-lg bg-blue-500/20 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                  <f.icon className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="landing-heading text-xl text-white mb-2">{f.title}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative min-h-screen flex flex-col items-center justify-center py-20 px-6 sm:px-8 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" aria-hidden />
        <div className="absolute inset-0 gradient-mesh opacity-25 pointer-events-none" />
        <div className="relative w-full max-w-5xl mx-auto text-center">
          <h2 className="landing-heading text-3xl sm:text-4xl text-white mb-6" data-animate>
            You sign. We execute.
          </h2>
          <p className="text-neutral-500 text-lg leading-relaxed font-medium" data-animate>
            Connect your wallet. Describe your goal. The AI proposes a strategy. You review, sign with EIP-712, and approve. The Executor runs—and every step is logged on Hedera for anyone to verify.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="relative min-h-screen flex flex-col items-center justify-center py-20 px-6 sm:px-8 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" aria-hidden />
        <div className="w-full max-w-5xl mx-auto">
          <h2 className="landing-heading text-3xl sm:text-4xl text-white text-center mb-12" data-animate>
            Why human-in-the-loop matters
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8" data-stagger>
            {STATS.map((s, i) => (
              <div key={i} className="text-center" data-animate>
                <p className="landing-heading text-4xl sm:text-5xl text-blue-400 mb-2">
                  {s.value}{s.suffix}
                </p>
                <p className="text-neutral-500 text-sm leading-tight font-medium">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-neutral-600 text-xs text-center mt-8 max-w-md mx-auto font-medium">
            Sources: Halborn Top 100 DeFi Hacks Report 2024, Hedera Network Documentation
          </p>
        </div>
      </section>

      {/* Product */}
      <section id="product" className="relative min-h-screen flex flex-col items-center justify-center py-20 px-6 sm:px-8 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" aria-hidden />
        <div className="w-full max-w-5xl mx-auto">
          <h2 className="landing-heading text-3xl sm:text-4xl text-white text-center mb-4" data-animate>
            Built for DeFi safety
          </h2>
          <p className="text-neutral-500 text-center max-w-md mx-auto mb-12 text-base font-medium" data-animate>
            No autonomous trading. No surprise executions. Your keys, your approval, your control.
          </p>
          <div className="grid md:grid-cols-2 gap-5" data-stagger>
            <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] text-center" data-animate>
              <Shield className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="landing-heading text-xl text-white mb-2">On-chain verification</h3>
              <p className="text-neutral-500 text-sm leading-relaxed font-medium">Every recommendation and execution is recorded on Hedera. Anyone can verify that you signed the plan.</p>
            </div>
            <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] text-center" data-animate>
              <Lock className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="landing-heading text-xl text-white mb-2">Human-in-the-loop</h3>
              <p className="text-neutral-500 text-sm leading-relaxed font-medium">The AI never acts without your explicit approval. Sign with your wallet to execute—or reject.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative min-h-screen flex flex-col items-center justify-center py-12 px-6 sm:px-8 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" aria-hidden />
        <div className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 sm:justify-between">
          <span className="text-neutral-600 text-xs font-medium">© AegisOS. AI advises, humans decide, blockchain verifies.</span>
          <Link href="/app" className="text-neutral-500 hover:text-blue-400 text-xs font-semibold transition-colors">
            Launch App
          </Link>
        </div>
      </footer>
    </div>
  );
}
