/** Vendor home — TOL generation + activity board only. */
export const VENDOR_HOME = '/admin/vendor';

/** Shop admin home after TOL is active. */
export const SHOP_ADMIN_HOME = '/admin/dashboard';

/** Routes reserved for shop admin (OPERATOR). Vendor is redirected away. */
export const SHOP_ADMIN_ONLY_PREFIXES = [
  '/admin/dashboard',
  '/admin/agents',
  '/admin/vouchers',
  '/admin/recharge',
  '/admin/games',
  '/admin/reports',
  '/admin/settings',
  '/admin/license',
  '/admin/pricing',
  '/admin/commissions',
  '/admin/audit-logs',
  '/admin/notifications',
] as const;

export function isShopAdminOnlyPath(pathname: string): boolean {
  return SHOP_ADMIN_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
