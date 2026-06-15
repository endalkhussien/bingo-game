'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/presentation/providers/auth-provider';
import { AdminSidebar } from '@/presentation/components/layout/admin-sidebar';
import { AdminHeader } from '@/presentation/components/layout/admin-header';
import { ipc } from '@/presentation/lib/ipc';
import { isAdminRole, isVendorRole } from '@/shared/roles';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [licenseOk, setLicenseOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
    if (!isLoading && user && !isAdminRole(user.role)) router.replace('/agent/dashboard');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || isVendorRole(user.role)) {
      setLicenseOk(true);
      return;
    }
    if (user.role === 'OPERATOR') {
      ipc<{ active: boolean }>('license:status').then((s) => setLicenseOk(s.active)).catch(() => setLicenseOk(false));
    }
  }, [user, pathname]);

  useEffect(() => {
    if (licenseOk === false && pathname !== '/admin/license') {
      router.replace('/admin/license');
    }
  }, [licenseOk, pathname, router]);

  if (isLoading || licenseOk === null) {
    return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;
  }

  if (pathname === '/admin/license') {
    return <main className="min-h-screen bg-gray-50 p-6">{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-auto bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}
