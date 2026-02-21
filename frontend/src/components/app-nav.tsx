'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Play, ShieldCheck, Sun, Moon } from 'lucide-react';
import { WalletConnect } from './wallet-connect';
import { WalletErrorBoundary } from './wallet-error-boundary';
import { useTheme } from './theme-provider';

const NAV_ITEMS = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/run', label: 'Run', icon: Play },
  { href: '/app/verification', label: 'Verification', icon: ShieldCheck },
];

export function AppNav() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <aside className="sidebar-root fixed left-0 top-0 bottom-0 w-56 z-40 border-r theme-border flex flex-col"
      style={{ background: 'var(--bg-sidebar)' }}>
      <div className="p-6 border-b theme-border">
        <Link href="/app" className="block">
          <span className="text-lg font-semibold theme-text">Mudra</span>
        </Link>
        <p className="text-xs theme-text-tertiary mt-0.5">AI advises, humans decide</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/app' ? pathname === '/app' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
              style={isActive ? { background: 'var(--bg-card-hover)' } : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          style={{ marginTop: '0.5rem' }}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </nav>
      <div className="p-4 border-t theme-border">
        <WalletErrorBoundary>
          <WalletConnect />
        </WalletErrorBoundary>
      </div>
    </aside>
  );
}
