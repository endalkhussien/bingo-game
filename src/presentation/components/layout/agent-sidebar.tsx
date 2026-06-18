'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gamepad2, CreditCard, BarChart3, RefreshCw, LogOut } from 'lucide-react';
import { cn } from '@/presentation/lib/utils';
import { useAuth } from '@/presentation/providers/auth-provider';
import { APP_NAME, APP_TAGLINE } from '@/shared/brand';
import { AppLogo } from '@/presentation/components/shared/app-logo';

/** Waliya sidebar — Game Board, Waliya Cards, Reports, Recharge */
const navItems = [
  { href: '/agent/game-board', label: 'Game Board', icon: Gamepad2 },
  { href: '/agent/cards', label: 'Waliya Cards', icon: CreditCard },
  { href: '/agent/reports', label: 'Reports', icon: BarChart3 },
  { href: '/agent/recharge', label: 'Recharge Balance', icon: RefreshCw },
];

export function AgentSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="flex w-56 flex-col bg-[#1a1410] text-white">
      <div className="flex items-center gap-2 border-b border-amber-900/40 px-4 py-5">
        <AppLogo size={56} className="rounded-2xl shadow-md ring-2 ring-amber-500/20" />
        <div>
          <div className="text-sm font-bold leading-tight">{APP_NAME}</div>
          <div className="text-[10px] text-amber-200/50">{APP_TAGLINE}</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-amber-800/60 text-white' : 'text-amber-100/70 hover:bg-amber-900/40 hover:text-white',
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-3 py-3">
        <button
          type="button"
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-[#334155]/60"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
