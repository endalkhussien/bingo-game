import { v4 as uuid } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { getDb } from './database-service';
import { pricingPlans } from '../../src/infrastructure/database/schema';

export async function listPricingPlans(activeOnly = false) {
  const db = getDb();
  let plans = await db.select().from(pricingPlans).orderBy(desc(pricingPlans.createdAt)).all();
  if (activeOnly) plans = plans.filter((p) => p.isActive);
  return plans;
}

export async function createPricingPlan(data: {
  name: string; planType: string; price: number;
  cardLimit?: number; duration?: string; durationDays?: number; isPromotional?: boolean;
}) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const id = uuid();
  await db.insert(pricingPlans).values({
    id, name: data.name, planType: data.planType, price: data.price,
    cardLimit: data.cardLimit ?? null, duration: data.duration ?? null,
    durationDays: data.durationDays ?? null, isActive: true,
    isPromotional: data.isPromotional ?? false, createdAt: now, updatedAt: now,
  });
  return { success: true, data: { id } };
}

export async function updatePricingPlan(id: string, data: Partial<{
  name: string; price: number; cardLimit: number; isActive: boolean;
}>) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const plan = await db.select().from(pricingPlans).where(eq(pricingPlans.id, id)).get();
  if (!plan) return { success: false, error: 'Plan not found' };
  await db.update(pricingPlans).set({ ...data, updatedAt: now }).where(eq(pricingPlans.id, id));
  return { success: true };
}

export async function disablePricingPlan(id: string) {
  return updatePricingPlan(id, { isActive: false });
}
