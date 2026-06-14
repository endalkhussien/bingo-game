import crypto from 'crypto';

/** Shared across all installs — lets any agent PC verify codes from admin PC without network */
const VOUCHER_SECRET = 'TEBIB-BINGO-OFFLINE-VOUCHER-v1';

export interface OfflineVoucherPayload {
  amount: number;
  nonce: string;
  expiresAt: number;
  forUsername: string;
}

export interface GeneratedOfflineVoucher {
  code: string;
  amount: number;
  expiresAt: number;
  forUsername: string;
  nonce: string;
}

function signPayload(payload: string): string {
  return crypto.createHmac('sha256', VOUCHER_SECRET).update(payload).digest('hex').slice(0, 16);
}

/** Admin generates a one-time recharge code for disconnected agents */
export function generateOfflineVoucher(
  amount: number,
  options?: { forUsername?: string; validDays?: number },
): GeneratedOfflineVoucher {
  if (amount <= 0 || amount > 100000) {
    throw new Error('Amount must be between 1 and 100000 ETB');
  }

  const nonce = crypto.randomBytes(5).toString('hex').toUpperCase();
  const validDays = options?.validDays ?? 30;
  const expiresAt = Math.floor(Date.now() / 1000) + validDays * 86400;
  const forUsername = (options?.forUsername ?? '').trim().toLowerCase();

  const payload = `${Math.round(amount)}|${nonce}|${expiresAt}|${forUsername}`;
  const sig = signPayload(payload);
  const code = `TBG-${Math.round(amount)}-${nonce}-${expiresAt.toString(36).toUpperCase()}-${forUsername || 'ANY'}-${sig}`;

  return { code, amount: Math.round(amount), expiresAt, forUsername, nonce };
}

export function parseOfflineVoucher(code: string): OfflineVoucherPayload | null {
  const normalized = code.trim().toUpperCase();
  const parts = normalized.split('-');
  if (parts.length < 6 || parts[0] !== 'TBG') return null;

  const amount = parseInt(parts[1], 10);
  const nonce = parts[2];
  const expiresAt = parseInt(parts[3], 36);
  const forUsername = parts[4] === 'ANY' ? '' : parts[4].toLowerCase();
  const sig = parts[5];

  if (!amount || !nonce || !expiresAt || !sig) return null;

  const payload = `${amount}|${nonce}|${expiresAt}|${forUsername}`;
  if (signPayload(payload) !== sig) return null;

  return { amount, nonce, expiresAt, forUsername };
}

export function verifyOfflineVoucher(
  code: string,
  agentUsername?: string,
): { valid: boolean; error?: string; payload?: OfflineVoucherPayload } {
  const payload = parseOfflineVoucher(code);
  if (!payload) return { valid: false, error: 'Invalid recharge code format or signature' };

  const now = Math.floor(Date.now() / 1000);
  if (payload.expiresAt < now) {
    return { valid: false, error: 'This recharge code has expired' };
  }

  if (payload.forUsername && agentUsername) {
    if (payload.forUsername !== agentUsername.trim().toLowerCase()) {
      return { valid: false, error: 'This code is for a different agent account' };
    }
  }

  return { valid: true, payload };
}

export function offlineVoucherNonceKey(nonce: string): string {
  return nonce.toUpperCase();
}
