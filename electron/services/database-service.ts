import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { createDatabase, runMigrations } from '../../src/infrastructure/database/connection';
import { seedDatabase, ensureVendorUser, ensureShopAdminUser } from '../../src/infrastructure/database/seed';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../src/infrastructure/database/schema';
import { formatStartupError, sqliteStartupHint } from '../utils/startup-error';

let database: BetterSQLite3Database<typeof schema> | null = null;

export function getDataDir(): string {
  const userData = app.getPath('userData');
  const dataDir = path.join(userData, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

export async function initDatabase(): Promise<BetterSQLite3Database<typeof schema>> {
  const dbPath = path.join(getDataDir(), 'bingo.db');
  try {
    database = createDatabase(dbPath);
    runMigrations(database);
    await seedDatabase(database);
    await ensureVendorUser(database);
    await ensureShopAdminUser(database);
    return database;
  } catch (err) {
    const detail = formatStartupError(err);
    throw new Error(`Database setup failed for ${dbPath}\n${detail}${sqliteStartupHint(detail)}`);
  }
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!database) throw new Error('Database not initialized');
  return database;
}
