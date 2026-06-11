'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { formatDate } from '@/presentation/lib/utils';

interface GameRow { id: string; gameCode: string; date: number; betAmount: number; playersNumber: number; status: string; profit: number; }

export default function AgentGamesPage() {
  const [games, setGames] = useState<GameRow[]>([]);
  useEffect(() => { ipc<GameRow[]>('games:list').then(setGames); }, []);

  return (
    <div>
      <PageHeader title="Games" action={
        <Link href="/agent/game-board" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">+ New Game</Link>
      } />
      <div className="overflow-hidden rounded-xl bg-white shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            <th className="px-4 py-3">Code</th><th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Bet</th><th className="px-4 py-3">Players</th>
            <th className="px-4 py-3">Status</th><th className="px-4 py-3">Profit</th>
          </tr></thead>
          <tbody>
            {games.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No games yet</td></tr>
            : games.map((g) => (
              <tr key={g.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{g.gameCode}</td>
                <td className="px-4 py-3">{formatDate(g.date)}</td>
                <td className="px-4 py-3">{g.betAmount} ETB</td>
                <td className="px-4 py-3">{g.playersNumber}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${g.status === 'RUNNING' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{g.status}</span></td>
                <td className="px-4 py-3">{g.profit.toFixed(0)} ETB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
