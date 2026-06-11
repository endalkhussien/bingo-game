'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';

export default function AgentPerformancePage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { ipc('reports:agents').then(setRows); }, []);
  return (
    <div>
      <PageHeader title="Agent Performance" />
      <div className="overflow-hidden rounded-xl bg-white shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            <th className="px-4 py-3">Agent</th><th className="px-4 py-3">Games</th>
            <th className="px-4 py-3">Revenue</th><th className="px-4 py-3">Profit</th>
            <th className="px-4 py-3">Balance</th><th className="px-4 py-3">Status</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{String(r.agentName)}</td>
                <td className="px-4 py-3">{Number(r.totalGames)}</td>
                <td className="px-4 py-3">{Number(r.totalRevenue).toFixed(0)} ETB</td>
                <td className="px-4 py-3">{Number(r.totalProfit).toFixed(0)} ETB</td>
                <td className="px-4 py-3">{Number(r.walletBalance).toFixed(0)} ETB</td>
                <td className="px-4 py-3">{String(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
