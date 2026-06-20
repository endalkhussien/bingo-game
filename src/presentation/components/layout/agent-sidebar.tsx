'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gamepad2, CreditCard, BarChart3, RefreshCw, LogOut } from 'lucide-react';
import { cn } from '@/presentation/lib/utils';
import { useAuth } from '@/presentation/providers/auth-provider';
import { useUiLanguage } from '@/presentation/providers/ui-language-provider';
import { APP_NAME, APP_TAGLINE } from '@/shared/brand';
import { AppLogo } from '@/presentation/components/shared/app-logo';

export function AgentSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { t } = useUiLanguage();

  const navItems = [
    { href: '/agent/game-board', label: t('gameBoard'), icon: Gamepad2 },
    { href: '/agent/cards', label: t('bingoCards'), icon: CreditCard },
    { href: '/agent/reports', label: t('reports'), icon: BarChart3 },
    { href: '/agent/recharge', label: t('rechargeBalance'), icon: RefreshCw },
  ];

  return (
    <aside className="flex w-56 flex-col bg-[#1a1410] text-white">
      <div className="flex flex-col items-center gap-3 border-b border-amber-900/40 px-3 py-5">
        <AppLogo size={96} className="rounded-xl shadow-md ring-2 ring-amber-500/30" />
        <div className="text-center">
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
          {t('logout')}
        </button>
      </div>
    </aside>
  );
}
