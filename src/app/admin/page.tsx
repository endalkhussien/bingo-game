'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/providers/auth-provider';
import { ipc } from '@/presentation/lib/ipc';
import { getShopAdminEntryPath, isShopAdminRole, type ShopLicenseStatus } from '@/shared/roles';

export default function AdminIndexPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user || !isShopAdminRole(user.role)) {
      router.replace('/login');
      return;
    }
    ipc<ShopLicenseStatus>('license:status')
      .then((status) => router.replace(getShopAdminEntryPath(status ?? { active: false, needsActivation: true, activated: false, needsTopup: false })))
      .catch(() => router.replace(getShopAdminEntryPath({ active: false, needsActivation: true, activated: false, needsTopup: false })));
  }, [user, isLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  );
}
