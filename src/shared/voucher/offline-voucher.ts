import crypto from 'crypto';

export interface OfflineVoucherPayload {
  amount: number;
  nonce: string;
  expiresAt: number;
  forUsername: string;
  serial: number;
}

export interface GeneratedOfflineVoucher {
  code: string;
  amount: number;
  expiresAt: number;
  forUsername: string;
  nonce: string;
  serial: number;
  codeHash: string;
}

function signPayload(payload: string, orgSecret: string): string {
  return crypto.createHmac('sha256', orgSecret).update(payload).digest('hex').slice(0, 32);
}

export function hashOfflineVoucherCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

/** Admin generates a unique one-time recharge code (requires organization secret) */
export function generateOfflineVoucher(
  amount: number,
  orgSecret: string,
  options?: { forUsername?: string; validDays?: number; serial?: number },
): GeneratedOfflineVoucher {
  if (!orgSecret || orgSecret.length < 32) {
    throw new Error('Organization recharge key is not configured');
  }
  if (amount <= 0 || amount > 100000) {
    throw new Error('Amount must be between 1 and 100000 ETB');
  }

  const forUsername = (options?.forUsername ?? '').trim().toLowerCase();
  if (!forUsername || !/^[a-z0-9_]{2,32}$/.test(forUsername)) {
    throw new Error('You must select an agent — each code is unique and bound to one agent');
  }

  const nonce = crypto.randomBytes(8).toString('hex').toUpperCase();
  const validDays = options?.validDays ?? 14;
  const expiresAt = Math.floor(Date.now() / 1000) + validDays * 86400;
  const serial = options?.serial ?? 0;

  const payload = `${Math.round(amount)}|${nonce}|${expiresAt}|${forUsername}`;
  const sig = signPayload(payload, orgSecret);
  const code = `TBG-${Math.round(amount)}-${nonce}-${expiresAt.toString(36).toUpperCase()}-${forUsername}-${sig}`;

  return {
    code,
    amount: Math.round(amount),
    expiresAt,
    forUsername,
    nonce,
    serial,
    codeHash: hashOfflineVoucherCode(code),
  };
}

export function parseOfflineVoucher(code: string, orgSecret: string): OfflineVoucherPayload | null {
  if (!orgSecret || orgSecret.length < 32) return null;

  const normalized = code.trim().toUpperCase();
  const parts = normalized.split('-');
  if (parts.length < 6 || parts[0] !== 'TBG') return null;

  const amount = parseInt(parts[1], 10);
  const nonce = parts[2];
  const expiresAt = parseInt(parts[3], 36);
  const forUsername = parts[4].toLowerCase();
  const sig = parts[5];

  if (!amount || !nonce || nonce.length < 16 || !expiresAt || !sig || sig.length < 32) return null;
  if (!/^[a-z0-9_]{2,32}$/.test(forUsername)) return null;

  const payload = `${amount}|${nonce}|${expiresAt}|${forUsername}`;
  if (signPayload(payload, orgSecret).toLowerCase() !== sig.toLowerCase()) return null;

  return { amount, nonce, expiresAt, forUsername, serial: 0 };
}

export function verifyOfflineVoucher(
  code: string,
  orgSecret: string,
  agentUsername?: string,
): { valid: boolean; error?: string; payload?: OfflineVoucherPayload; codeHash?: string } {
  if (!orgSecret || orgSecret.length < 32) {
    return { valid: false, error: 'Organization recharge key not configured. Ask admin for the key and add it in Settings.' };
  }

  const payload = parseOfflineVoucher(code, orgSecret);
  if (!payload) return { valid: false, error: 'Invalid recharge code or wrong organization key' };

  const now = Math.floor(Date.now() / 1000);
  if (payload.expiresAt < now) {
    return { valid: false, error: 'This recharge code has expired' };
  }

  if (!agentUsername || payload.forUsername !== agentUsername.trim().toLowerCase()) {
    return { valid: false, error: 'This code is for a different agent account' };
  }

  return { valid: true, payload, codeHash: hashOfflineVoucherCode(code) };
}

export function offlineVoucherNonceKey(nonce: string): string {
  return nonce.toUpperCase();
}

export function generateOrganizationKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
