'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { calculateWinnerPrize } from '@/shared/prize';
import {
  subscribeLiveGame,
  type LiveGameSnapshot,
} from '@/presentation/lib/live-game-sync';

interface ActiveGameRow {
  id: string;
  gameCode: string;
  betAmount: number;
  status: string;
  playerCount: number;
  totalPot: number;
  drawnNumbers: number[];
  callHistory?: { number: number; drawOrder: number; drawnAt: number }[];
  maxBalls: number;
  voiceType?: string;
  language?: string;
  selectedNumbers?: number[];
  commissionRate?: number;
  startedAt?: number;
}

function toSnapshot(game: ActiveGameRow | null): LiveGameSnapshot | null {
  if (!game) return null;
  const commissionRate = game.commissionRate ?? 20;
  const { prize } = calculateWinnerPrize(game.betAmount, game.playerCount, commissionRate);
  return {
    id: game.id,
    gameCode: game.gameCode,
    betAmount: game.betAmount,
    status: game.status,
    playerCount: game.playerCount,
    totalPot: game.totalPot,
    prize,
    drawnNumbers: game.drawnNumbers ?? [],
    callHistory: game.callHistory ?? [],
    maxBalls: game.maxBalls,
    voiceType: game.voiceType,
    language: game.language,
    selectedNumbers: game.selectedNumbers,
    commissionRate,
    startedAt: game.startedAt,
  };
}

export function useLiveGame(pollMs = 1000) {
  const [game, setGame] = useState<LiveGameSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const lastIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const row = await ipc<ActiveGameRow | null>('games:active');
    const snapshot = toSnapshot(row);
    setGame(snapshot);
    setLoading(false);
    return snapshot;
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, pollMs);
    return () => window.clearInterval(interval);
  }, [refresh, pollMs]);

  useEffect(() => {
    return subscribeLiveGame((msg) => {
      if (msg.type === 'game-update') {
        setGame(msg.payload);
        setLoading(false);
      }
      if (msg.type === 'game-started') {
        setGame(msg.payload);
        setLoading(false);
        lastIdRef.current = msg.payload.id;
      }
      if (msg.type === 'game-ended') {
        setGame(null);
        lastIdRef.current = null;
      }
    });
  }, []);

  return { game, loading, refresh };
}
