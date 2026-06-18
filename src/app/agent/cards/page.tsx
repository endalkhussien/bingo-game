'use client';

import { useState, useEffect } from 'react';
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
  const [rebuilding, setRebuilding] = useState(false);
  const [manualNumber, setManualNumber] = useState('');
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');
  const [bulkCount, setBulkCount] = useState('10');

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

  const handleRebuildAll = async () => {
    setRebuilding(true);
    await ipc('cards:rebuild-deck', true);
    await loadCards();
    setRebuilding(false);
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
      setCreateMsg(`Cartella #${num} created.`);
      setManualNumber('');
      await loadCards();
    } catch (err) {
      setCreateMsg(err instanceof Error ? err.message : 'Could not create cartella.');
    } finally {
      setCreating(false);
    }
  };

  const handleBulkCreate = async () => {
    const count = parseInt(bulkCount, 10);
    if (!Number.isFinite(count) || count < 1) {
      setCreateMsg('Enter how many cartellas to generate.');
      return;
    }
    setCreating(true);
    setCreateMsg('');
    try {
      const created = await ipc<CardItem[]>('cards:generate', count);
      setCreateMsg(`Created ${created?.length ?? 0} cartella(s).`);
      await loadCards();
    } catch (err) {
      setCreateMsg(err instanceof Error ? err.message : 'Bulk create failed.');
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
            Up to {CARTELLA_MAX} cartellas (#1–{CARTELLA_MAX}). Create manually or shuffle grids before a game.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-gray-700">{cards.length}/{CARTELLA_MAX} created</p>
          <button
            onClick={handleRebuildAll}
            disabled={rebuilding || cards.length === 0}
            className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600 disabled:opacity-50"
          >
            {rebuilding ? 'Rebuilding…' : 'Shuffle all grids'}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
        <h2 className="text-sm font-semibold text-indigo-900">Create cartellas manually</h2>
        <p className="mt-1 text-xs text-indigo-800">
          Large halls use 200–300 cartellas. Pick the exact number you need — each gets a random 5×5 grid (you can shuffle after).
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
              className="w-32 rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleCreateByNumber}
            disabled={creating}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create cartella'}
          </button>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Bulk generate</label>
            <input
              type="number"
              min={1}
              max={50}
              value={bulkCount}
              onChange={(e) => setBulkCount(e.target.value)}
              className="w-24 rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleBulkCreate}
            disabled={creating}
            className="rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
          >
            Generate next slots
          </button>
        </div>
        {createMsg && (
          <p className={`mt-3 text-sm ${createMsg.includes('created') || createMsg.includes('Created') ? 'text-emerald-700' : 'text-red-600'}`}>
            {createMsg}
          </p>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          No cartellas yet. Create one by number above, or select numbers on the Game Board (they are created automatically when you start a game).
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
