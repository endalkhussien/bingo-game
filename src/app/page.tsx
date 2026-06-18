'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/providers/auth-provider';
import { getPostLoginPath, getShopAdminEntryPath, ROLE_OPERATOR, type ShopLicenseStatus } from '@/shared/roles';
import { ipc } from '@/presentation/lib/ipc';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role === ROLE_OPERATOR) {
      ipc<ShopLicenseStatus>('license:status')
        .then((status) => router.replace(getShopAdminEntryPath(status ?? { active: false, needsActivation: true, activated: false, needsTopup: false })))
        .catch(() => router.replace(getShopAdminEntryPath({ active: false, needsActivation: true, activated: false, needsTopup: false })));
      return;
    }
    router.replace(getPostLoginPath(user.role));
  }, [user, isLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  );
}
