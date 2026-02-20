'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Play, ShieldCheck } from 'lucide-react';
import { WalletConnect } from './wallet-connect';

const NAV_ITEMS = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/run', label: 'Run', icon: Play },
  { href: '/app/verification', label: 'Verification', icon: ShieldCheck },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 border-r border-zinc-800 bg-zinc-950 flex flex-col">
      <div className="p-6 border-b border-zinc-800">
        <Link href="/app" className="block">
          <span className="text-lg font-semibold text-zinc-100">AegisOS</span>
        </Link>
        <p className="text-xs text-zinc-500 mt-0.5">AI advises, humans decide</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/app' ? pathname === '/app' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-zinc-800">
        <WalletConnect />
      </div>
    </aside>
  );
}
