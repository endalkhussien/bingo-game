import { ipc, isElectron } from '@/presentation/lib/ipc';

export type FactoryResetResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function runFactoryReset(): Promise<FactoryResetResult> {
  const result = await ipc<{ success: boolean; message?: string; error?: string } | null>(
    'database:factory-reset'
  );
  if (!result) {
    return { ok: false, error: 'Reset failed — no response from app. Restart the app and try again.' };
  }
  if (!result.success) {
    return { ok: false, error: result.error ?? 'Reset failed' };
  }
  const base = result.message ?? 'All data cleared.';
  const message = isElectron()
    ? base
    : `${base} (Browser preview only — the real SQLite database is in the installed Windows .exe.)`;
  return { ok: true, message };
}

export function redirectAfterFactoryReset() {
  window.location.replace('/admin/license/');
}
