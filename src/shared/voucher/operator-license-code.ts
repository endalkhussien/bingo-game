import crypto from 'crypto';
import { decodeBase64Url, encodeBase64Url } from './base64url';

const LICENSE_SIGNING_KEY = 'tebib-bingo-v1-operator-license-signing-secret';

export type LicensePeriod = 'WEEKLY' | 'MONTHLY';

export interface OperatorLicensePayload {
  shopName: string;
  validUntil: number;
  period: LicensePeriod;
  vendorCommissionRate: number;
}

export interface GeneratedOperatorLicense {
  code: string;
  validUntil: number;
  shopName: string;
  period: LicensePeriod;
}

function sign(data: string): string {
  return crypto.createHmac('sha256', LICENSE_SIGNING_KEY).update(data).digest('hex').slice(0, 32);
}

function encodePayload(payload: OperatorLicensePayload): string {
  return encodeBase64Url(JSON.stringify({
    s: payload.shopName,
    e: payload.validUntil,
    p: payload.period,
    c: payload.vendorCommissionRate,
  }));
}

function decodePayload(encoded: string): OperatorLicensePayload | null {
  try {
    const raw = JSON.parse(decodeBase64Url(encoded)) as {
      s?: string; e?: number; p?: LicensePeriod; c?: number;
    };
    if (!raw.s || !raw.e || !raw.p) return null;
    const validUntil = Number(raw.e);
    if (!Number.isFinite(validUntil) || validUntil <= 0) return null;
    return {
      shopName: raw.s,
      validUntil,
      period: raw.p,
      vendorCommissionRate: typeof raw.c === 'number' ? raw.c : Number(raw.c) || 20,
    };
  } catch {
    return null;
  }
}

export function generateOperatorLicenseCode(
  shopName: string,
  validDays: number,
  vendorCommissionRate = 20,
): GeneratedOperatorLicense {
  const trimmed = shopName.trim() || 'Shop';
  const period: LicensePeriod = validDays >= 28 ? 'MONTHLY' : 'WEEKLY';
  const validUntil = Math.floor(Date.now() / 1000) + validDays * 86400;
  const body = encodePayload({
    shopName: trimmed,
    validUntil,
    period,
    vendorCommissionRate,
  });
  const sig = sign(body);
  return {
    code: `TOL-${body}-${sig}`,
    validUntil,
    shopName: trimmed,
    period,
  };
}

/** Strip spaces/newlines from pasted codes (Telegram, email wraps, etc.). */
export function normalizeOperatorLicenseCodeInput(code: string): string {
  return code.replace(/\s+/g, '');
}

export function parseOperatorLicenseCode(code: string): {
  valid: boolean;
  error?: string;
  payload?: OperatorLicensePayload;
} {
  const normalized = normalizeOperatorLicenseCodeInput(code);
  if (!normalized.startsWith('TOL-')) {
    return { valid: false, error: 'Invalid license code. Ask your vendor for a TOL- code.' };
  }

  const rest = normalized.slice(4);
  if (rest.length < 34) return { valid: false, error: 'Invalid license code format' };

  const sig = rest.slice(-32);
  if (!/^[a-f0-9]{32}$/i.test(sig) || rest[rest.length - 33] !== '-') {
    return { valid: false, error: 'Invalid license code format' };
  }

  const body = rest.slice(0, -33);
  if (!body) return { valid: false, error: 'Invalid license code format' };

  if (sign(body).toLowerCase() !== sig.toLowerCase()) {
    return { valid: false, error: 'License signature invalid. Request a new code from your vendor.' };
  }

  const payload = decodePayload(body);
  if (!payload) return { valid: false, error: 'License code could not be read' };

  const now = Math.floor(Date.now() / 1000);
  if (payload.validUntil < now) {
    return { valid: false, error: 'This license code has already expired' };
  }

  return { valid: true, payload };
}
