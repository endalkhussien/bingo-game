'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { formatDate } from '@/presentation/lib/utils';

export default function RevenueReportPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { ipc('reports:revenue').then(setRows); }, []);
  return (
    <div>
      <PageHeader title="Revenue Report" />
      <div className="overflow-hidden rounded-xl bg-white shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            <th className="px-4 py-3">Game</th><th className="px-4 py-3">Agent</th>
            <th className="px-4 py-3">Date</th><th className="px-4 py-3">Total Bets</th>
            <th className="px-4 py-3">Platform Rev</th><th className="px-4 py-3">Agent Rev</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{String(r.gameCode)}</td>
                <td className="px-4 py-3">{String(r.agentName)}</td>
                <td className="px-4 py-3">{formatDate(Number(r.date))}</td>
                <td className="px-4 py-3">{Number(r.totalBets).toFixed(0)} ETB</td>
                <td className="px-4 py-3">{Number(r.platformRevenue).toFixed(0)} ETB</td>
                <td className="px-4 py-3">{Number(r.agentRevenue).toFixed(0)} ETB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
