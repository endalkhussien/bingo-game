'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/presentation/providers/auth-provider';
import { AdminSidebar } from '@/presentation/components/layout/admin-sidebar';
import { AdminHeader } from '@/presentation/components/layout/admin-header';
import { AdminBalanceBanner } from '@/presentation/components/layout/admin-balance-banner';
import { UserMenuDropdown } from '@/presentation/components/layout/user-menu-dropdown';
import { ipc } from '@/presentation/lib/ipc';
import { APP_NAME } from '@/shared/brand';
import { AppLogo } from '@/presentation/components/shared/app-logo';
import { isShopAdminRole, isVendorRole, type ShopLicenseStatus } from '@/shared/roles';
import {
  isAdminLicensePath,
  isAdminSetupPath,
  SHOP_ADMIN_LICENSE,
  TOL_JUST_ACTIVATED_KEY,
  VENDOR_HOME,
} from '@/shared/admin-routes';

/** Shop admin only — vendor uses /vendor, agents use /agent. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const onSetupPage = isAdminSetupPath(pathname);
  const [licenseStatus, setLicenseStatus] = useState<ShopLicenseStatus | null>(null);
  const [licenseReady, setLicenseReady] = useState(false);
  const [licenseChecking, setLicenseChecking] = useState(false);
  const [justActivated, setJustActivated] = useState(false);

  useEffect(() => {
    setJustActivated(sessionStorage.getItem(TOL_JUST_ACTIVATED_KEY) === '1');
  }, [pathname]);

  const checkLicense = useCallback((showSpinner = false) => {
    if (showSpinner) setLicenseReady(false);
    setLicenseChecking(true);

    if (!user || !isShopAdminRole(user.role)) {
      setLicenseStatus(null);
      setLicenseReady(true);
      setLicenseChecking(false);
      return;
    }

    ipc<ShopLicenseStatus>('license:status')
      .then((s) => setLicenseStatus(s))
      .catch(() => setLicenseStatus({
        activated: false,
        active: false,
        needsActivation: true,
        needsTopup: false,
      }))
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
    if (licenseChecking || !licenseReady || !licenseStatus) return;

    if (justActivated) {
      if (licenseStatus.activated) {
        sessionStorage.removeItem(TOL_JUST_ACTIVATED_KEY);
        setJustActivated(false);
      }
      return;
    }

    if (!isShopAdminRole(user?.role ?? '')) return;

    if (licenseStatus.needsActivation && !isAdminLicensePath(pathname)) {
      router.replace(SHOP_ADMIN_LICENSE);
    }
  }, [licenseStatus, licenseReady, licenseChecking, pathname, router, user, justActivated]);

  useEffect(() => {
    const refresh = () => checkLicense(false);
    window.addEventListener('waliya:balance-updated', refresh);
    return () => window.removeEventListener('waliya:balance-updated', refresh);
  }, [checkLicense]);

  if (isLoading || (user && isShopAdminRole(user.role) && !licenseReady)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#1a1410]">
        <AppLogo size={72} className="rounded-2xl shadow-lg" />
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        <p className="text-lg font-medium text-amber-100/80">Loading…</p>
      </div>
    );
  }

  if (!user || !isShopAdminRole(user.role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#1a1410] p-6 text-center">
        <AppLogo size={80} className="rounded-2xl shadow-lg" />
        <p className="text-xl font-bold text-white">Please sign in first</p>
        <p className="max-w-sm text-amber-100/70">Use username <strong className="text-white">admin</strong> on the login page, then come back here.</p>
        <Link
          href="/login/"
          className="rounded-xl bg-amber-600 px-8 py-3 text-lg font-bold text-white hover:bg-amber-700"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (onSetupPage) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1410] to-[#2a1f18]">
        <header className="border-b border-amber-900/40 bg-[#1a1410]/90 px-6 py-4 shadow-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <AppLogo size={56} className="rounded-2xl shadow-md ring-2 ring-amber-500/20" />
              <div>
                <p className="text-lg font-bold text-white">{APP_NAME}</p>
                <p className="text-sm text-amber-200/70">Shop Admin Setup</p>
              </div>
            </div>
            <UserMenuDropdown variant="dark" />
          </div>
        </header>
        <main>{children}</main>
      </div>
    );
  }

  if (licenseStatus?.needsActivation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#1a1410] p-6 text-center">
        <AppLogo size={80} className="rounded-2xl shadow-lg" />
        <p className="text-xl font-bold text-white">Activation required</p>
        <p className="text-amber-100/70">Ask your vendor for a TAK activation key, then paste it on the next screen.</p>
        <Link
          href={SHOP_ADMIN_LICENSE}
          className="rounded-xl bg-amber-600 px-8 py-3 text-lg font-bold text-white hover:bg-amber-700"
        >
          Enter Activation Key
        </Link>
      </div>
    );
  }

  const shopBalance = licenseStatus?.walletBalance ?? 0;

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <AdminBalanceBanner balance={shopBalance} />
        <main className="flex-1 overflow-auto bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}
