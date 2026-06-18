import { v4 as uuid } from 'uuid';
import { desc } from 'drizzle-orm';
import type Database from 'better-sqlite3';
import { getDb } from './database-service';
import { operatorWalletTransactions } from '../../src/infrastructure/database/schema';
import { getSetting } from './settings-service';
import {
  parseVendorTopupCode,
  hashVendorTopupCode,
  normalizeVendorTopupCodeInput,
} from '../../src/shared/voucher/vendor-topup-code';

const KEY_BALANCE = 'operator_wallet_balance';

function getSqlite(): Database.Database {
  const db = getDb();
  return (db as unknown as { $client: Database.Database }).$client;
}

export async function getOperatorWalletBalance() {
  const raw = await getSetting(KEY_BALANCE);
  const balance = parseFloat(raw ?? '0');
  return Number.isFinite(balance) ? Math.round(balance * 100) / 100 : 0;
}

export async function getOperatorWalletTransactions(limit = 50) {
  const db = getDb();
  return db.select().from(operatorWalletTransactions)
    .orderBy(desc(operatorWalletTransactions.createdAt))
    .limit(limit)
    .all();
}

function creditOperatorWalletInTransaction(
  sqlite: Database.Database,
  amount: number,
  transactionType: string,
  description: string,
  referenceType?: string,
  referenceId?: string,
) {
  const now = Math.floor(Date.now() / 1000);
  const row = sqlite.prepare('SELECT value FROM system_settings WHERE key = ?').get(KEY_BALANCE) as { value: string } | undefined;
  const current = parseFloat(row?.value ?? '0');
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const newBalance = Math.round((safeCurrent + amount) * 100) / 100;
  if (newBalance < 0) {
    return { success: false as const, error: `Insufficient shop admin balance (${safeCurrent.toFixed(0)} ETB)` };
  }

  sqlite.prepare(
    `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(KEY_BALANCE, String(newBalance), now);

  const id = uuid();
  sqlite.prepare(
    `INSERT INTO operator_wallet_transactions (id, amount, transaction_type, reference_type, reference_id, description, balance_after, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    amount,
    transactionType,
    referenceType ?? null,
    referenceId ?? null,
    description,
    newBalance,
    now,
  );

  return { success: true as const, data: { newBalance, transactionId: id } };
}

async function adjustOperatorWallet(
  amount: number,
  transactionType: string,
  description: string,
  referenceType?: string,
  referenceId?: string,
) {
  const sqlite = getSqlite();
  const run = sqlite.transaction(() =>
    creditOperatorWalletInTransaction(sqlite, amount, transactionType, description, referenceType, referenceId),
  );
  return run();
}

export async function creditOperatorWallet(
  amount: number,
  description: string,
  referenceType?: string,
  referenceId?: string,
) {
  if (amount <= 0) return { success: false, error: 'Amount must be positive' };
  const result = await adjustOperatorWallet(amount, 'TOPUP', description, referenceType, referenceId);
  if (result.success) {
    const verified = await getOperatorWalletBalance();
    return { success: true, data: { newBalance: verified, transactionId: result.data.transactionId } };
  }
  return result;
}

export async function debitOperatorWallet(
  amount: number,
  description: string,
  referenceType?: string,
  referenceId?: string,
) {
  if (amount <= 0) return { success: false, error: 'Amount must be positive' };
  const result = await adjustOperatorWallet(-amount, 'ISSUE_TBG', description, referenceType, referenceId);
  if (result.success) {
    const verified = await getOperatorWalletBalance();
    return { success: true, data: { newBalance: verified, transactionId: result.data.transactionId } };
  }
  return result;
}

export async function redeemVendorTopupCode(code: string) {
  const normalized = normalizeVendorTopupCodeInput(code);
  const parsed = parseVendorTopupCode(normalized);
  if (!parsed.valid || !parsed.payload) {
    return { success: false, error: parsed.error ?? 'Invalid TVP code' };
  }

  const { amount, validUntil, shopName, nonce } = parsed.payload;
  const now = Math.floor(Date.now() / 1000);
  if (validUntil < now) {
    return { success: false, error: 'This top-up code has expired' };
  }

  const codeHash = hashVendorTopupCode(normalized);
  const sqlite = getSqlite();

  try {
    const result = sqlite.transaction(() => {
      const usedByHash = sqlite.prepare('SELECT id FROM used_vendor_topups WHERE code_hash = ?').get(codeHash);
      const usedByNonce = sqlite.prepare('SELECT id FROM used_vendor_topups WHERE nonce = ?').get(nonce);
      if (usedByHash || usedByNonce) {
        return { success: false as const, error: 'This top-up code was already used' };
      }

      const credited = creditOperatorWalletInTransaction(
        sqlite,
        amount,
        'TOPUP',
        `Vendor top-up for ${shopName}`,
        'vendor_topup',
        nonce,
      );
      if (!credited.success) {
        throw new Error(credited.error);
      }

      const usedId = uuid();
      sqlite.prepare(
        `INSERT INTO used_vendor_topups (id, code_hash, nonce, amount, shop_name, redeemed_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(usedId, codeHash, nonce, amount, shopName, now);

      return {
        success: true as const,
        data: {
          amount,
          newBalance: credited.data.newBalance,
          shopName,
          usedId,
        },
      };
    })();

    if (!result.success) return result;

    const verifiedBalance = await getOperatorWalletBalance();
    return {
      success: true,
      data: {
        amount: result.data.amount,
        newBalance: verifiedBalance,
        shopName: result.data.shopName,
        message: `${result.data.amount.toFixed(0)} ETB added — balance is now ${verifiedBalance.toFixed(0)} ETB`,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Top-up failed' };
  }
}
