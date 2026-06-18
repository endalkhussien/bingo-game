'use client';

import Link from 'next/link';
import { useIpcData } from '@/presentation/hooks/use-ipc-data';
import { StatCard } from '@/presentation/components/shared/stat-card';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { SHOP_ADMIN_LICENSE } from '@/shared/admin-routes';

interface AdminDash {
  totalAgents: number; activeAgents: number; totalWalletBalance: number;
  totalRevenue: number; totalProfit: number; runningGames: number;
  pendingRecharges: number; revenueTrend: { date: string; revenue: number }[];
}

export default function AdminDashboardPage() {
  const { data, error, loading } = useIpcData<AdminDash>('dashboard:admin');

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    const needsLicense = error?.includes('OPERATOR_LICENSE_EXPIRED');
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="font-semibold">{needsLicense ? 'TOL license required' : 'Could not load dashboard'}</p>
        <p className="mt-2 text-sm">
          {needsLicense
            ? 'Activate a TOL code from your vendor before using the admin portal.'
            : (error ?? 'Unknown error')}
        </p>
        {needsLicense && (
          <Link href={SHOP_ADMIN_LICENSE} className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            Go to License page
          </Link>
        )}
      </div>
    );
  }

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
