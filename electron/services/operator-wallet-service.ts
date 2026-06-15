import { v4 as uuid } from 'uuid';
import { desc, eq } from 'drizzle-orm';
import { getDb } from './database-service';
import { operatorWalletTransactions, usedVendorTopups } from '../../src/infrastructure/database/schema';
import { getSetting, updateSettings } from './settings-service';
import {
  parseVendorTopupCode,
  hashVendorTopupCode,
} from '../../src/shared/voucher/vendor-topup-code';

const KEY_BALANCE = 'operator_wallet_balance';

export async function getOperatorWalletBalance() {
  const raw = await getSetting(KEY_BALANCE);
  const balance = parseFloat(raw ?? '0');
  return Number.isFinite(balance) ? balance : 0;
}

export async function getOperatorWalletTransactions(limit = 50) {
  const db = getDb();
  return db.select().from(operatorWalletTransactions)
    .orderBy(desc(operatorWalletTransactions.createdAt))
    .limit(limit)
    .all();
}

async function adjustOperatorWallet(
  amount: number,
  transactionType: string,
  description: string,
  referenceType?: string,
  referenceId?: string,
) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const current = await getOperatorWalletBalance();
  const newBalance = current + amount;
  if (newBalance < 0) {
    return { success: false as const, error: `Insufficient shop admin balance (${current.toFixed(0)} ETB)` };
  }

  await updateSettings({ [KEY_BALANCE]: String(newBalance) });
  const id = uuid();
  await db.insert(operatorWalletTransactions).values({
    id,
    amount,
    transactionType,
    referenceType: referenceType ?? null,
    referenceId: referenceId ?? null,
    description,
    balanceAfter: newBalance,
    createdAt: now,
  });

  return { success: true as const, data: { newBalance, transactionId: id } };
}

export async function creditOperatorWallet(
  amount: number,
  description: string,
  referenceType?: string,
  referenceId?: string,
) {
  if (amount <= 0) return { success: false, error: 'Amount must be positive' };
  return adjustOperatorWallet(amount, 'TOPUP', description, referenceType, referenceId);
}

export async function debitOperatorWallet(
  amount: number,
  description: string,
  referenceType?: string,
  referenceId?: string,
) {
  if (amount <= 0) return { success: false, error: 'Amount must be positive' };
  return adjustOperatorWallet(-amount, 'ISSUE_TBG', description, referenceType, referenceId);
}

export async function redeemVendorTopupCode(code: string) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const parsed = parseVendorTopupCode(code);
  if (!parsed.valid || !parsed.payload) {
    return { success: false, error: parsed.error ?? 'Invalid TVP code' };
  }

  const { amount, validUntil, shopName, nonce } = parsed.payload;
  if (validUntil < now) {
    return { success: false, error: 'This top-up code has expired' };
  }

  const codeHash = hashVendorTopupCode(code);
  const usedByHash = await db.select().from(usedVendorTopups)
    .where(eq(usedVendorTopups.codeHash, codeHash)).get();
  const usedByNonce = await db.select().from(usedVendorTopups)
    .where(eq(usedVendorTopups.nonce, nonce)).get();
  if (usedByHash || usedByNonce) {
    return { success: false, error: 'This top-up code was already used' };
  }

  const usedId = uuid();
  await db.insert(usedVendorTopups).values({
    id: usedId,
    codeHash,
    nonce,
    amount,
    shopName,
    redeemedAt: now,
  });

  const credited = await creditOperatorWallet(
    amount,
    `Vendor top-up for ${shopName}`,
    'vendor_topup',
    usedId,
  );
  if (!credited.success || !('data' in credited)) {
    return credited;
  }

  return {
    success: true,
    data: {
      amount,
      newBalance: credited.data.newBalance,
      shopName,
      message: `${amount.toFixed(0)} ETB added to shop admin balance`,
    },
  };
}
