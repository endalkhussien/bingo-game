'use client';

import { useState, useEffect, useCallback } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { formatBirr, formatDate } from '@/presentation/lib/utils';

interface GameReport {
  id: string;
  gameCode: string;
  date: number;
  betAmount: number;
  playersNumber: number;
  commissionPercent: number;
  profit: number;
  status: string;
}

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeForFrequency(frequency: string): { start: string; end: string } {
  const today = new Date();
  const end = toDateInput(today);
  if (frequency === 'Weekly') {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { start: toDateInput(start), end };
  }
  if (frequency === 'Monthly') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: toDateInput(start), end };
  }
  return { start: end, end };
}

export default function ReportsPage() {
  const [games, setGames] = useState<GameReport[]>([]);
  const [status, setStatus] = useState('ALL');
  const [frequency, setFrequency] = useState('Daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    const { start, end } = rangeForFrequency(frequency);
    setStartDate(start);
    setEndDate(end);
    setPage(1);
  }, [frequency]);

  const loadGames = useCallback(async () => {
    const filters: Record<string, unknown> = { status };
    if (startDate) filters.startDate = new Date(startDate).getTime() / 1000;
    if (endDate) filters.endDate = new Date(endDate).getTime() / 1000 + 86400;
    const data = await ipc<GameReport[]>('games:list', filters);
    setGames(data ?? []);
  }, [status, startDate, endDate]);

  useEffect(() => { void loadGames(); }, [loadGames]);

  const totalGames = games.length;
  const totalProfit = games.reduce((s, g) => s + g.profit, 0);
  const totalPages = Math.max(1, Math.ceil(totalGames / perPage));
  const paged = games.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-gray-200 p-6 text-center shadow-sm">
          <p className="text-sm text-gray-600">Total Games ({frequency})</p>
          <p className="text-3xl font-bold text-gray-900">{totalGames}</p>
        </div>
        <div className="rounded-xl bg-gray-200 p-6 text-center shadow-sm">
          <p className="text-sm text-gray-600">Total Profit (Birr)</p>
          <p className="text-3xl font-bold text-gray-900">{formatBirr(totalProfit)}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="ALL">All Status</option>
          <option value="COMPLETED">Completed</option>
          <option value="RUNNING">Running</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option>Daily</option>
          <option>Weekly</option>
          <option>Monthly</option>
        </select>
        <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Bet Amount (Birr)</th>
              <th className="px-4 py-3 font-semibold">Players Number</th>
              <th className="px-4 py-3 font-semibold">Commission%</th>
              <th className="px-4 py-3 font-semibold">Profit (Birr)</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No games found for this period.</td></tr>
            ) : paged.map((game, i) => (
              <tr key={game.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">{(page - 1) * perPage + i + 1}</td>
                <td className="px-4 py-3">{formatDate(game.date)}</td>
                <td className="px-4 py-3">{game.betAmount.toFixed(2)}</td>
                <td className="px-4 py-3">{game.playersNumber}</td>
                <td className="px-4 py-3">{game.commissionPercent}%</td>
                <td className="px-4 py-3 font-medium">{formatBirr(game.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
            className="rounded-lg border px-4 py-1.5 text-sm disabled:opacity-40">Previous</button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
            className="rounded-lg border px-4 py-1.5 text-sm disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
