'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { invokeIpc } from '@/presentation/lib/ipc';
import { runFactoryReset } from '@/presentation/lib/factory-reset';
import { SHOP_ADMIN_HOME, TOL_JUST_ACTIVATED_KEY } from '@/shared/admin-routes';
import { normalizeAdminActivationCodeInput } from '@/shared/voucher/admin-activation-code';
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
      const normalized = normalizeAdminActivationCodeInput(code);
      if (!normalized) {
        setError('Paste the full TAK- activation key from your vendor.');
        return;
      }

      const r = await invokeIpc<{ success: boolean; error?: string; data?: { message?: string; walletBalance?: number } }>(
        'license:activate',
        normalized,
      );
      if (r?.success) {
        sessionStorage.setItem(TOL_JUST_ACTIVATED_KEY, '1');
        const status = await invokeIpc<{ active: boolean }>('license:status');
        if (!status?.active) {
          sessionStorage.removeItem(TOL_JUST_ACTIVATED_KEY);
          setError('Activation was saved but could not be verified. Refresh and try again.');
          return;
        }
        router.replace(SHOP_ADMIN_HOME);
        router.refresh();
      } else {
        setError(r?.error ?? 'Invalid activation key');
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
        'Delete ALL data?\n\nThis removes the SQLite database (agents, games, wallet) and cannot be undone.'
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
        <h1 className="text-2xl font-bold text-slate-900">Shop Admin — Activation</h1>
        <p className="mt-2 text-sm text-slate-600">
          Paste the <strong>TAK</strong> activation key from your vendor. One key unlocks the admin portal and adds your starting <strong>TVP balance</strong>.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-slate-600">
          <li>
            Log in as <strong>shop admin</strong> (<code className="rounded bg-slate-100 px-1">admin</code>), not vendor.
          </li>
          <li>Each <strong>TAK-…</strong> key works once and includes ETB balance for TBG vouchers.</li>
        </ul>

        {!isElectron() && (
          <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
            <p className="font-semibold">Browser preview</p>
            <p className="mt-1">Login as <strong>vendor</strong> → <strong>Admin Activation</strong> → generate TAK → login as <strong>admin</strong> → paste here.</p>
          </div>
        )}

        <form onSubmit={handleActivate} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Vendor activation key (TAK)</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              placeholder="Paste TAK- code from vendor"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Activating…' : 'Activate shop admin'}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <p className="text-sm font-medium text-slate-800">Clear All Data</p>
          <p className="mt-1 text-xs text-slate-500">
            Wipes agents, games, and wallet. You will need a new TAK key from the vendor.
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
