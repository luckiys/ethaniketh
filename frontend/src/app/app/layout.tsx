import { AppNav } from '@/components/app-nav';
import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen layout-main" style={{ background: 'var(--bg-base)' }}>
      <AppNav />
      <main className="pl-56 min-h-screen w-full flex flex-col">
        <div className="layout-topbar border-b px-8 py-4 flex items-center justify-between shrink-0 theme-border"
          style={{ background: 'var(--bg-elevated)' }}>
          <Link href="/" className="text-sm theme-text-tertiary hover:text-[var(--text-primary)] transition-colors">
            ← Back to home
          </Link>
        </div>
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
