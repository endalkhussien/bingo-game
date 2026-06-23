'use client';

import { useState, useEffect } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { useAuth } from '@/presentation/providers/auth-provider';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { APP_NAME } from '@/shared/brand';
import { calculateGameEconomics } from '@/shared/prize';
import { TextInput } from '@/presentation/components/shared/text-input';
import { TextArea } from '@/presentation/components/shared/text-area';

export default function AgentSettingsPage() {
  const { agent, refreshAgent } = useAuth();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [orgKey, setOrgKey] = useState('');
  const [commissionRate, setCommissionRate] = useState('20');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    ipc<Record<string, string>>('settings:get').then((s) => {
      if (s.offline_voucher_org_key) setOrgKey(s.offline_voucher_org_key);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (agent?.commissionRate != null) {
      setCommissionRate(String(agent.commissionRate));
    }
  }, [agent?.commissionRate]);

  const example = calculateGameEconomics(10, 20, parseFloat(commissionRate) || 0, agent?.adminCommissionRate ?? 20);

  const handleSaveCommission = async () => {
    setErr('');
    setMsg('');
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setErr('Commission must be between 0% and 100%.');
      return;
    }
    const r = await ipc<{ success: boolean; error?: string }>('agents:update-own-commission', rate);
    if (r.success) {
      setMsg('Your game commission rate was saved.');
      await refreshAgent();
    } else {
      setErr(r.error ?? 'Failed to save');
    }
  };

  const handleChangePassword = async () => {
    setErr('');
    setMsg('');
    if (!oldPw || !newPw) {
      setErr('Enter current and new password.');
      return;
    }
    const r = await ipc<{ success: boolean; error?: string }>('auth:change-password', oldPw, newPw);
    if (r.success) { setMsg('Password changed successfully'); setOldPw(''); setNewPw(''); }
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
        <h3 className="font-semibold">Your game commission</h3>
        <p className="text-sm text-gray-600">
          This is the percentage you take from the prize pool before the winner is paid in cash at the hall.
          Your TBG wallet is debited by this commission amount when the game ends (admin takes {agent?.adminCommissionRate ?? 20}% of your commission).
        </p>
        {msg && <p className="text-sm text-green-600">{msg}</p>}
        {err && <p className="text-sm text-red-500">{err}</p>}
        <TextInput
          label="Commission from pot %"
          type="number"
          min={0}
          max={100}
          value={commissionRate}
          onChange={(e) => setCommissionRate(e.target.value)}
        />
        <p className="text-xs text-gray-500">
          Example (20 players × 10 ETB): winner gets {example.prize.toFixed(0)} ETB ·
          you keep {example.agentNetCommission.toFixed(0)} ETB after admin share
        </p>
        <button type="button" onClick={handleSaveCommission} className="rounded-lg bg-indigo-600 px-6 py-2 text-sm text-white">
          Save commission rate
        </button>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm border space-y-4">
        <h3 className="font-semibold">Organization recharge key</h3>
        <p className="text-sm text-gray-600">
          Ask your admin for the {APP_NAME} organization key. Enter it once on this PC to redeem secure offline recharge codes.
        </p>
        <TextArea
          value={orgKey}
          onChange={(e) => setOrgKey(e.target.value)}
          placeholder="Paste organization key from admin…"
          rows={3}
          className="font-mono text-xs"
        />
        <button type="button" onClick={handleSaveOrgKey} className="rounded-lg bg-emerald-600 px-6 py-2 text-sm text-white">
          Save organization key
        </button>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm border space-y-4">
        <h3 className="font-semibold">Change Password</h3>
        <TextInput
          type="password"
          autoComplete="current-password"
          placeholder="Current password"
          value={oldPw}
          onChange={(e) => setOldPw(e.target.value)}
        />
        <TextInput
          type="password"
          autoComplete="new-password"
          placeholder="New password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
        />
        <button type="button" onClick={handleChangePassword} className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white">Update Password</button>
      </div>
    </div>
  );
}
