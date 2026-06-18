import { SHOP_ADMIN_HOME, SHOP_ADMIN_LICENSE, VENDOR_HOME } from './admin-routes';

/** 1. Vendor — generates TAK activation keys and TVP top-ups for shop admin. */
export const ROLE_VENDOR = 'SUPER_ADMIN' as const;

/** 2. Shop admin — activates with TAK, creates agents, issues TAS/TBG codes. */
export const ROLE_OPERATOR = 'OPERATOR' as const;

/** 3. Agent — hall PC; activates with TAS from shop admin. */
export const ROLE_AGENT = 'AGENT' as const;

export type UserRole = typeof ROLE_VENDOR | typeof ROLE_OPERATOR | typeof ROLE_AGENT;

export function isAdminRole(role: string): boolean {
  return role === ROLE_VENDOR || role === ROLE_OPERATOR;
}

export function isVendorRole(role: string): boolean {
  return role === ROLE_VENDOR;
}

export function isShopAdminRole(role: string): boolean {
  return role === ROLE_OPERATOR;
}

export function getPostLoginPath(role: string): string {
  if (role === ROLE_VENDOR) return VENDOR_HOME;
  if (role === ROLE_OPERATOR) return SHOP_ADMIN_HOME;
  return '/agent/dashboard';
}

export function getShopAdminEntryPath(status: {
  activated?: boolean;
  active?: boolean;
  needsActivation?: boolean;
  needsTopup?: boolean;
} | boolean): string {
  if (typeof status === 'boolean') {
    return status ? SHOP_ADMIN_HOME : SHOP_ADMIN_LICENSE;
  }
  if (status.needsActivation || status.activated === false) return SHOP_ADMIN_LICENSE;
  if (status.activated || status.active) return SHOP_ADMIN_HOME;
  return SHOP_ADMIN_LICENSE;
}

export type ShopLicenseStatus = {
  activated: boolean;
  active: boolean;
  needsActivation: boolean;
  needsTopup: boolean;
  shopName?: string;
  walletBalance?: number;
};

export function getRoleLabel(role: string): string {
  if (role === ROLE_VENDOR) return 'Vendor';
  if (role === ROLE_OPERATOR) return 'Shop Admin';
  if (role === ROLE_AGENT) return 'Agent';
  return role;
}
