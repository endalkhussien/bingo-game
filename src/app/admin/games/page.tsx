'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { formatDate } from '@/presentation/lib/utils';

export default function AdminGamesPage() {
  const [games, setGames] = useState<Array<Record<string, unknown>>>([]);
  const [status, setStatus] = useState('ALL');

  useEffect(() => {
    ipc('games:list', { status: status === 'ALL' ? undefined : status }).then(setGames);
  }, [status]);

  return (
    <div>
      <PageHeader title="All Games" />
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="mb-4 rounded-lg border px-3 py-2 text-sm">
        <option value="ALL">All Status</option>
        <option value="RUNNING">Running</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            <th className="px-4 py-3">Game Code</th><th className="px-4 py-3">Agent</th>
            <th className="px-4 py-3">Bet</th><th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Date</th><th className="px-4 py-3">Profit</th>
          </tr></thead>
          <tbody>
            {games.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No games found</td></tr>
            : games.map((g) => (
              <tr key={String(g.id ?? g.gameCode)} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{String(g.gameCode)}</td>
                <td className="px-4 py-3">{String(g.agentName ?? '-')}</td>
                <td className="px-4 py-3">{Number(g.betAmount ?? 0)} ETB</td>
                <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{String(g.status)}</span></td>
                <td className="px-4 py-3">{formatDate(Number(g.date ?? g.createdAt ?? 0))}</td>
                <td className="px-4 py-3">{Number(g.profit ?? 0).toFixed(0)} ETB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
