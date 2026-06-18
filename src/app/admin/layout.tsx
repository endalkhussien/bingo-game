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
    if (showSpinner) setLicenseReady(false);
    setLicenseChecking(true);

    if (!user || !isShopAdminRole(user.role)) {
      setLicenseOk(null);
      setLicenseReady(true);
      setLicenseChecking(false);
      return;
    }

    ipc<{ active: boolean }>('license:status')
      .then((s) => setLicenseOk(s.active))
      .catch(() => setLicenseOk(false))
      .finally(() => {
        setLicenseReady(true);
        setLicenseChecking(false);
      });
  }, [user]);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login/');
    if (!isLoading && user && isVendorRole(user.role)) router.replace(VENDOR_HOME);
    if (!isLoading && user && user.role === 'AGENT') router.replace('/agent/dashboard/');
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
  }, [licenseOk, licenseReady, licenseChecking, onSetupPage, router, user, tolJustActivated]);

  if (isLoading || (user && isShopAdminRole(user.role) && !licenseReady)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-lg font-medium text-slate-700">Loading…</p>
      </div>
    );
  }

  if (!user || !isShopAdminRole(user.role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 p-6 text-center">
        <AppLogo size={64} />
        <p className="text-xl font-bold text-slate-900">Please sign in first</p>
        <p className="max-w-sm text-slate-600">Use username <strong>admin</strong> on the login page, then come back here.</p>
        <Link
          href="/login/"
          className="rounded-xl bg-emerald-600 px-8 py-3 text-lg font-bold text-white hover:bg-emerald-700"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (onSetupPage) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white">
        <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AppLogo size={40} />
              <div>
                <p className="text-lg font-bold text-slate-900">{APP_NAME}</p>
                <p className="text-sm text-slate-500">Shop Admin Setup</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </header>
        <main>{children}</main>
      </div>
    );
  }

  if (licenseOk === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 p-6 text-center">
        <p className="text-xl font-bold text-slate-900">Activation required</p>
        <p className="text-slate-600">Ask your vendor for an activation key, then paste it on the next screen.</p>
        <Link
          href="/admin/license/"
          className="rounded-xl bg-emerald-600 px-8 py-3 text-lg font-bold text-white hover:bg-emerald-700"
        >
          Enter Activation Key
        </Link>
      </div>
    );
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
