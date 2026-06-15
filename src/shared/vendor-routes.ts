export const VENDOR_HOME = '/vendor';
export const VENDOR_TOL = '/vendor/tol';
export const VENDOR_TOPUP = '/vendor/topup';
export const VENDOR_REPORTS = '/vendor/reports';

export function normalizeVendorPath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '');
}

export function isVendorPath(pathname: string, route: string): boolean {
  return normalizeVendorPath(pathname) === route;
}
