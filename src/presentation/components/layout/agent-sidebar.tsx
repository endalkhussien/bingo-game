'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Gamepad2, CreditCard, BarChart3, Wallet, RefreshCw, Settings, Bell, LogOut, Monitor } from 'lucide-react';
import { cn } from '@/presentation/lib/utils';
import { useAuth } from '@/presentation/providers/auth-provider';
import { useEffect, useState } from 'react';
import { APP_NAME, APP_TAGLINE } from '@/shared/brand';
import { AppLogo } from '@/presentation/components/shared/app-logo';
import { ipc } from '@/presentation/lib/ipc';

const navItems = [
  { href: '/agent/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agent/game-board', label: 'Game Board', icon: Gamepad2 },
  { href: '/agent/caller-display', label: 'Caller Display', icon: Monitor, external: true },
  { href: '/agent/cards', label: 'Bingo Cards', icon: CreditCard },
  { href: '/agent/games', label: 'Games', icon: Gamepad2 },
  { href: '/agent/wallet', label: 'Wallet', icon: Wallet },
  { href: '/agent/recharge', label: 'Recharge', icon: RefreshCw },
  { href: '/agent/reports', label: 'Reports', icon: BarChart3 },
  { href: '/agent/settings', label: 'Settings', icon: Settings },
];

export function AgentSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    ipc<number>('notifications:unread-count').then(setUnread).catch(() => {});
  }, [pathname]);

  return (
    <aside className="flex w-56 flex-col bg-sidebar text-white">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-5">
        <AppLogo size={40} />
        <div>
          <div className="text-sm font-bold leading-tight">{APP_NAME}</div>
          <div className="text-[10px] text-gray-400">{APP_TAGLINE}</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/agent/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          const className = cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            active ? 'bg-sidebar-active text-white' : 'text-gray-300 hover:bg-sidebar-hover hover:text-white');
          if ('external' in item && item.external) {
            return (
              <a key={item.href} href={`${item.href}/`} target="_blank" rel="noopener noreferrer" className={className}>
                <Icon className="h-5 w-5" />{item.label}
              </a>
            );
          }
          return (
            <Link key={item.href} href={item.href} className={className}>
              <Icon className="h-5 w-5" />{item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-3 py-3 space-y-1">
        <Link href="/agent/notifications"
          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-sidebar-hover">
          <span className="flex items-center gap-3"><Bell className="h-4 w-4" />Notifications</span>
          {unread > 0 && <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs">{unread}</span>}
        </Link>
        <button type="button" onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-sidebar-hover">
          <LogOut className="h-4 w-4" />Logout
        </button>
      </div>
    </aside>
  );
}
