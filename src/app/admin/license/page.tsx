'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { invokeIpc } from '@/presentation/lib/ipc';
import { runFactoryReset } from '@/presentation/lib/factory-reset';
import { SHOP_ADMIN_HOME } from '@/shared/admin-routes';
import { isElectron } from '@/shared/runtime';

export default function AdminLicensePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await invokeIpc<{ success: boolean; error?: string }>('license:activate', code.trim());
      if (r?.success) {
        router.replace(SHOP_ADMIN_HOME);
        router.refresh();
      } else {
        setError(r?.error ?? 'Invalid license code');
      }
    } catch {
      setError('Activation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (
      !confirm(
        'Delete ALL data?\n\nThis removes the SQLite database (agents, games, wallet, license) and cannot be undone.'
      )
    ) {
      return;
    }
    setResetting(true);
    setResetMsg('');
    const r = await runFactoryReset();
    setResetting(false);
    if (r.ok) {
      setResetMsg(r.message);
      setCode('');
      setError('');
      router.refresh();
    } else {
      setResetMsg(r.error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-slate-900">Shop Admin — License</h1>
        <p className="mt-2 text-sm text-slate-600">
          Paste a <strong>TOL</strong> code from your vendor. After activation you can issue TAS and TBG codes to agents.
        </p>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-medium text-slate-800">Database</p>
          {isElectron() ? (
            <p className="mt-1">
              This app stores all data in a local <strong>SQLite</strong> file on your PC (inside the app user folder).
              Use <strong>Clear All Data</strong> below to wipe it and start fresh.
            </p>
          ) : (
            <p className="mt-1">
              You are in <strong>browser preview</strong> — there is no real database here (mock data only). Install and run the{' '}
              <strong>Windows .exe</strong> for the real SQLite database and full offline use.
            </p>
          )}
        </div>

        <form onSubmit={handleActivate} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">TOL license code</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              placeholder="Paste TOL code from vendor portal"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Activating…' : 'Activate license'}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <p className="text-sm font-medium text-slate-800">Clear All Data</p>
          <p className="mt-1 text-xs text-slate-500">
            Removes every table in the database. You will need a new TOL from the vendor and must recreate agents.
          </p>
          {resetMsg && (
            <p className={`mt-2 text-sm ${resetMsg.startsWith('All') || resetMsg.includes('cleared') ? 'text-emerald-700' : 'text-red-600'}`}>
              {resetMsg}
            </p>
          )}
          <button
            type="button"
            onClick={handleClearAll}
            disabled={resetting}
            className="mt-3 w-full rounded-lg border border-red-300 bg-red-50 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {resetting ? 'Clearing…' : 'Clear All Data'}
          </button>
        </div>
      </div>
    </div>
  );
}
