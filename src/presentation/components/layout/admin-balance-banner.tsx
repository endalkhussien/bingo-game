'use client';

import Link from 'next/link';
import { AlertTriangle, Wallet } from 'lucide-react';
import { SHOP_ADMIN_WALLET } from '@/shared/admin-routes';

interface AdminBalanceBannerProps {
  balance: number;
}

export function AdminBalanceBanner({ balance }: AdminBalanceBannerProps) {
  if (balance > 0) return null;

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          Shop balance is 0 ETB — redeem a TVP code from your vendor to issue agent recharge codes (TBG).
        </p>
        <Link
          href={SHOP_ADMIN_WALLET}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          <Wallet className="h-4 w-4" />
          Top up now
        </Link>
      </div>
    </div>
  );
}
