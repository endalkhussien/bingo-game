'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { User, Wallet } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/presentation/providers/auth-provider';
import { APP_NAME } from '@/shared/brand';
import { ipc } from '@/presentation/lib/ipc';
import { SHOP_ADMIN_WALLET } from '@/shared/admin-routes';

export const BALANCE_UPDATED_EVENT = 'waliya:balance-updated';

export function AdminHeader() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [shopBalance, setShopBalance] = useState<number | null>(null);

  const loadBalance = useCallback(() => {
    ipc<number>('operator-wallet:balance')
      .then((b) => setShopBalance(Number.isFinite(b) ? b : 0))
      .catch(() => setShopBalance(null));
  }, []);

  useEffect(() => {
    loadBalance();
  }, [loadBalance, pathname]);

  useEffect(() => {
    const onBalanceUpdated = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === 'number' && Number.isFinite(detail)) {
        setShopBalance(detail);
      } else {
        loadBalance();
      }
    };
    window.addEventListener(BALANCE_UPDATED_EVENT, onBalanceUpdated);
    return () => window.removeEventListener(BALANCE_UPDATED_EVENT, onBalanceUpdated);
  }, [loadBalance]);

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-700">{APP_NAME}</span>
      </div>
      <div className="flex items-center gap-4">
        {shopBalance != null && (
          <Link
            href={SHOP_ADMIN_WALLET}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
              shopBalance <= 0
                ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                : 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
            }`}
          >
            <Wallet className="h-4 w-4" />
            {shopBalance.toFixed(0)} ETB
          </Link>
        )}
        <select className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
          <option>English</option>
          <option>አማርኛ</option>
        </select>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
            <User className="h-4 w-4 text-gray-600" />
          </div>
          <span className="text-sm font-medium">{user?.fullName ?? 'Admin'}</span>
        </div>
      </div>
    </header>
  );
}
