'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, KeyRound, Wallet, BarChart3 } from 'lucide-react';
import { cn } from '@/presentation/lib/utils';
import {
  VENDOR_HOME, VENDOR_TOL, VENDOR_TOPUP, VENDOR_REPORTS, normalizeVendorPath,
} from '@/shared/vendor-routes';

const nav = [
  { href: VENDOR_HOME, label: 'Dashboard', icon: LayoutDashboard },
  { href: VENDOR_TOL, label: 'TOL Licenses', icon: KeyRound },
  { href: VENDOR_TOPUP, label: 'Shop Top-up (TVP)', icon: Wallet },
  { href: VENDOR_REPORTS, label: 'Revenue & Reports', icon: BarChart3 },
];

export function VendorSidebar() {
  const pathname = usePathname();
  const current = normalizeVendorPath(pathname);

  return (
    <aside className="w-56 shrink-0 border-r border-white/10 bg-violet-950/60">
      <nav className="space-y-1 p-4">
        {nav.map((item) => {
          const active = current === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-violet-600 text-white' : 'text-violet-200 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
