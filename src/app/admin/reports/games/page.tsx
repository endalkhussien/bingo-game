'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { formatDate } from '@/presentation/lib/utils';

export default function GameHistoryPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { ipc('reports:games').then(setRows); }, []);
  return (
    <div>
      <PageHeader title="Game History" />
      <div className="overflow-hidden rounded-xl bg-white shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            <th className="px-4 py-3">Code</th><th className="px-4 py-3">Agent</th>
            <th className="px-4 py-3">Bet</th><th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Date</th><th className="px-4 py-3">Profit</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t"><td className="px-4 py-3">{String(r.gameCode)}</td>
                <td className="px-4 py-3">{String(r.agentName)}</td>
                <td className="px-4 py-3">{Number(r.betAmount)} ETB</td>
                <td className="px-4 py-3">{String(r.status)}</td>
                <td className="px-4 py-3">{formatDate(Number(r.date))}</td>
                <td className="px-4 py-3">{Number(r.profit).toFixed(0)} ETB</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
