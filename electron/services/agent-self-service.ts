import { eq } from 'drizzle-orm';
import { getDb } from './database-service';
import { agents } from '../../src/infrastructure/database/schema';
import { logAudit } from './audit-service';

export async function updateOwnCommission(agentId: string, commissionRate: number) {
  if (commissionRate < 0 || commissionRate > 100) {
    return { success: false, error: 'Commission must be between 0% and 100%.' };
  }

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent) return { success: false, error: 'Agent not found' };

  await db.update(agents).set({ commissionRate, updatedAt: now }).where(eq(agents.id, agentId));
  await logAudit({
    userId: agent.userId,
    action: 'UPDATE',
    entityType: 'agent_commission',
    entityId: agentId,
    newValue: { commissionRate },
  });

  return { success: true, data: { commissionRate } };
}

export async function getAgentProfile(agentId: string) {
  const db = getDb();
  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent) return null;
  return {
    commissionRate: agent.commissionRate,
    adminCommissionRate: agent.adminCommissionRate,
    walletBalance: agent.walletBalance,
  };
}
