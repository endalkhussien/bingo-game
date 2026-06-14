import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

let db: BetterSQLite3Database<typeof schema> | null = null;

export function getDbPath(): string {
  const path = require('path');
  const { app } = require('electron');
  const userData = app?.getPath?.('userData') ?? path.join(process.cwd(), 'data');
  const fs = require('fs');
  const dataDir = path.join(userData, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, 'bingo.db');
}

export function createDatabase(dbPath?: string): BetterSQLite3Database<typeof schema> {
  const path = require('path');
  const fs = require('fs');
  const finalPath = dbPath ?? path.join(process.cwd(), 'data', 'bingo.db');
  const dir = path.dirname(finalPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const sqlite = new Database(finalPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');

  db = drizzle(sqlite, { schema });
  return db;
}

export function getDatabase(): BetterSQLite3Database<typeof schema> {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function runMigrations(database: BetterSQLite3Database<typeof schema>) {
  const client = (database as unknown as { $client: Database.Database }).$client;

  client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, full_name TEXT NOT NULL, username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
      phone TEXT, commission_rate REAL NOT NULL DEFAULT 20, wallet_balance REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ACTIVE', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      token_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES agents(id),
      amount REAL NOT NULL, transaction_type TEXT NOT NULL, reference_type TEXT, reference_id TEXT,
      description TEXT NOT NULL, balance_after REAL NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS recharge_vouchers (
      id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, amount REAL NOT NULL,
      is_used INTEGER NOT NULL DEFAULT 0, used_by_agent_id TEXT REFERENCES agents(id),
      used_at INTEGER, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bingo_cards (
      id TEXT PRIMARY KEY, card_number TEXT NOT NULL, agent_id TEXT NOT NULL REFERENCES agents(id),
      card_data TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY, game_code TEXT NOT NULL UNIQUE, agent_id TEXT NOT NULL REFERENCES agents(id),
      game_name TEXT NOT NULL, bet_amount REAL NOT NULL, winning_pattern TEXT NOT NULL,
      draw_speed_ms INTEGER NOT NULL DEFAULT 2000, voice_type TEXT NOT NULL DEFAULT 'AMHARIC_MALE',
      language TEXT NOT NULL DEFAULT 'en', number_range_max INTEGER NOT NULL DEFAULT 150,
      max_players INTEGER NOT NULL DEFAULT 150, commission_rate REAL NOT NULL DEFAULT 20,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      selected_numbers TEXT, started_at INTEGER, completed_at INTEGER,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS game_cards (
      id TEXT PRIMARY KEY, game_id TEXT NOT NULL REFERENCES games(id),
      card_id TEXT NOT NULL REFERENCES bingo_cards(id), player_name TEXT, joined_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS drawn_numbers (
      id TEXT PRIMARY KEY, game_id TEXT NOT NULL REFERENCES games(id),
      number INTEGER NOT NULL, draw_order INTEGER NOT NULL, drawn_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS winners (
      id TEXT PRIMARY KEY, game_id TEXT NOT NULL REFERENCES games(id),
      card_id TEXT NOT NULL REFERENCES bingo_cards(id), winning_pattern TEXT NOT NULL,
      prize_amount REAL NOT NULL, won_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS game_revenue (
      id TEXT PRIMARY KEY, game_id TEXT NOT NULL UNIQUE REFERENCES games(id),
      total_players INTEGER NOT NULL, total_bets REAL NOT NULL, total_payouts REAL NOT NULL,
      platform_revenue REAL NOT NULL, agent_revenue REAL NOT NULL, commission_revenue REAL NOT NULL,
      calculated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS recharge_requests (
      id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES agents(id),
      amount REAL NOT NULL, payment_method TEXT NOT NULL, reference_number TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING', reviewed_by TEXT REFERENCES users(id),
      rejection_reason TEXT, requested_at INTEGER NOT NULL, reviewed_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS pricing_plans (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, plan_type TEXT NOT NULL, price REAL NOT NULL,
      card_limit INTEGER, duration TEXT, duration_days INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1, is_promotional INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL,
      reference_type TEXT, reference_id TEXT, is_read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT,
      old_value TEXT, new_value TEXT, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS used_offline_vouchers (
      id TEXT PRIMARY KEY, nonce TEXT NOT NULL UNIQUE, amount REAL NOT NULL,
      agent_id TEXT NOT NULL REFERENCES agents(id), redeemed_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS issued_offline_vouchers (
      id TEXT PRIMARY KEY, code TEXT NOT NULL, amount REAL NOT NULL,
      for_username TEXT, nonce TEXT NOT NULL, expires_at INTEGER NOT NULL,
      issued_by TEXT NOT NULL REFERENCES users(id), issued_at INTEGER NOT NULL
    );
  `);

  // Incremental migrations for existing databases
  const gameCols = client.prepare(`PRAGMA table_info(games)`).all() as { name: string }[];
  if (!gameCols.some((c) => c.name === 'commission_rate')) {
    client.exec(`ALTER TABLE games ADD COLUMN commission_rate REAL NOT NULL DEFAULT 20`);
  }

  client.exec(`
    CREATE TABLE IF NOT EXISTS used_offline_vouchers (
      id TEXT PRIMARY KEY, nonce TEXT NOT NULL UNIQUE, amount REAL NOT NULL,
      agent_id TEXT NOT NULL REFERENCES agents(id), redeemed_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS issued_offline_vouchers (
      id TEXT PRIMARY KEY, code TEXT NOT NULL, amount REAL NOT NULL,
      for_username TEXT, nonce TEXT NOT NULL, expires_at INTEGER NOT NULL,
      issued_by TEXT NOT NULL REFERENCES users(id), issued_at INTEGER NOT NULL
    );
  `);
}
