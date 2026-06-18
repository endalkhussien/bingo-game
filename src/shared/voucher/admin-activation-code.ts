import crypto from 'crypto';
import { decodeBase64Url, encodeBase64Url } from './base64url';

const ACTIVATION_SIGNING_KEY = 'waliya-v1-admin-activation-signing-secret';

export interface AdminActivationPayload {
  shopName: string;
  amount: number;
  vendorCommissionRate: number;
  nonce: string;
}

export interface GeneratedAdminActivation {
  code: string;
  amount: number;
  shopName: string;
  vendorCommissionRate: number;
  nonce: string;
}

function sign(data: string): string {
  return crypto.createHmac('sha256', ACTIVATION_SIGNING_KEY).update(data).digest('hex').slice(0, 32);
}

function encodePayload(payload: AdminActivationPayload): string {
  return encodeBase64Url(JSON.stringify({
    s: payload.shopName,
    a: payload.amount,
    c: payload.vendorCommissionRate,
    n: payload.nonce,
  }));
}

function decodePayload(encoded: string): AdminActivationPayload | null {
  try {
    const raw = JSON.parse(decodeBase64Url(encoded)) as {
      s?: string; a?: number; c?: number; n?: string;
    };
    if (!raw.s || !raw.n) return null;
    const amount = Number(raw.a);
    const rate = Number(raw.c);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return {
      shopName: raw.s,
      amount: Math.round(amount),
      vendorCommissionRate: Number.isFinite(rate) ? rate : 20,
      nonce: raw.n,
    };
  } catch {
    return null;
  }
}

export function generateAdminActivationCode(
  shopName: string,
  amount: number,
  vendorCommissionRate = 20,
): GeneratedAdminActivation {
  const trimmed = shopName.trim() || 'Shop';
  if (amount <= 0 || amount > 1_000_000) {
    throw new Error('Amount must be between 1 and 1,000,000 ETB');
  }
  const nonce = crypto.randomBytes(8).toString('hex').toUpperCase();
  const body = encodePayload({
    shopName: trimmed,
    amount: Math.round(amount),
    vendorCommissionRate: Math.min(100, Math.max(0, vendorCommissionRate)),
    nonce,
  });
  const sig = sign(body);
  return {
    code: `TAK-${body}-${sig}`,
    amount: Math.round(amount),
    shopName: trimmed,
    vendorCommissionRate: Math.min(100, Math.max(0, vendorCommissionRate)),
    nonce,
  };
}

export function normalizeAdminActivationCodeInput(code: string): string {
  return code.replace(/\s+/g, '');
}

export function parseAdminActivationCode(code: string): {
  valid: boolean;
  error?: string;
  payload?: AdminActivationPayload;
} {
  const normalized = normalizeAdminActivationCodeInput(code);
  if (!normalized.startsWith('TAK-')) {
    return { valid: false, error: 'Invalid activation key. Ask your vendor for a TAK- code.' };
  }

  const rest = normalized.slice(4);
  if (rest.length < 34) return { valid: false, error: 'Invalid activation key format' };

  const sig = rest.slice(-32);
  if (!/^[a-f0-9]{32}$/i.test(sig) || rest[rest.length - 33] !== '-') {
    return { valid: false, error: 'Invalid activation key format' };
  }

  const body = rest.slice(0, -33);
  if (!body) return { valid: false, error: 'Invalid activation key format' };

  if (sign(body).toLowerCase() !== sig.toLowerCase()) {
    return { valid: false, error: 'Activation signature invalid. Request a new key from your vendor.' };
  }

  const payload = decodePayload(body);
  if (!payload) return { valid: false, error: 'Activation key could not be read' };

  return { valid: true, payload };
}

export function hashAdminActivationCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}
