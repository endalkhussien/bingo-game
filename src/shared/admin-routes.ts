/** Vendor app — completely separate from shop admin. */
export const VENDOR_HOME = '/vendor';

/** Shop admin home after TOL is active. */
export const SHOP_ADMIN_HOME = '/admin/dashboard';

export const SHOP_ADMIN_LICENSE = '/admin/license';

/** Next.js uses trailingSlash — normalize before comparing route paths. */
export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '');
}

export function isAdminLicensePath(pathname: string): boolean {
  return normalizePathname(pathname) === SHOP_ADMIN_LICENSE;
}
