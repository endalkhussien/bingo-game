'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/providers/auth-provider';
import { APP_NAME } from '@/shared/brand';
import { AppLogo } from '@/presentation/components/shared/app-logo';
import { isVendorRole, getShopAdminEntryPath, type ShopLicenseStatus } from '@/shared/roles';
import { ipc } from '@/presentation/lib/ipc';
import { VendorSidebar } from '@/presentation/components/layout/vendor-sidebar';
import { UserMenuDropdown } from '@/presentation/components/layout/user-menu-dropdown';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
    if (!isLoading && user && !isVendorRole(user.role)) {
      if (user.role === 'OPERATOR') {
        ipc<ShopLicenseStatus>('license:status')
          .then((s) => router.replace(getShopAdminEntryPath(s ?? { active: false, needsActivation: true, activated: false, needsTopup: false })))
          .catch(() => router.replace(getShopAdminEntryPath({ active: false, needsActivation: true, activated: false, needsTopup: false })));
      } else {
        router.replace('/agent/dashboard');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || !isVendorRole(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center bg-violet-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-violet-950 via-slate-900 to-slate-950 text-white">
      <VendorSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="border-b border-white/10 bg-violet-950/80 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AppLogo size={72} className="rounded-2xl shadow-md ring-2 ring-amber-500/20" />
              <div>
                <p className="text-lg font-bold">{APP_NAME}</p>
                <p className="text-xs text-violet-300">Vendor portal — TAK activation & TVP top-ups</p>
              </div>
            </div>
            <UserMenuDropdown variant="dark" label={user.fullName} />
          </div>
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
