import { AppNav } from '@/components/app-nav';
import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <AppNav />
      <main className="pl-56 min-h-screen w-full flex flex-col">
        <div className="border-b border-zinc-800 px-8 py-4 flex items-center justify-between shrink-0">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Back to home
          </Link>
        </div>
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
