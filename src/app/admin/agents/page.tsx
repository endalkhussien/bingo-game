'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';

interface AgentRow {
  id: string; fullName: string; username: string; phone: string | null;
  commissionRate: number; walletBalance: number; status: string;
  totalGames: number; totalProfit: number;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [search, setSearch] = useState('');

  const load = () => ipc<AgentRow[]>('agents:list').then(setAgents);
  useEffect(() => { load(); }, []);

  const filtered = agents.filter((a) =>
    a.fullName.toLowerCase().includes(search.toLowerCase()) ||
    a.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleSuspend = async (id: string) => { await ipc('agents:suspend', id); load(); };
  const handleActivate = async (id: string) => { await ipc('agents:activate', id); load(); };

  return (
    <div>
      <PageHeader title="Agents" action={
        <Link href="/admin/agents/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">+ Create Agent</Link>
      } />
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents..."
        className="mb-4 w-full max-w-sm rounded-lg border border-gray-300 px-4 py-2 text-sm" />
      <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Username</th>
            <th className="px-4 py-3 font-semibold">Balance</th>
            <th className="px-4 py-3 font-semibold">Commission</th>
            <th className="px-4 py-3 font-semibold">Games</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{a.fullName}</td>
                <td className="px-4 py-3">{a.username}</td>
                <td className="px-4 py-3">{a.walletBalance.toFixed(0)} ETB</td>
                <td className="px-4 py-3">{a.commissionRate}%</td>
                <td className="px-4 py-3">{a.totalGames}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link href={`/admin/agents/${a.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                    {a.status === 'ACTIVE'
                      ? <button onClick={() => handleSuspend(a.id)} className="text-red-500 text-xs hover:underline">Suspend</button>
                      : <button onClick={() => handleActivate(a.id)} className="text-green-600 text-xs hover:underline">Activate</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
