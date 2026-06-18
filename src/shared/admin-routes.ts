/** Vendor app — completely separate from shop admin. */
export const VENDOR_HOME = '/vendor';

/** Shop admin home after activation (trailing slash matches Next.js config). */
export const SHOP_ADMIN_HOME = '/admin/dashboard/';

export const SHOP_ADMIN_LICENSE = '/admin/license/';

/** Set after successful activation to avoid redirect race. */
export const TOL_JUST_ACTIVATED_KEY = 'tebib_tol_just_activated';

export const SHOP_ADMIN_WALLET = '/admin/wallet/';

export const SHOP_ADMIN_BACKUP = '/admin/settings/backup/';

/** Pages reachable before shop admin is fully operational (activation / top-up). */
export const SHOP_ADMIN_SETUP_PATHS = [SHOP_ADMIN_LICENSE, SHOP_ADMIN_WALLET, SHOP_ADMIN_BACKUP] as const;

/** Next.js uses trailingSlash — normalize before comparing route paths. */
export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '');
}

export function isAdminLicensePath(pathname: string): boolean {
  return normalizePathname(pathname) === normalizePathname(SHOP_ADMIN_LICENSE);
}

export function isAdminWalletPath(pathname: string): boolean {
  return normalizePathname(pathname) === normalizePathname(SHOP_ADMIN_WALLET);
}

export function isAdminSetupPath(pathname: string): boolean {
  const n = normalizePathname(pathname);
  return (SHOP_ADMIN_SETUP_PATHS as readonly string[]).some(
    (p) => normalizePathname(p) === n,
  );
}
