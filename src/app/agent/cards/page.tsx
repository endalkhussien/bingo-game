'use client';

import { useState, useEffect } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { BingoCardView } from '@/presentation/components/bingo/bingo-card-view';

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

  const handleCreate = async () => {
    await ipc('cards:create');
    await loadCards();
  };

  const handleDelete = async (id: string) => {
    await ipc('cards:delete', id);
    await loadCards();
  };

  const handleUpdate = async (id: string) => {
    // Regenerate card on update
    const newCard = await ipc<{ grid: number[][] }>('cards:create');
    if (newCard?.grid) {
      await ipc('cards:update', id, newCard.grid);
      await loadCards();
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bingo Cards</h1>
        <button onClick={handleCreate}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Create New Card
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-white text-gray-500 shadow-sm">
          <p className="mb-4">No bingo cards yet</p>
          <button onClick={handleCreate} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white">
            Create Your First Card
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <BingoCardView
              key={card.id}
              cardNumber={card.cardNumber}
              grid={card.grid}
              onUpdate={() => handleUpdate(card.id)}
              onDelete={() => handleDelete(card.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
