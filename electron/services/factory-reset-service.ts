import { eq } from 'drizzle-orm';
import { getDb } from './database-service';
import {
  users, agents, sessions, notifications, auditLogs,
  walletTransactions, rechargeRequests, rechargeVouchers,
  bingoCards, games, gameCards, drawnNumbers, winners, gameRevenue,
  usedOfflineVouchers, issuedOfflineVouchers,
  usedVendorTopups, operatorWalletTransactions, issuedVendorTopups,
} from '../../src/infrastructure/database/schema';
import { updateSettings } from './settings-service';
import { logAudit } from './audit-service';

/** Wipe operational data — keeps vendor + shop admin accounts. */
export async function factoryReset(adminId: string) {
  const db = getDb();

  await db.delete(drawnNumbers);
  await db.delete(winners);
  await db.delete(gameCards);
  await db.delete(gameRevenue);
  await db.delete(games);
  await db.delete(walletTransactions);
  await db.delete(rechargeRequests);
  await db.delete(usedOfflineVouchers);
  await db.delete(issuedOfflineVouchers);
  await db.delete(bingoCards);
  await db.delete(usedVendorTopups);
  await db.delete(operatorWalletTransactions);
  await db.delete(issuedVendorTopups);
  await db.delete(rechargeVouchers);

  const agentUsers = await db.select().from(users).where(eq(users.role, 'AGENT')).all();
  for (const user of agentUsers) {
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    await db.delete(notifications).where(eq(notifications.userId, user.id));
  }

  await db.delete(agents);
  await db.delete(users).where(eq(users.role, 'AGENT'));
  await db.delete(auditLogs);

  const now = Math.floor(Date.now() / 1000);
  await updateSettings({
    operator_wallet_balance: '0',
    operator_license_until: '0',
    operator_license_shop: '',
    operator_license_period: '',
    vendor_commission_rate: '20',
  });

  await logAudit({
    userId: adminId,
    action: 'FACTORY_RESET',
    entityType: 'system',
    entityId: 'database',
    newValue: { message: 'All agents, games, balances, and license data cleared' },
  });

  return {
    success: true,
    message: 'All data cleared. Paste TOL and TVP from vendor to start fresh. Create agents with zero balance — recharge them with TBG codes.',
  };
}
