'use client';

import { useState, useEffect } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { APP_NAME } from '@/shared/brand';

export default function AgentSettingsPage() {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [orgKey, setOrgKey] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    ipc<Record<string, string>>('settings:get').then((s) => {
      if (s.offline_voucher_org_key) setOrgKey(s.offline_voucher_org_key);
    }).catch(() => {});
  }, []);

  const handleChangePassword = async () => {
    const r = await ipc<{ success: boolean; error?: string }>('auth:change-password', oldPw, newPw);
    if (r.success) { setMsg('Password changed successfully'); setOldPw(''); setNewPw(''); setErr(''); }
    else setErr(r.error ?? 'Failed');
  };

  const handleSaveOrgKey = async () => {
    setErr('');
    setMsg('');
    const r = await ipc<{ success: boolean; error?: string }>('settings:set-org-recharge-key', orgKey.trim());
    if (r.success) setMsg('Organization key saved. You can now redeem offline recharge codes.');
    else setErr(r.error ?? 'Failed to save key');
  };

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="Settings" />

      <div className="rounded-xl bg-white p-6 shadow-sm border space-y-4">
        <h3 className="font-semibold">Organization recharge key</h3>
        <p className="text-sm text-gray-600">
          Ask your admin for the {APP_NAME} organization key. Enter it once on this PC to redeem secure offline recharge codes.
        </p>
        {msg && <p className="text-sm text-green-600">{msg}</p>}
        {err && <p className="text-sm text-red-500">{err}</p>}
        <textarea
          value={orgKey}
          onChange={(e) => setOrgKey(e.target.value)}
          placeholder="Paste organization key from admin…"
          rows={3}
          className="w-full rounded-lg border px-3 py-2 font-mono text-xs"
        />
        <button onClick={handleSaveOrgKey} className="rounded-lg bg-emerald-600 px-6 py-2 text-sm text-white">
          Save organization key
        </button>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm border space-y-4">
        <h3 className="font-semibold">Change Password</h3>
        <input type="password" placeholder="Current password" value={oldPw} onChange={(e) => setOldPw(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm" />
        <input type="password" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm" />
        <button onClick={handleChangePassword} className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white">Update Password</button>
      </div>
    </div>
  );
}
