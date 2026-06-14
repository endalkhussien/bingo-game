'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { StatCard } from '@/presentation/components/shared/stat-card';

function AgentDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const [agent, setAgent] = useState<Record<string, unknown> | null>(null);
  const [depositAmt, setDepositAmt] = useState('100');
  const [newPw, setNewPw] = useState('');
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
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-semibold">Admin commission from agent</h3>
          <p className="text-xs text-gray-500">Percentage taken from this agent&apos;s commission earnings each game.</p>
          <input type="number" min={0} max={100} value={adminCommissionRate} onChange={(e) => setAdminCommissionRate(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm" />
          <button onClick={handleSaveAdminCommission} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">
            {saved ? 'Saved!' : 'Save admin share'}
          </button>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-semibold">Deposit to Wallet</h3>
          <input type="number" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
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
