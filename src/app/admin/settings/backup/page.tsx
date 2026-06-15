'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';

interface Backup { filename: string; size: number; createdAt: string; }

export default function BackupPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);

  const load = () => ipc<Backup[]>('backup:list').then(setBackups);
  useEffect(() => { load(); }, []);

  const create = async () => {
    const r = await ipc<{ success: boolean; data?: { filename: string } }>('backup:create');
    if (r.success) { setMsg(`Backup created: ${r.data?.filename}`); load(); }
  };

  const restore = async (filename: string) => {
    if (!confirm(`Restore from ${filename}? App will need restart.`)) return;
    const r = await ipc<{ success: boolean; message?: string }>('backup:restore', filename);
    setMsg(r.message ?? 'Restored');
  };

  const factoryReset = async () => {
    if (!confirm(
      'Clear ALL data?\n\nThis removes all agents, games, balances, TOL activation, and recharge history. Vendor and shop admin logins are kept.\n\nYou will need new TOL + TVP codes from vendor.',
    )) return;
    setResetting(true);
    setError('');
    setMsg('');
    try {
      const r = await ipc<{ success: boolean; message?: string; error?: string }>('database:factory-reset');
      if (r.success) {
        setMsg(r.message ?? 'All data cleared.');
        window.location.href = '/admin/license';
      } else {
        setError(r.error ?? 'Reset failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Backup & Restore" backHref="/admin/settings" backLabel="Back to Settings" action={
        <button type="button" onClick={create} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Create Backup</button>
      } />

      <div className="mb-8 rounded-xl border-2 border-red-200 bg-red-50 p-5">
        <h3 className="font-semibold text-red-900">Clear all data (fresh start)</h3>
        <p className="mt-2 text-sm text-red-800">
          Removes all agents, games, shop balance, TOL license, and recharge codes. Keeps <strong>admin</strong> login only.
          After reset, paste new <strong>TOL</strong> and <strong>TVP</strong> from vendor, then create agents (0 balance) and issue <strong>TBG</strong> when they pay.
        </p>
        <button
          type="button"
          onClick={factoryReset}
          disabled={resetting}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {resetting ? 'Clearing…' : 'Clear All Data'}
        </button>
      </div>

      {msg && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{msg}</p>}
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            <th className="px-4 py-3">Filename</th><th className="px-4 py-3">Size</th>
            <th className="px-4 py-3">Created</th><th className="px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>
            {backups.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No backups yet</td></tr>
            : backups.map((b) => (
              <tr key={b.filename} className="border-t">
                <td className="px-4 py-3">{b.filename}</td>
                <td className="px-4 py-3">{(b.size / 1024).toFixed(1)} KB</td>
                <td className="px-4 py-3">{new Date(b.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3"><button type="button" onClick={() => restore(b.filename)} className="text-blue-600 text-xs hover:underline">Restore</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
