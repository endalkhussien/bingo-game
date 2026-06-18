'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ipc } from '@/presentation/lib/ipc';
import { BingoCardView } from '@/presentation/components/bingo/bingo-card-view';
import { CARTELLA_MAX } from '@/shared/constants';

interface CardItem {
  id: string;
  cardNumber: string;
  grid: number[][];
}

export default function CardsPage() {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualNumber, setManualNumber] = useState('');
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');

  const loadCards = async () => {
    setLoading(true);
    const data = await ipc<CardItem[]>('cards:list');
    setCards(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadCards(); }, []);

  const handleRegenerate = async (id: string) => {
    await ipc('cards:regenerate', id);
    await loadCards();
  };

  const handleCreateByNumber = async () => {
    const num = parseInt(manualNumber, 10);
    if (!Number.isFinite(num) || num < 1 || num > CARTELLA_MAX) {
      setCreateMsg(`Enter a cartella number between 1 and ${CARTELLA_MAX}.`);
      return;
    }
    setCreating(true);
    setCreateMsg('');
    try {
      await ipc('cards:create-by-number', num);
      setCreateMsg(`Cartella #${num} added to your deck.`);
      setManualNumber('');
      await loadCards();
    } catch (err) {
      setCreateMsg(err instanceof Error ? err.message : 'Could not create cartella.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bingo Cards (Cartella)</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your deck — {cards.length} cartella{cards.length === 1 ? '' : 's'} (#1–{CARTELLA_MAX} max).
            Add new numbers only when you need them.
          </p>
        </div>
        <Link
          href="/agent/game-board/"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          Game Board →
        </Link>
      </div>

      <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
        <h2 className="text-sm font-semibold text-indigo-900">Add a cartella</h2>
        <p className="mt-1 text-xs text-indigo-800">
          Enter the cartella number you want (e.g. 151, 200, 300). Each gets a random 5×5 grid — use <strong>Shuffle</strong> on the card to change numbers.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Cartella number</label>
            <input
              type="number"
              min={1}
              max={CARTELLA_MAX}
              value={manualNumber}
              onChange={(e) => setManualNumber(e.target.value)}
              placeholder={`1–${CARTELLA_MAX}`}
              className="w-36 rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleCreateByNumber}
            disabled={creating}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {creating ? 'Adding…' : 'Add cartella'}
          </button>
        </div>
        {createMsg && (
          <p className={`mt-3 text-sm ${createMsg.includes('added') ? 'text-emerald-700' : 'text-red-600'}`}>
            {createMsg}
          </p>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          <p className="font-medium">No cartellas yet</p>
          <p className="mt-2 text-sm">Use the form above to add your first cartella number.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <BingoCardView
              key={card.id}
              cardNumber={card.cardNumber}
              grid={card.grid}
              onUpdate={() => handleRegenerate(card.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
