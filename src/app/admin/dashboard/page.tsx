'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ipc } from '@/presentation/lib/ipc';
import { StatCard } from '@/presentation/components/shared/stat-card';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { SHOP_ADMIN_WALLET } from '@/shared/admin-routes';
import { Wallet } from 'lucide-react';

interface AdminDash {
  shopOperatorBalance: number;
  totalAgents: number;
  activeAgents: number;
  totalWalletBalance: number;
  totalRevenue: number;
  totalProfit: number;
  runningGames: number;
  pendingRecharges: number;
  revenueTrend: { date: string; revenue: number }[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDash | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    ipc<AdminDash>('dashboard:admin')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load dashboard'));
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        <p className="font-semibold">Dashboard could not load</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  const shopBal = data.shopOperatorBalance ?? 0;

  return (
    <div>
      <PageHeader title="Admin Dashboard" />

      <div className={`mb-6 rounded-xl border-2 p-5 ${shopBal <= 0 ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
        <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Wallet className="h-5 w-5" /> Your shop balance (TVP) — used to issue TBG codes to agents
        </p>
        <p className={`mt-2 text-4xl font-bold ${shopBal <= 0 ? 'text-red-600' : 'text-amber-700'}`}>
          {shopBal.toFixed(0)} ETB
        </p>
        {shopBal <= 0 && (
          <p className="mt-2 text-sm text-red-700">
            Balance is empty. <Link href={SHOP_ADMIN_WALLET} className="font-semibold underline">Redeem a TVP code</Link> from your vendor to start operating.
          </p>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Agents" value={data.totalAgents} sub={`${data.activeAgents} active`} />
        <StatCard label="Agent Wallets (total)" value={`${data.totalWalletBalance.toFixed(0)} ETB`} sub="Sum of all agent balances" />
        <StatCard label="Total Revenue" value={`${data.totalRevenue.toFixed(0)} ETB`} />
        <StatCard label="Platform Profit" value={`${data.totalProfit.toFixed(0)} ETB`} />
        <StatCard label="Running Games" value={data.runningGames} />
        <StatCard label="Pending Recharges" value={data.pendingRecharges} />
      </div>
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 font-semibold text-gray-800">Revenue Trend (7 days)</h3>
        <div className="flex items-end gap-2 h-40">
          {data.revenueTrend.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t bg-amber-500" style={{ height: `${Math.max(4, (d.revenue / Math.max(...data.revenueTrend.map(t => t.revenue), 1)) * 120)}px` }} />
              <span className="text-xs text-gray-500">{d.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
