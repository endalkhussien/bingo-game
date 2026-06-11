import { v4 as uuid } from 'uuid';
import { desc } from 'drizzle-orm';
import { getDb } from './database-service';
import { auditLogs } from '../../src/infrastructure/database/schema';

export async function logAudit(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  const db = getDb();
  await db.insert(auditLogs).values({
    id: uuid(),
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
    newValue: params.newValue ? JSON.stringify(params.newValue) : null,
    createdAt: Math.floor(Date.now() / 1000),
  });
}

export async function listAuditLogs(filters?: { search?: string; limit?: number }) {
  const db = getDb();
  const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).all();
  const sorted = logs;
  const limit = filters?.limit ?? 100;
  return sorted.slice(0, limit);
}
