'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';

export default function ProfitReportPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { ipc('reports:profit').then(setRows); }, []);
  const total = rows.reduce((s, r) => s + Number(r.profit ?? 0), 0);
  return (
    <div>
      <PageHeader title="Profit Report" />
      <p className="mb-4 text-lg font-semibold">Total Platform Profit: {total.toFixed(0)} ETB</p>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            <th className="px-4 py-3">Game</th><th className="px-4 py-3">Agent</th><th className="px-4 py-3">Profit</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t"><td className="px-4 py-3">{String(r.gameCode)}</td>
                <td className="px-4 py-3">{String(r.agentName)}</td>
                <td className="px-4 py-3">{Number(r.profit).toFixed(0)} ETB</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
