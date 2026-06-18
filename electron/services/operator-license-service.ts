import {
  generateAdminActivationCode,
  hashAdminActivationCode,
  normalizeAdminActivationCodeInput,
  parseAdminActivationCode,
} from '../../src/shared/voucher/admin-activation-code';
import { getSetting, updateSettings } from './settings-service';
import { getDb } from './database-service';
import { gameRevenue, games } from '../../src/infrastructure/database/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { creditOperatorWallet, getOperatorWalletBalance } from './operator-wallet-service';

const KEY_ACTIVATED = 'shop_admin_activated';
const KEY_SHOP = 'operator_license_shop';
const KEY_COMMISSION_RATE = 'vendor_commission_rate';
const KEY_USED_TAK = 'used_tak_hashes';

async function loadUsedTakHashes(): Promise<string[]> {
  try {
    const raw = await getSetting(KEY_USED_TAK);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((h) => typeof h === 'string') : [];
  } catch {
    return [];
  }
}

async function markTakUsed(hash: string) {
  const used = await loadUsedTakHashes();
  if (!used.includes(hash)) {
    used.push(hash);
    await updateSettings({ [KEY_USED_TAK]: JSON.stringify(used) });
  }
}

export async function isShopAdminActivated(): Promise<boolean> {
  return (await getSetting(KEY_ACTIVATED)) === '1';
}

export async function getOperatorLicenseStatus() {
  const active = await isShopAdminActivated();
  const shopName = (await getSetting(KEY_SHOP)) ?? '';
  const vendorCommissionRate = parseFloat((await getSetting(KEY_COMMISSION_RATE)) ?? '20');
  const walletBalance = await getOperatorWalletBalance();

  return {
    active,
    shopName,
    vendorCommissionRate,
    walletBalance,
    /** @deprecated TOL removed — kept for API compat */
    validUntil: active ? Math.floor(Date.now() / 1000) + 365 * 86400 : 0,
    period: '' as const,
    daysRemaining: active ? 365 : 0,
  };
}

export async function isOperatorLicensed(): Promise<boolean> {
  return isShopAdminActivated();
}

export async function activateOperatorLicense(code: string) {
  const normalized = normalizeAdminActivationCodeInput(code);
  const parsed = parseAdminActivationCode(normalized);
  if (!parsed.valid || !parsed.payload) {
    return { success: false, error: parsed.error ?? 'Invalid activation key' };
  }

  const codeHash = hashAdminActivationCode(normalized);
  const used = await loadUsedTakHashes();
  if (used.includes(codeHash)) {
    return { success: false, error: 'This activation key was already used.' };
  }

  const already = await isShopAdminActivated();
  if (already) {
    return { success: false, error: 'Shop admin is already activated on this PC.' };
  }

  const credit = await creditOperatorWallet(
    parsed.payload.amount,
    `Vendor activation — ${parsed.payload.shopName}`,
    'TAK',
    parsed.payload.nonce,
  );
  if (!credit.success || !('data' in credit)) {
    return { success: false, error: credit.error ?? 'Failed to credit shop balance' };
  }

  await updateSettings({
    [KEY_ACTIVATED]: '1',
    [KEY_SHOP]: parsed.payload.shopName,
    [KEY_COMMISSION_RATE]: String(parsed.payload.vendorCommissionRate),
  });
  await markTakUsed(codeHash);

  return {
    success: true,
    data: {
      shopName: parsed.payload.shopName,
      amount: parsed.payload.amount,
      walletBalance: credit.data.newBalance,
      message: `Activated! ${parsed.payload.amount.toFixed(0)} ETB added to shop balance.`,
    },
  };
}

export async function generateVendorActivationKey(
  shopName: string,
  amount: number,
  vendorCommissionRate: number,
) {
  if (!shopName.trim()) return { success: false, error: 'Enter shop name' };
  if (!amount || amount <= 0) return { success: false, error: 'Enter a valid ETB amount' };
  if (vendorCommissionRate < 0 || vendorCommissionRate > 100) {
    return { success: false, error: 'Commission rate must be 0–100%' };
  }

  const generated = generateAdminActivationCode(shopName.trim(), amount, vendorCommissionRate);
  return {
    success: true,
    data: {
      code: generated.code,
      amount: generated.amount,
      shopName: generated.shopName,
      vendorCommissionRate: generated.vendorCommissionRate,
    },
  };
}

/** @deprecated Use generateVendorActivationKey */
export async function generateVendorLicenseCode(
  shopName: string,
  _validDays: 7 | 30,
  vendorCommissionRate: number,
) {
  return generateVendorActivationKey(shopName, 1000, vendorCommissionRate);
}

export async function getVendorCommissionReport(periodDays = 7) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const start = now - periodDays * 86400;

  const revenues = await db.select().from(gameRevenue)
    .where(and(gte(gameRevenue.calculatedAt, start), lte(gameRevenue.calculatedAt, now)))
    .all();

  const license = await getOperatorLicenseStatus();
  let vendorCommissionDue = 0;
  let totalBets = 0;
  let gameCount = 0;

  for (const rev of revenues) {
    const game = await db.select().from(games).where(eq(games.id, rev.gameId)).get();
    if (!game || game.status !== 'COMPLETED') continue;
    const rate = license.vendorCommissionRate / 100;
    vendorCommissionDue += rev.platformRevenue * rate;
    totalBets += rev.totalBets;
    gameCount += 1;
  }

  return {
    periodDays,
    startDate: start,
    endDate: now,
    gameCount,
    totalBets,
    vendorCommissionDue,
    shopName: license.shopName,
    vendorCommissionRate: license.vendorCommissionRate,
    licenseActive: license.active,
    licenseValidUntil: license.validUntil,
  };
}
