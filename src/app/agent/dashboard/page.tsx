'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ipc } from '@/presentation/lib/ipc';
import { StatCard } from '@/presentation/components/shared/stat-card';
import { PageHeader } from '@/presentation/components/shared/page-header';

interface AgentDash {
  walletBalance: number; activeGames: number; totalGames: number;
  totalRevenue: number; totalProfit: number; commissionRate: number;
}

export default function AgentDashboardPage() {
  const [data, setData] = useState<AgentDash | null>(null);
  useEffect(() => { ipc<AgentDash>('dashboard:agent').then(setData).catch(console.error); }, []);

  if (!data) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;

  return (
    <div>
      <PageHeader title="Dashboard" action={
        <Link href="/agent/game-board" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">Start Game</Link>
      } />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Wallet Balance" value={`${data.walletBalance.toFixed(0)} ETB`} />
        <StatCard label="Active Games" value={data.activeGames} />
        <StatCard label="Total Games" value={data.totalGames} />
        <StatCard label="Total Revenue" value={`${data.totalRevenue.toFixed(0)} ETB`} />
        <StatCard label="Total Profit" value={`${data.totalProfit.toFixed(0)} ETB`} />
        <StatCard label="Commission Rate" value={`${data.commissionRate}%`} />
      </div>
    </div>
  );
}
