import {
  generateOperatorLicenseCode,
  parseOperatorLicenseCode,
  type LicensePeriod,
} from '../../src/shared/voucher/operator-license-code';
import { getSetting, updateSettings } from './settings-service';
import { getDb } from './database-service';
import { gameRevenue, games } from '../../src/infrastructure/database/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

const KEY_UNTIL = 'operator_license_until';
const KEY_SHOP = 'operator_license_shop';
const KEY_PERIOD = 'operator_license_period';
const KEY_COMMISSION_RATE = 'vendor_commission_rate';

export async function getOperatorLicenseStatus() {
  const until = parseInt((await getSetting(KEY_UNTIL)) ?? '0', 10);
  const now = Math.floor(Date.now() / 1000);
  const shopName = (await getSetting(KEY_SHOP)) ?? '';
  const period = ((await getSetting(KEY_PERIOD)) ?? '') as LicensePeriod | '';
  const vendorCommissionRate = parseFloat((await getSetting(KEY_COMMISSION_RATE)) ?? '20');

  return {
    active: until > now,
    validUntil: until,
    shopName,
    period,
    vendorCommissionRate,
    daysRemaining: until > now ? Math.ceil((until - now) / 86400) : 0,
  };
}

export async function isOperatorLicensed(): Promise<boolean> {
  const status = await getOperatorLicenseStatus();
  return status.active;
}

export async function activateOperatorLicense(code: string) {
  const parsed = parseOperatorLicenseCode(code);
  if (!parsed.valid || !parsed.payload) {
    return { success: false, error: parsed.error ?? 'Invalid license code' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (parsed.payload.validUntil < now) {
    return { success: false, error: 'This license code has already expired' };
  }

  const currentUntil = parseInt((await getSetting(KEY_UNTIL)) ?? '0', 10);
  const newUntil = Math.max(currentUntil, parsed.payload.validUntil);

  await updateSettings({
    [KEY_UNTIL]: String(newUntil),
    [KEY_SHOP]: parsed.payload.shopName,
    [KEY_PERIOD]: parsed.payload.period,
    [KEY_COMMISSION_RATE]: String(parsed.payload.vendorCommissionRate),
  });

  return {
    success: true,
    data: {
      validUntil: newUntil,
      shopName: parsed.payload.shopName,
      period: parsed.payload.period,
      message: `License active until ${new Date(newUntil * 1000).toLocaleDateString()}`,
    },
  };
}

export async function generateVendorLicenseCode(
  shopName: string,
  validDays: 7 | 30,
  vendorCommissionRate: number,
) {
  if (!shopName.trim()) return { success: false, error: 'Enter shop name' };
  if (vendorCommissionRate < 0 || vendorCommissionRate > 100) {
    return { success: false, error: 'Commission rate must be 0–100%' };
  }

  const generated = generateOperatorLicenseCode(shopName.trim(), validDays, vendorCommissionRate);
  return {
    success: true,
    data: {
      code: generated.code,
      validUntil: generated.validUntil,
      shopName: generated.shopName,
      period: generated.period,
      validDays,
      vendorCommissionRate,
    },
  };
}

export async function getVendorCommissionReport(periodDays = 7) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const start = now - periodDays * 86400;

  const revenues = await db.select().from(gameRevenue)
    .where(and(gte(gameRevenue.calculatedAt, start), lte(gameRevenue.calculatedAt, now)))
    .all();

  let vendorCommissionDue = 0;
  let totalBets = 0;
  let gameCount = 0;

  for (const rev of revenues) {
    const game = await db.select().from(games).where(eq(games.id, rev.gameId)).get();
    if (!game || game.status !== 'COMPLETED') continue;
    vendorCommissionDue += rev.platformRevenue;
    totalBets += rev.totalBets;
    gameCount += 1;
  }

  const license = await getOperatorLicenseStatus();

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
