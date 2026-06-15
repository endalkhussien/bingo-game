'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/presentation/providers/auth-provider';
import { AdminSidebar } from '@/presentation/components/layout/admin-sidebar';
import { AdminHeader } from '@/presentation/components/layout/admin-header';
import { ipc } from '@/presentation/lib/ipc';
import { isShopAdminRole, isVendorRole } from '@/shared/roles';
import { isAdminLicensePath, VENDOR_HOME } from '@/shared/admin-routes';

/** Shop admin only — vendor uses /vendor, agents use /agent. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const onLicensePage = isAdminLicensePath(pathname);
  const [licenseOk, setLicenseOk] = useState<boolean | null>(null);
  const [licenseReady, setLicenseReady] = useState(false);
  const [licenseChecking, setLicenseChecking] = useState(false);

  const checkLicense = useCallback((showSpinner = false) => {
    if (!user || !isShopAdminRole(user.role)) return;
    if (showSpinner) setLicenseReady(false);
    setLicenseChecking(true);
    ipc<{ active: boolean }>('license:status')
      .then((s) => setLicenseOk(s.active))
      .catch(() => setLicenseOk(false))
      .finally(() => {
        setLicenseReady(true);
        setLicenseChecking(false);
      });
  }, [user]);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
    if (!isLoading && user && isVendorRole(user.role)) router.replace(VENDOR_HOME);
    if (!isLoading && user && user.role === 'AGENT') router.replace('/agent/dashboard');
  }, [user, isLoading, router]);

  useEffect(() => {
    checkLicense(true);
  }, [checkLicense]);

  useEffect(() => {
    if (!user || !isShopAdminRole(user.role)) return;
    checkLicense(false);
  }, [pathname, user, checkLicense]);

  useEffect(() => {
    if (licenseChecking || !licenseReady) return;
    if (licenseOk === false && isShopAdminRole(user?.role ?? '') && !onLicensePage) {
      router.replace('/admin/license');
    }
  }, [licenseOk, licenseReady, licenseChecking, onLicensePage, router, user]);

  if (isLoading || (isShopAdminRole(user?.role ?? '') && !licenseReady)) {
    return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;
  }

  if (!user || !isShopAdminRole(user.role)) {
    return null;
  }

  if (onLicensePage) {
    return <main className="min-h-screen bg-gray-50 p-6">{children}</main>;
  }

  if (licenseOk === false) {
    return null;
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
