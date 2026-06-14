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

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bingo Cards (Cartella)</h1>
          <p className="mt-1 text-sm text-gray-500">
            {CARTELLA_MAX} cards (#1–{CARTELLA_MAX}), each 5×5 with random numbers from 1–75 (B-I-N-G-O columns).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-gray-700">{cards.length}/{CARTELLA_MAX} cards</p>
          <button
            onClick={handleRebuildAll}
            disabled={rebuilding}
            className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600 disabled:opacity-50"
          >
            {rebuilding ? 'Rebuilding…' : 'Rebuild all 150'}
          </button>
        </div>
      </div>

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
    </div>
  );
}
