'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/presentation/providers/auth-provider';
import { AdminSidebar } from '@/presentation/components/layout/admin-sidebar';
import { AdminHeader } from '@/presentation/components/layout/admin-header';
import { ipc } from '@/presentation/lib/ipc';
import { APP_NAME } from '@/shared/brand';
import { AppLogo } from '@/presentation/components/shared/app-logo';
import { isShopAdminRole, isVendorRole } from '@/shared/roles';
import { isAdminSetupPath, SHOP_ADMIN_HOME, TOL_JUST_ACTIVATED_KEY, VENDOR_HOME } from '@/shared/admin-routes';

/** Shop admin only — vendor uses /vendor, agents use /agent. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const onSetupPage = isAdminSetupPath(pathname);
  const [licenseOk, setLicenseOk] = useState<boolean | null>(null);
  const [licenseReady, setLicenseReady] = useState(false);
  const [licenseChecking, setLicenseChecking] = useState(false);
  const [tolJustActivated, setTolJustActivated] = useState(false);

  useEffect(() => {
    setTolJustActivated(sessionStorage.getItem(TOL_JUST_ACTIVATED_KEY) === '1');
  }, [pathname]);

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

    if (tolJustActivated) {
      if (licenseOk === true) {
        sessionStorage.removeItem(TOL_JUST_ACTIVATED_KEY);
        setTolJustActivated(false);
      }
      return;
    }

    if (licenseOk === false && isShopAdminRole(user?.role ?? '') && !onSetupPage) {
      router.replace('/admin/license/');
    }
  }, [licenseOk, licenseReady, licenseChecking, onSetupPage, router, user, checkLicense, tolJustActivated]);

  if (isLoading || (isShopAdminRole(user?.role ?? '') && !licenseReady)) {
    return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;
  }

  if (!user || !isShopAdminRole(user.role)) {
    return null;
  }

  if (onSetupPage) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AppLogo size={36} />
              <div>
                <p className="font-bold text-gray-900">{APP_NAME}</p>
                <p className="text-xs text-gray-500">Shop admin setup</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Link href="/admin/license/" className="font-medium text-indigo-700 hover:underline">TOL License</Link>
              <Link href="/admin/settings/backup/" className="font-medium text-gray-700 hover:underline">Backup & Data</Link>
              {licenseOk && (
                <Link href={SHOP_ADMIN_HOME} className="font-medium text-gray-700 hover:underline">Dashboard</Link>
              )}
              <button
                type="button"
                onClick={() => logout()}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-gray-700 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-3xl p-6">{children}</main>
      </div>
    );
  }

  if (licenseOk === false && !onSetupPage) {
    if (licenseChecking || tolJustActivated) {
      return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;
    }
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
