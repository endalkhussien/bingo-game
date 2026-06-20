'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ipc } from '@/presentation/lib/ipc';
import { BingoCardView } from '@/presentation/components/bingo/bingo-card-view';
import { CARTELLA_MAX } from '@/shared/constants';
import { INITIAL_CARTELLA_COUNT } from '@/shared/brand';

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
  const [saveMsg, setSaveMsg] = useState('');

  const loadCards = async () => {
    setLoading(true);
    const data = await ipc<CardItem[]>('cards:list');
    setCards(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadCards(); }, []);

  const handleSaveGrid = async (id: string, cardNumber: string, grid: number[][]) => {
    setSaveMsg('');
    const result = await ipc<{ success?: boolean; error?: string }>('cards:update', id, grid);
    if (result && typeof result === 'object' && 'error' in result && result.error) {
      throw new Error(String(result.error));
    }
    await loadCards();
    setSaveMsg(`Cartella #${cardNumber} saved.`);
    window.setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleDelete = async (id: string, cardNumber: string) => {
    if (!confirm(`Delete cartella #${cardNumber}? This cannot be undone.`)) return;
    await ipc('cards:delete', id);
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
            Your deck — {cards.length} cartella{cards.length === 1 ? '' : 's'}.
            Default deck is #1–{INITIAL_CARTELLA_COUNT}; you can add up to #{CARTELLA_MAX} manually.
          </p>
        </div>
        <Link
          href="/agent/game-board/"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          Game Board →
        </Link>
      </div>

      {saveMsg && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {saveMsg}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
        <h2 className="text-sm font-semibold text-indigo-900">Add a cartella</h2>
        <p className="mt-1 text-xs text-indigo-800">
          Enter a cartella number (e.g. 151, 200, 300). Press <strong>Update</strong> on a card, edit numbers, then <strong>Save</strong>.
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
              onSave={(grid) => handleSaveGrid(card.id, card.cardNumber, grid)}
              onDelete={() => handleDelete(card.id, card.cardNumber)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
