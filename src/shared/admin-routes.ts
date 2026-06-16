/** Vendor app — completely separate from shop admin. */
export const VENDOR_HOME = '/vendor';

/** Shop admin home after TOL is active (trailing slash matches Next.js config). */
export const SHOP_ADMIN_HOME = '/admin/dashboard/';

export const SHOP_ADMIN_LICENSE = '/admin/license/';

/** Set after successful TOL activation to avoid license-gate redirect race. */
export const TOL_JUST_ACTIVATED_KEY = 'tebib_tol_just_activated';

export const SHOP_ADMIN_BACKUP = '/admin/settings/backup/';

/** Pages reachable before TOL is active (setup / wipe data). */
export const SHOP_ADMIN_SETUP_PATHS = [SHOP_ADMIN_LICENSE, SHOP_ADMIN_BACKUP] as const;

/** Next.js uses trailingSlash — normalize before comparing route paths. */
export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '');
}

export function isAdminLicensePath(pathname: string): boolean {
  return normalizePathname(pathname) === SHOP_ADMIN_LICENSE;
}

export function isAdminSetupPath(pathname: string): boolean {
  const n = normalizePathname(pathname);
  return (SHOP_ADMIN_SETUP_PATHS as readonly string[]).includes(n);
}
