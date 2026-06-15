'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/providers/auth-provider';
import { ipc } from '@/presentation/lib/ipc';
import { getShopAdminEntryPath, isShopAdminRole } from '@/shared/roles';

export default function AdminIndexPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user || !isShopAdminRole(user.role)) {
      router.replace('/login');
      return;
    }
    ipc<{ active: boolean }>('license:status')
      .then((status) => router.replace(getShopAdminEntryPath(!!status?.active)))
      .catch(() => router.replace(getShopAdminEntryPath(false)));
  }, [user, isLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  );
}
