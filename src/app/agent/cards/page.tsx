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

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bingo Cards (Cartella)</h1>
          <p className="mt-1 text-sm text-gray-500">
            {CARTELLA_MAX} cards (#1–{CARTELLA_MAX}). Each card holds random numbers from 1–75 (B-I-N-G-O columns).
          </p>
        </div>
        <p className="text-sm font-medium text-gray-700">{cards.length}/{CARTELLA_MAX} cards ready</p>
      </div>

      {cards.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-white text-gray-500 shadow-sm">
          <p className="mb-4">Loading cartella deck…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <BingoCardView
              key={card.id}
              cardNumber={card.cardNumber}
              grid={card.grid}
              onUpdate={() => handleRegenerate(card.id)}
              onDelete={undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
