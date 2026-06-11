'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gamepad2, CreditCard, BarChart3, Wallet } from 'lucide-react';
import { cn } from '@/presentation/lib/utils';

const navItems = [
  { href: '/agent/game-board', label: 'Game Board', icon: Gamepad2 },
  { href: '/agent/cards', label: 'Bingo Cards', icon: CreditCard },
  { href: '/agent/reports', label: 'Reports', icon: BarChart3 },
  { href: '/agent/recharge', label: 'Recharge Balance', icon: Wallet },
];

export function AgentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col bg-sidebar text-white">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-lg font-bold">B</div>
        <div>
          <div className="text-sm font-bold leading-tight">Minch Bingo</div>
          <div className="text-[10px] text-gray-400">play for win</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-sidebar-active text-white' : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
              )}>
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
