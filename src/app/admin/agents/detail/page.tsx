'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { StatCard } from '@/presentation/components/shared/stat-card';
import { TasSetupPanel } from '@/presentation/components/admin/tas-setup-panel';

function AgentDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const [agent, setAgent] = useState<Record<string, unknown> | null>(null);
  const [depositAmt, setDepositAmt] = useState('100');
  const [newPw, setNewPw] = useState('');
  const [setupPw, setSetupPw] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [adminCommissionRate, setAdminCommissionRate] = useState('20');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (id) ipc<Record<string, unknown> | null>('agents:detail', id).then((a) => {
      setAgent(a);
      if (a?.adminCommissionRate != null) setAdminCommissionRate(String(a.adminCommissionRate));
    });
  }, [id]);

  if (!id) return <p className="text-gray-500">No agent selected.</p>;
  if (!agent) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;

  const handleDeposit = async () => {
    await ipc('wallet:deposit', id, parseFloat(depositAmt), 'Admin deposit');
    ipc<Record<string, unknown> | null>('agents:detail', id).then(setAgent);
  };
  const handleResetPw = async () => {
    if (!newPw) return;
    await ipc('agents:reset-password', id, newPw);
    setNewPw('');
    alert('Password reset successfully');
  };
  const handleRegenerateSetup = async () => {
    if (!setupPw) return;
    const result = await ipc<{ success: boolean; data?: { setupCode?: string; username?: string; message?: string }; error?: string }>(
      'agents:regenerate-setup', id, setupPw,
    );
    if (result.success && result.data?.setupCode) {
      setSetupCode(result.data.setupCode);
    } else {
      alert(result.error ?? 'Failed to generate setup code');
    }
  };
  const handleSaveAdminCommission = async () => {
    const rate = parseFloat(adminCommissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) return;
    await ipc('agents:update', id, { adminCommissionRate: rate });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    ipc<Record<string, unknown> | null>('agents:detail', id).then(setAgent);
  };

  return (
    <div>
      <PageHeader title={String(agent.fullName)} />
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
            Use the agent&apos;s current password (or enter a new one to set it).
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium">Agent password</label>
              <input type="password" value={setupPw} onChange={(e) => setSetupPw(e.target.value)}
                placeholder="Password for this agent" className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <button onClick={handleRegenerateSetup} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
              Generate TAS setup code
            </button>
          </div>
          {setupCode && (
            <TasSetupPanel username={String(agent.username ?? '')} setupCode={setupCode} />
          )}
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-semibold">Admin commission from agent</h3>
          <p className="text-xs text-gray-500">Percentage taken from this agent&apos;s commission earnings each game.</p>
          <input type="number" min={0} max={100} step={1} value={adminCommissionRate} onChange={(e) => setAdminCommissionRate(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm" />
          <button onClick={handleSaveAdminCommission} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">
            {saved ? 'Saved!' : 'Save admin share'}
          </button>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-semibold">Deposit to Wallet</h3>
          <input type="number" min={1} step={1} value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <button onClick={handleDeposit} className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white">Deposit</button>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-semibold">Reset Password</h3>
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password" className="w-full rounded-lg border px-3 py-2 text-sm" />
          <button onClick={handleResetPw} className="rounded-lg bg-orange-500 px-4 py-2 text-sm text-white">Reset Password</button>
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
