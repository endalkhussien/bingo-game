import { v4 as uuid } from 'uuid';
import { desc } from 'drizzle-orm';
import { getDb } from './database-service';
import { issuedVendorTopups } from '../../src/infrastructure/database/schema';
import {
  generateVendorTopupCode,
  hashVendorTopupCode,
} from '../../src/shared/voucher/vendor-topup-code';

export async function generateVendorTopup(
  vendorUserId: string,
  shopName: string,
  amount: number,
) {
  if (!shopName.trim()) return { success: false, error: 'Enter shop name' };
  if (amount <= 0 || amount > 1_000_000) {
    return { success: false, error: 'Amount must be between 1 and 1,000,000 ETB' };
  }

  const generated = generateVendorTopupCode(shopName.trim(), amount);
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const id = uuid();

  await db.insert(issuedVendorTopups).values({
    id,
    code: generated.code,
    codeHash: hashVendorTopupCode(generated.code),
    amount: generated.amount,
    shopName: generated.shopName,
    nonce: generated.nonce,
    expiresAt: generated.validUntil,
    status: 'ISSUED',
    issuedBy: vendorUserId,
    issuedAt: now,
  });

  return {
    success: true,
    data: {
      code: generated.code,
      amount: generated.amount,
      validUntil: generated.validUntil,
      shopName: generated.shopName,
    },
  };
}

export async function listVendorTopups(limit = 50) {
  const db = getDb();
  return db.select().from(issuedVendorTopups)
    .orderBy(desc(issuedVendorTopups.issuedAt))
    .limit(limit)
    .all();
}

export async function getVendorTopupSummary() {
  const rows = await listVendorTopups(200);
  const now = Math.floor(Date.now() / 1000);
  let totalIssued = 0;
  let pendingCount = 0;
  let redeemedCount = 0;

  for (const row of rows) {
    totalIssued += row.amount;
    if (row.status === 'REDEEMED') redeemedCount += 1;
    else if (row.expiresAt >= now) pendingCount += 1;
  }

  return {
    totalIssued,
    codeCount: rows.length,
    pendingCount,
    redeemedCount,
    recent: rows.slice(0, 10),
  };
}
