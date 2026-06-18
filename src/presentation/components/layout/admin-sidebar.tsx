'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Wallet, Gamepad2, BarChart3, Settings,
  Bell, LogOut, Ticket, KeyRound,
} from 'lucide-react';
import { cn } from '@/presentation/lib/utils';
import { useAuth } from '@/presentation/providers/auth-provider';
import { useEffect, useState } from 'react';
import { APP_NAME } from '@/shared/brand';
import { AppLogo } from '@/presentation/components/shared/app-logo';
import { ipc } from '@/presentation/lib/ipc';
import { getRoleLabel } from '@/shared/roles';

const shopAdminNav: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: boolean;
}> = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/wallet', label: 'Shop Balance (TVP)', icon: Wallet },
  { href: '/admin/agents', label: 'Agents (TAS)', icon: Users },
  { href: '/admin/vouchers', label: 'Recharge (TBG)', icon: Ticket },
  { href: '/admin/recharge', label: 'Recharge Requests', icon: Wallet, badge: true },
  { href: '/admin/games', label: 'Games', icon: Gamepad2 },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/license', label: 'Shop Activation (TAK)', icon: KeyRound },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [pending, setPending] = useState(0);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    ipc<number>('recharge:pending-count').then(setPending).catch(() => {});
    ipc<number>('notifications:unread-count').then(setUnread).catch(() => {});
  }, [pathname]);

  return (
    <aside className="flex w-60 flex-col bg-sidebar text-white">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-5">
        <AppLogo size={72} className="rounded-2xl shadow-md ring-2 ring-amber-500/20" />
        <div>
          <div className="text-sm font-bold">{APP_NAME}</div>
          <div className="text-[10px] text-gray-400">{user ? getRoleLabel(user.role) : 'Shop Admin'}</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {shopAdminNav.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          const badge = item.badge && pending > 0 ? pending : 0;
          return (
            <Link key={item.href} href={item.href}
              className={cn('flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-sidebar-active text-white' : 'text-gray-300 hover:bg-sidebar-hover hover:text-white')}>
              <span className="flex items-center gap-3"><Icon className="h-4 w-4" />{item.label}</span>
              {badge > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs">{badge}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-3 py-3 space-y-1">
        <Link href="/admin/notifications"
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
