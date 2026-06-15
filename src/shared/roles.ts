/** Vendor (you) — full control, generates operator licenses. */
export const ROLE_VENDOR = 'SUPER_ADMIN' as const;

/** Shop owner — daily admin, requires active TOL license. */
export const ROLE_OPERATOR = 'OPERATOR' as const;

export const ROLE_AGENT = 'AGENT' as const;

export type UserRole = typeof ROLE_VENDOR | typeof ROLE_OPERATOR | typeof ROLE_AGENT;

export function isAdminRole(role: string): boolean {
  return role === ROLE_VENDOR || role === ROLE_OPERATOR;
}

export function isVendorRole(role: string): boolean {
  return role === ROLE_VENDOR;
}
