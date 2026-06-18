'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { StatCard } from '@/presentation/components/shared/stat-card';
import { PageHeader } from '@/presentation/components/shared/page-header';

interface AdminDash {
  totalAgents: number; activeAgents: number; totalWalletBalance: number;
  totalRevenue: number; totalProfit: number; runningGames: number;
  pendingRecharges: number; revenueTrend: { date: string; revenue: number }[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDash | null>(null);

  useEffect(() => { ipc<AdminDash>('dashboard:admin').then(setData).catch(console.error); }, []);

  if (!data) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;

  return (
    <div>
      <PageHeader title="Admin Dashboard" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Agents" value={data.totalAgents} sub={`${data.activeAgents} active`} />
        <StatCard label="Wallet Balances" value={`${data.totalWalletBalance.toFixed(0)} ETB`} />
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
              <div className="w-full rounded-t bg-blue-500" style={{ height: `${Math.max(4, (d.revenue / Math.max(...data.revenueTrend.map(t => t.revenue), 1)) * 120)}px` }} />
              <span className="text-xs text-gray-500">{d.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
