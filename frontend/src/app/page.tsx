'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { LandingNav } from '@/components/landing-nav';
import { Eye, Brain, Zap, Shield, Lock, ChevronDown, Wallet, MessageSquare, FileCheck, LogIn } from 'lucide-react';
import './landing.css';

const FEATURES = [
  {
    icon: Eye,
    title: 'Watcher',
    tagline: 'Always watching. Never sleeping.',
    desc: 'Continuously monitors your DeFi positions, token prices, and market conditions. Detects anomalies, tracks impermanent loss, and surfaces actionable alerts before you need to ask.',
    benefit: 'Never miss a critical move.',
  },
  {
    icon: Brain,
    title: 'Strategist',
    tagline: 'Thinks. Proposes. Never acts.',
    desc: 'Analyzes your portfolio risk, simulates strategies, and recommends actions—rebalancing, harvesting, or exiting. Every proposal includes reasoning and trade-offs. You decide what runs.',
    benefit: 'AI-powered insight, human judgment.',
  },
  {
    icon: Zap,
    title: 'Executor',
    tagline: 'Runs only when you sign.',
    desc: 'Executes approved strategies via your wallet. Every swap, stake, or transfer is logged on Hedera with a verifiable audit trail. No autonomous trading. No surprise transactions.',
    benefit: 'Full control. Full transparency.',
  },
];

// Research-backed stats supporting human-in-the-loop DeFi (Halborn Top 100 DeFi Hacks 2024, Hedera)
const STATS = [
  { value: 56.5, suffix: '%', label: 'DeFi attacks in 2024 were off-chain—phishing, key leaks, social engineering. Smart contracts weren’t the weak link.', source: 'Halborn' },
  { value: 80.5, suffix: '%', label: 'Stolen funds traced to compromised accounts. Your signature keeps control in your hands.', source: 'Chainalysis' },
  { value: 10.8, suffix: '%', label: 'Loss rate for audited protocols vs 20% unaudited. You add another layer: verify every action.', source: 'Halborn' },
  { value: 100, suffix: '%', label: 'Executions require your signed approval. No autonomous trading. No surprise transactions.', source: 'AegisOS' },
];

export default function LandingPage() {
  useEffect(() => {
    const landing = document.querySelector('.landing');
    if (!landing) return;

    const animateObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-visible');
          } else {
            entry.target.classList.remove('animate-visible');
          }
        });
      },
      { threshold: 0, rootMargin: '-60px 0px -60px 0px', root: landing }
    );

    const signatureObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('signature-visible');
          }
        });
      },
      { threshold: 0, root: null }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => animateObserver.observe(el));
    document.querySelectorAll('[data-signature]').forEach((el) => signatureObserver.observe(el));
    return () => {
      animateObserver.disconnect();
      signatureObserver.disconnect();
    };
  }, []);

  return (
    <div className="landing fixed inset-0 bg-black">
      <LandingNav />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center bg-black gradient-mesh px-8 sm:px-12 lg:px-16">
        <div className="w-full max-w-6xl mx-auto text-center" data-stagger>
          <h1 className="landing-heading text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-white tracking-tight mb-8 leading-[1.05]" data-animate>
            AI advises.
            <br />
            Humans decide.
            <br />
            Blockchain verifies.
          </h1>
          <p className="text-xl sm:text-2xl text-white/80 mb-12 max-w-2xl mx-auto font-medium leading-relaxed" data-animate>
            AegisOS is a 3-agent operating system for DeFi. Your AI never acts without your signed approval. Every step is verifiable on Hedera.
          </p>
          <Link
            href="/app"
            className="inline-block px-10 py-5 rounded-lg bg-blue-600 text-white font-semibold text-lg hover:bg-blue-500 transition-colors"
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
      <section id="features" className="relative flex flex-col items-center py-16 sm:py-20 px-8 sm:px-12 lg:px-16 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" aria-hidden />
        <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-start pt-4">
          <h2 className="landing-heading text-4xl sm:text-5xl lg:text-6xl text-white text-center mb-4" data-animate>
            Three agents. One flow.
          </h2>
          <p className="text-white/75 text-center max-w-2xl mx-auto mb-14 text-lg sm:text-xl font-medium leading-relaxed" data-animate>
            A coordinated system that watches, thinks, and acts—only when you approve. No black boxes. No autonomous trading.
          </p>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-10" data-stagger>
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="p-6 lg:p-8 rounded-xl border border-white/10 bg-white/[0.02] text-left"
                data-animate
              >
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-lg bg-blue-500/20 flex items-center justify-center mb-6 border border-blue-500/20">
                  <f.icon className="w-8 h-8 lg:w-10 lg:h-10 text-blue-400" />
                </div>
                <p className="text-blue-400/90 text-sm font-semibold uppercase tracking-wider mb-2">{f.tagline}</p>
                <h3 className="landing-heading text-2xl lg:text-3xl text-white mb-4">{f.title}</h3>
                <p className="text-white/75 text-base lg:text-lg leading-relaxed font-medium mb-4">{f.desc}</p>
                <p className="text-white/90 text-sm font-semibold">{f.benefit}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-12 pb-8">
            <span className="section-scroll-hint flex flex-col items-center gap-1 text-blue-500/50 text-[10px] font-semibold uppercase tracking-widest">
              Scroll for more
              <ChevronDown className="w-4 h-4" />
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative flex flex-col items-center py-16 sm:py-20 px-8 sm:px-12 lg:px-16 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" aria-hidden />
        <div className="absolute inset-0 gradient-mesh opacity-40 pointer-events-none" />
        <div className="relative w-full max-w-6xl mx-auto flex-1 flex flex-col justify-start pt-4">
          <h2 className="landing-heading text-4xl sm:text-5xl lg:text-6xl text-white text-center mb-4" data-animate>
            You sign. We execute.
          </h2>
          <p className="text-white/75 text-center text-lg sm:text-xl max-w-2xl mx-auto mb-14 leading-relaxed font-medium" data-animate>
            From goal to execution in four steps. You stay in control at every stage.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6" data-stagger>
            {[
              { icon: Wallet, step: 1, title: 'Connect', desc: 'Link your wallet. AegisOS reads balances and positions—never has custody.' },
              { icon: MessageSquare, step: 2, title: 'Describe', desc: 'Tell the Strategist your goal. It analyzes risk and proposes a plan.' },
              { icon: FileCheck, step: 3, title: 'Review & Sign', desc: 'Approve with EIP-712. Your signature is the only trigger for execution.' },
              { icon: LogIn, step: 4, title: 'Execute', desc: 'The Executor runs. Every action is logged on Hedera for verification.' },
            ].map((s, i) => (
              <div key={i} className="relative p-6 rounded-xl border-2 border-white/20 bg-white/10 backdrop-blur-sm" data-animate>
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4 border border-blue-500/20">
                  <s.icon className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-blue-400/80 text-xs font-bold">Step {s.step}</span>
                <h3 className="landing-heading text-xl lg:text-2xl text-white mt-2 mb-3">{s.title}</h3>
                <p className="text-white/75 text-sm lg:text-base leading-relaxed font-medium">{s.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-white/75 text-center mt-10 text-base max-w-2xl mx-auto font-medium" data-animate>
            No gas spent until you approve. No execution without your explicit signature. Your keys, your rules.
          </p>
          <div className="mt-14 flex justify-center" data-signature>
            <div className="relative w-full max-w-md mx-auto p-8 rounded-2xl border-2 border-white/25 bg-white/10 backdrop-blur-sm text-center">
              <p className="text-white/70 text-sm font-medium mb-6 uppercase tracking-widest">Approved by</p>
              <div className="signature-line mb-6 mx-auto" />
              <p className="signature-font signature-reveal text-4xl sm:text-5xl text-white/95 font-semibold">
                John Doe
              </p>
              <p className="text-white/50 text-xs mt-4 font-medium">EIP-712 signed · Hedera verified</p>
            </div>
          </div>
          <div className="flex flex-col items-center mt-14 pb-8 gap-6">
            <div className="flow-line" aria-hidden />
            <span className="section-scroll-hint flex flex-col items-center gap-1 text-blue-500/50 text-[10px] font-semibold uppercase tracking-widest">
              Scroll for more
              <ChevronDown className="w-4 h-4" />
            </span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="relative flex flex-col items-center py-16 sm:py-20 px-8 sm:px-12 lg:px-16 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" aria-hidden />
        <div className="absolute inset-0 gradient-mesh opacity-20 pointer-events-none" />
        <div className="relative w-full max-w-6xl mx-auto flex-1 flex flex-col justify-start pt-4">
          <h2 className="landing-heading text-4xl sm:text-5xl lg:text-6xl text-white text-center mb-4" data-animate>
            Why human-in-the-loop matters
          </h2>
          <p className="text-white/90 text-center max-w-2xl mx-auto mb-14 text-lg font-medium" data-animate>
            Most DeFi losses come from compromised accounts, not smart contracts. Your signature is the lock.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10" data-stagger>
            {STATS.map((s, i) => (
              <div key={i} className="text-center p-6 rounded-xl border-2 border-white/20 bg-white/10 backdrop-blur-sm" data-animate>
                <p className="landing-heading text-5xl sm:text-6xl lg:text-7xl text-blue-400 mb-4">
                  {s.value}{s.suffix}
                </p>
                <p className="text-white text-sm lg:text-base leading-relaxed font-medium mb-3">{s.label}</p>
                <p className="text-blue-400/90 text-xs font-semibold">{s.source}</p>
              </div>
            ))}
          </div>
          <p className="text-white/70 text-sm text-center mt-10 max-w-xl mx-auto font-medium">
            Sources: Halborn Top 100 DeFi Hacks 2024 · Chainalysis · Hedera Network
          </p>
          <div className="flex justify-center mt-12 pb-8">
            <span className="section-scroll-hint flex flex-col items-center gap-1 text-blue-500/50 text-[10px] font-semibold uppercase tracking-widest">
              Scroll for more
              <ChevronDown className="w-4 h-4" />
            </span>
          </div>
        </div>
      </section>

      {/* Product */}
      <section id="product" className="relative flex flex-col items-center py-16 sm:py-20 px-8 sm:px-12 lg:px-16 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" aria-hidden />
        <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-start pt-4">
          <h2 className="landing-heading text-4xl sm:text-5xl lg:text-6xl text-white text-center mb-4" data-animate>
            Built for DeFi safety
          </h2>
          <p className="text-white/75 text-center max-w-2xl mx-auto mb-14 text-lg font-medium" data-animate>
            Two principles that define everything we build: verifiable trust and human sovereignty.
          </p>
          <div className="grid md:grid-cols-2 gap-8 lg:gap-10" data-stagger>
            <div className="p-6 lg:p-8 rounded-xl border border-white/10 bg-white/[0.02] text-left" data-animate>
              <Shield className="w-14 h-14 lg:w-16 lg:h-16 text-blue-400 mb-5" />
              <h3 className="landing-heading text-2xl lg:text-3xl text-white mb-4">On-chain verification</h3>
              <p className="text-white/75 text-base lg:text-lg leading-relaxed font-medium mb-4">Every recommendation and execution is recorded on Hedera. Anyone can verify that you signed the plan—no trust required.</p>
              <p className="text-white/80 text-sm font-semibold">Transparent. Auditable. Tamper-proof.</p>
            </div>
            <div className="p-6 lg:p-8 rounded-xl border border-white/10 bg-white/[0.02] text-left" data-animate>
              <Lock className="w-14 h-14 lg:w-16 lg:h-16 text-blue-400 mb-5" />
              <h3 className="landing-heading text-2xl lg:text-3xl text-white mb-4">Human-in-the-loop</h3>
              <p className="text-white/75 text-base lg:text-lg leading-relaxed font-medium mb-4">The AI proposes. You approve. Your wallet signature is the only trigger for execution. Reject, modify, or approve—you decide.</p>
              <p className="text-white/80 text-sm font-semibold">Your keys. Your approval. Your control.</p>
            </div>
          </div>
          <div className="mt-12 p-6 rounded-xl border border-blue-500/20 bg-blue-500/5 text-center" data-animate>
            <p className="text-white/90 text-base lg:text-lg font-medium">
              No autonomous trading. No surprise executions. No custody of your funds. AegisOS is a decision-support system—you remain the decision-maker.
            </p>
          </div>
          <div className="flex justify-center mt-12 pb-8">
            <span className="section-scroll-hint flex flex-col items-center gap-1 text-blue-500/50 text-[10px] font-semibold uppercase tracking-widest">
              Scroll for more
              <ChevronDown className="w-4 h-4" />
            </span>
          </div>
        </div>
      </section>

      {/* Footer - full section like others */}
      <footer id="footer" className="relative flex flex-col items-center justify-between py-16 sm:py-20 px-8 sm:px-12 lg:px-16 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" aria-hidden />
        <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center">
          <div className="text-center">
            <h2 className="landing-heading text-3xl sm:text-4xl lg:text-5xl text-white mb-4" data-animate>
              Ready to take control?
            </h2>
            <p className="text-white/75 text-lg max-w-xl mx-auto mb-8 font-medium" data-animate>
              Connect your wallet and let the Watcher, Strategist, and Executor work for you—with your approval every step of the way.
            </p>
            <Link
              href="/app"
              className="inline-block px-10 py-5 rounded-lg bg-blue-600 text-white font-semibold text-lg hover:bg-blue-500 transition-colors"
              data-animate
            >
              Launch AegisOS
            </Link>
          </div>
        </div>
        <div className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 sm:justify-between pt-8 border-t border-white/10 shrink-0">
          <span className="text-white/60 text-sm font-medium text-center sm:text-left">© AegisOS. AI advises, humans decide, blockchain verifies.</span>
          <div className="flex items-center gap-6">
            <Link href="#features" className="text-white/75 hover:text-blue-400 text-sm font-semibold transition-colors">Features</Link>
            <Link href="#how-it-works" className="text-white/75 hover:text-blue-400 text-sm font-semibold transition-colors">How it works</Link>
            <Link href="#stats" className="text-white/75 hover:text-blue-400 text-sm font-semibold transition-colors">Stats</Link>
            <Link href="/app" className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors">Launch App</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
