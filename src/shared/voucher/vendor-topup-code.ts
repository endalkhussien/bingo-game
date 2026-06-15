import crypto from 'crypto';

const TOPUP_SIGNING_KEY = 'tebib-bingo-v1-vendor-topup-signing-secret';

export interface VendorTopupPayload {
  amount: number;
  validUntil: number;
  shopName: string;
  nonce: string;
}

export interface GeneratedVendorTopup {
  code: string;
  amount: number;
  validUntil: number;
  shopName: string;
  nonce: string;
}

function sign(data: string): string {
  return crypto.createHmac('sha256', TOPUP_SIGNING_KEY).update(data).digest('hex').slice(0, 32);
}

function encodePayload(payload: VendorTopupPayload): string {
  return Buffer.from(JSON.stringify({
    a: payload.amount,
    e: payload.validUntil,
    s: payload.shopName,
    n: payload.nonce,
  }), 'utf8').toString('base64url');
}

function decodePayload(encoded: string): VendorTopupPayload | null {
  try {
    const raw = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      a?: number; e?: number; s?: string; n?: string;
    };
    if (!raw.s || !raw.n) return null;
    const amount = Number(raw.a);
    const validUntil = Number(raw.e);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    if (!Number.isFinite(validUntil) || validUntil <= 0) return null;
    return { amount, validUntil, shopName: raw.s, nonce: raw.n };
  } catch {
    return null;
  }
}

export function generateVendorTopupCode(
  shopName: string,
  amount: number,
  validDays = 30,
): GeneratedVendorTopup {
  const trimmed = shopName.trim() || 'Shop';
  if (amount <= 0 || amount > 1_000_000) {
    throw new Error('Amount must be between 1 and 1,000,000 ETB');
  }
  const nonce = crypto.randomBytes(8).toString('hex').toUpperCase();
  const validUntil = Math.floor(Date.now() / 1000) + validDays * 86400;
  const body = encodePayload({
    amount: Math.round(amount),
    validUntil,
    shopName: trimmed,
    nonce,
  });
  const sig = sign(body);
  return {
    code: `TVP-${body}-${sig}`,
    amount: Math.round(amount),
    validUntil,
    shopName: trimmed,
    nonce,
  };
}

export function parseVendorTopupCode(code: string): {
  valid: boolean;
  error?: string;
  payload?: VendorTopupPayload;
} {
  const normalized = code.trim();
  if (!normalized.startsWith('TVP-')) {
    return { valid: false, error: 'Invalid top-up code. Ask your vendor for a TVP- code.' };
  }

  const rest = normalized.slice(4);
  if (rest.length < 34) return { valid: false, error: 'Invalid top-up code format' };

  const sig = rest.slice(-32);
  if (!/^[a-f0-9]{32}$/i.test(sig) || rest[rest.length - 33] !== '-') {
    return { valid: false, error: 'Invalid top-up code format' };
  }

  const body = rest.slice(0, -33);
  if (!body) return { valid: false, error: 'Invalid top-up code format' };

  if (sign(body).toLowerCase() !== sig.toLowerCase()) {
    return { valid: false, error: 'Top-up signature invalid. Request a new code from your vendor.' };
  }

  const payload = decodePayload(body);
  if (!payload) return { valid: false, error: 'Top-up code could not be read' };

  return { valid: true, payload };
}

export function hashVendorTopupCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}
