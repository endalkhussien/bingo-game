'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/presentation/providers/auth-provider';
import { AdminSidebar } from '@/presentation/components/layout/admin-sidebar';
import { AdminHeader } from '@/presentation/components/layout/admin-header';
import { ipc } from '@/presentation/lib/ipc';
import { isAdminRole, isShopAdminRole, isVendorRole } from '@/shared/roles';
import { isShopAdminOnlyPath, VENDOR_HOME } from '@/shared/admin-routes';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [licenseOk, setLicenseOk] = useState<boolean | null>(null);
  const [licenseReady, setLicenseReady] = useState(false);

  const checkLicense = useCallback((showSpinner = false) => {
    if (!user || isVendorRole(user.role)) {
      setLicenseOk(true);
      setLicenseReady(true);
      return;
    }
    if (isShopAdminRole(user.role)) {
      if (showSpinner) setLicenseReady(false);
      ipc<{ active: boolean }>('license:status')
        .then((s) => setLicenseOk(s.active))
        .catch(() => setLicenseOk(false))
        .finally(() => setLicenseReady(true));
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
    if (!isLoading && user && !isAdminRole(user.role)) router.replace('/agent/dashboard');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || !isVendorRole(user.role)) return;
    if (isShopAdminOnlyPath(pathname) && pathname !== VENDOR_HOME) {
      router.replace(VENDOR_HOME);
    }
  }, [user, pathname, router]);

  useEffect(() => {
    checkLicense(true);
  }, [checkLicense]);

  useEffect(() => {
    if (!user || !isShopAdminRole(user.role)) return;
    if (pathname === '/admin/license') return;
    checkLicense(false);
  }, [pathname, user, checkLicense]);

  useEffect(() => {
    if (licenseOk === false && isShopAdminRole(user?.role ?? '') && pathname !== '/admin/license') {
      router.replace('/admin/license');
    }
  }, [licenseOk, pathname, router, user]);

  if (isLoading || (!isVendorRole(user?.role ?? '') && !licenseReady)) {
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
