'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { StatCard } from '@/presentation/components/shared/stat-card';
import { TasSetupPanel } from '@/presentation/components/admin/tas-setup-panel';
import { TextInput } from '@/presentation/components/shared/text-input';

function AgentDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const [agent, setAgent] = useState<Record<string, unknown> | null>(null);
  const [newPw, setNewPw] = useState('');
  const [setupPw, setSetupPw] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [adminCommissionRate, setAdminCommissionRate] = useState('20');
  const [saved, setSaved] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    if (id) ipc<Record<string, unknown> | null>('agents:detail', id).then((a) => {
      setAgent(a);
      if (a?.adminCommissionRate != null) setAdminCommissionRate(String(a.adminCommissionRate));
    });
  }, [id]);

  if (!id) return <p className="text-gray-500">No agent selected.</p>;
  if (!agent) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;

  const handleResetPw = async () => {
    setActionError('');
    setActionSuccess('');
    if (!newPw || newPw.length < 4) {
      setActionError('Enter a new password (at least 4 characters).');
      return;
    }
    await ipc('agents:reset-password', id, newPw);
    setNewPw('');
    setActionSuccess('Password reset successfully.');
  };

  const handleRegenerateSetup = async () => {
    setSetupError('');
    setActionError('');
    setActionSuccess('');
    setSetupLoading(true);
    try {
      const result = await ipc<{
        success: boolean;
        data?: { setupCode?: string; username?: string; password?: string; message?: string };
        error?: string;
      }>('agents:regenerate-setup', id, setupPw.trim());
      if (result.success && result.data?.setupCode) {
        setSetupCode(result.data.setupCode);
        setSetupPassword(result.data.password ?? setupPw.trim());
        setSetupPw('');
        setActionSuccess('TAS setup code generated. Copy and send to the hall PC.');
      } else {
        setSetupError(result.error ?? 'Failed to generate setup code');
      }
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'Failed to generate setup code');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSaveAdminCommission = async () => {
    setActionError('');
    setActionSuccess('');
    const rate = parseFloat(adminCommissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setActionError('Admin share must be between 0% and 100%.');
      return;
    }
    await ipc('agents:update', id, { adminCommissionRate: rate });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    ipc<Record<string, unknown> | null>('agents:detail', id).then(setAgent);
    setActionSuccess('Admin commission saved.');
  };

  return (
    <div>
      <PageHeader title={String(agent.fullName)} backHref="/admin/agents" backLabel="Back to Agents" />
      <p className="mb-4 text-sm text-gray-600">
        Recharge this agent with a <strong>TBG</strong> code from <a href="/admin/vouchers" className="text-blue-600 underline">Recharge (TBG)</a> — uses your shop balance from vendor TVP codes.
      </p>
      {actionError && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>}
      {actionSuccess && <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{actionSuccess}</p>}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Wallet Balance" value={`${Number(agent.walletBalance).toFixed(0)} ETB`} />
        <StatCard label="Agent game commission" value={`${agent.commissionRate}%`} />
        <StatCard label="Admin share from agent" value={`${agent.adminCommissionRate}%`} />
        <StatCard label="Total Profit" value={`${Number(agent.totalProfit).toFixed(0)} ETB`} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100 space-y-3 lg:col-span-3">
          <h3 className="font-semibold">Hall PC setup code (TAS)</h3>
          <p className="text-xs text-gray-500">
            Each agent hall PC has its own database. Send this one-time code so the agent can use Activate PC before login.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <TextInput
                type="password"
                label="Agent login password"
                value={setupPw}
                onChange={(e) => { setSetupPw(e.target.value); setSetupError(''); }}
                placeholder="Type password or leave blank to auto-generate"
                hint="Sets the agent password. Leave blank and we generate one for you."
                error={setupError}
              />
            </div>
            <button
              type="button"
              onClick={handleRegenerateSetup}
              disabled={setupLoading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
            >
              {setupLoading ? 'Generating…' : 'Generate TAS setup code'}
            </button>
          </div>
          {setupCode && (
            <TasSetupPanel
              username={String(agent.username ?? '')}
              password={setupPassword}
              setupCode={setupCode}
            />
          )}
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-semibold">Admin commission from agent</h3>
          <p className="text-xs text-gray-500">Percentage taken from this agent&apos;s commission earnings each game.</p>
          <TextInput
            type="number"
            min={0}
            max={100}
            step={1}
            value={adminCommissionRate}
            onChange={(e) => setAdminCommissionRate(e.target.value)}
          />
          <button type="button" onClick={handleSaveAdminCommission} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">
            {saved ? 'Saved!' : 'Save admin share'}
          </button>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-semibold">Reset Password</h3>
          <TextInput
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="New password"
          />
          <button type="button" onClick={handleResetPw} className="rounded-lg bg-orange-500 px-4 py-2 text-sm text-white">Reset Password</button>
        </div>
      </div>
    </div>
  );
}

export default function AgentDetailPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>}>
      <AgentDetailContent />
    </Suspense>
  );
}
