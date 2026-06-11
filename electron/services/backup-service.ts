import fs from 'fs';
import path from 'path';
import { getDataDir } from './database-service';

export async function createBackup() {
  const dataDir = getDataDir();
  const dbPath = path.join(dataDir, 'bingo.db');
  const backupDir = path.join(dataDir, '..', 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `bingo-backup-${timestamp}.db`);
  fs.copyFileSync(dbPath, backupPath);

  const backups = listBackups();
  return { success: true, data: { path: backupPath, filename: path.basename(backupPath) } };
}

export function listBackups() {
  const dataDir = getDataDir();
  const backupDir = path.join(dataDir, '..', 'backups');
  if (!fs.existsSync(backupDir)) return [];
  return fs.readdirSync(backupDir)
    .filter((f) => f.endsWith('.db'))
    .map((f) => {
      const stat = fs.statSync(path.join(backupDir, f));
      return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function restoreBackup(filename: string) {
  const dataDir = getDataDir();
  const backupPath = path.join(dataDir, '..', 'backups', filename);
  const dbPath = path.join(dataDir, 'bingo.db');
  if (!fs.existsSync(backupPath)) return { success: false, error: 'Backup not found' };
  fs.copyFileSync(backupPath, dbPath);
  return { success: true, message: 'Backup restored. Please restart the application.' };
}
