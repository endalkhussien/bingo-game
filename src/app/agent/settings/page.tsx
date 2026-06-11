'use client';

import { useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';

export default function AgentSettingsPage() {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const handleChangePassword = async () => {
    const r = await ipc<{ success: boolean; error?: string }>('auth:change-password', oldPw, newPw);
    if (r.success) { setMsg('Password changed successfully'); setOldPw(''); setNewPw(''); }
    else setErr(r.error ?? 'Failed');
  };

  return (
    <div className="max-w-lg">
      <PageHeader title="Settings" />
      <div className="rounded-xl bg-white p-6 shadow-sm border space-y-4">
        <h3 className="font-semibold">Change Password</h3>
        {msg && <p className="text-sm text-green-600">{msg}</p>}
        {err && <p className="text-sm text-red-500">{err}</p>}
        <input type="password" placeholder="Current password" value={oldPw} onChange={(e) => setOldPw(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm" />
        <input type="password" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm" />
        <button onClick={handleChangePassword} className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white">Update Password</button>
      </div>
    </div>
  );
}
