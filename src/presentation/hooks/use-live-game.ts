'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { calculateWinnerPrize } from '@/shared/prize';
import {
  mergeLiveGameSnapshots,
  readPersistedLiveGame,
  subscribeLiveGame,
  subscribeStorageLiveGame,
  type CallingPhase,
  type GameWinnerSnapshot,
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
  callingPhase?: CallingPhase;
  bannedCartellas?: string[];
  winners?: GameWinnerSnapshot[];
  prize?: number;
}

function snapshotFromPersisted(): LiveGameSnapshot | null {
  return readPersistedLiveGame();
}

function toSnapshot(game: ActiveGameRow | null, prev?: LiveGameSnapshot | null): LiveGameSnapshot | null {
  if (!game) return null;
  const commissionRate = game.commissionRate ?? 20;
  const prize = game.prize ?? calculateWinnerPrize(game.betAmount, game.playerCount, commissionRate).prize;
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
    callingPhase: game.callingPhase ?? prev?.callingPhase,
    bannedCartellas: game.bannedCartellas ?? prev?.bannedCartellas,
    winners: game.winners ?? prev?.winners,
    bingoClaimActive: prev?.bingoClaimActive,
    announcement: prev?.announcement,
  };
}

export function useLiveGame(pollMs = 1000) {
  const [game, setGame] = useState<LiveGameSnapshot | null>(() => readPersistedLiveGame());
  const [loading, setLoading] = useState(true);
  const gameRef = useRef<LiveGameSnapshot | null>(game);
  const endedRef = useRef(false);

  const applySnapshot = useCallback((incoming: LiveGameSnapshot | null) => {
    if (!incoming) {
      if (endedRef.current) {
        gameRef.current = null;
        setGame(null);
        setLoading(false);
      }
      return;
    }
    endedRef.current = false;
    setGame((prev) => {
      const merged = mergeLiveGameSnapshots(prev, incoming);
      gameRef.current = merged;
      return merged;
    });
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    const persisted = snapshotFromPersisted();
    const row = await ipc<ActiveGameRow | null>('games:active');
    const fromPoll = toSnapshot(row, gameRef.current);
    const incoming = fromPoll ?? persisted;

    if (incoming && !endedRef.current) {
      let merged: LiveGameSnapshot | null = null;
      setGame((prev) => {
        merged = mergeLiveGameSnapshots(prev, incoming);
        gameRef.current = merged;
        return merged;
      });
      setLoading(false);
      return merged;
    }

    if (!endedRef.current && gameRef.current) {
      setLoading(false);
      return gameRef.current;
    }

    if (!endedRef.current && persisted) {
      gameRef.current = persisted;
      setGame(persisted);
      setLoading(false);
      return persisted;
    }

    setGame(null);
    gameRef.current = null;
    setLoading(false);
    return null;
  }, []);

  useEffect(() => {
    const persisted = readPersistedLiveGame();
    if (persisted) {
      gameRef.current = persisted;
      setGame(persisted);
      endedRef.current = false;
    }
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, pollMs);
    return () => window.clearInterval(interval);
  }, [refresh, pollMs]);

  useEffect(() => {
    return subscribeLiveGame((msg) => {
      if (msg.type === 'game-update' && msg.payload) {
        applySnapshot(msg.payload);
      }
      if (msg.type === 'game-started') {
        applySnapshot(msg.payload);
      }
      if (msg.type === 'game-ended') {
        endedRef.current = true;
        gameRef.current = null;
        setGame(null);
        setLoading(false);
      }
    });
  }, [applySnapshot]);

  useEffect(() => {
    return subscribeStorageLiveGame((snapshot) => {
      if (snapshot) {
        applySnapshot(snapshot);
      } else if (endedRef.current) {
        applySnapshot(null);
      }
    });
  }, [applySnapshot]);

  return { game, loading, refresh };
}
