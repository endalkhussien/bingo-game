import { eq } from 'drizzle-orm';
import { getDb } from './database-service';
import { systemSettings } from '../../src/infrastructure/database/schema';

const DEFAULTS: Record<string, string> = {
  default_commission: '20',
  platform_fee: '0',
  minimum_bet: '10',
  maximum_bet: '1000',
  currency: 'ETB',
  timezone: 'Africa/Addis_Ababa',
  default_voice: 'AMHARIC_MALE',
  default_language: 'am',
  number_range_max: '75',
};

export async function getSettings() {
  const db = getDb();
  const rows = await db.select().from(systemSettings).all();
  const settings: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

export async function updateSettings(updates: Record<string, string>) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  for (const [key, value] of Object.entries(updates)) {
    const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).get();
    if (existing) {
      await db.update(systemSettings).set({ value, updatedAt: now }).where(eq(systemSettings.key, key));
    } else {
      await db.insert(systemSettings).values({ key, value, updatedAt: now });
    }
  }
  return getSettings();
}

export async function getSetting(key: string): Promise<string> {
  const settings = await getSettings();
  return settings[key] ?? DEFAULTS[key] ?? '';
}
