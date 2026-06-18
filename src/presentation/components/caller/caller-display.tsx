'use client';

import { useEffect, useMemo, useState } from 'react';
import { Play, Square, Maximize2, Minimize2, Shuffle, Trophy, Ban } from 'lucide-react';
import { BingoBallBoard } from '@/presentation/components/caller/bingo-ball-board';
import { MinchCartellaPreview } from '@/presentation/components/caller/minch-cartella-preview';
import { useLiveGame } from '@/presentation/hooks/use-live-game';
import { ipc } from '@/presentation/lib/ipc';
import { APP_NAME } from '@/shared/brand';
import { CURRENCY_LABEL } from '@/shared/constants';
import { broadcastGameControl, readPersistedLiveGame } from '@/presentation/lib/live-game-sync';
import { cn } from '@/presentation/lib/utils';

interface PreviewCard {
  cardNumber: string;
  grid: number[][];
}

/** Hall / projector screen — Minch Bingo layout */
export function CallerDisplay() {
  const { game, loading } = useLiveGame(800);
  const [previewCards, setPreviewCards] = useState<PreviewCard[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [stickyBall, setStickyBall] = useState<number | null>(null);

  const called = useMemo(() => game?.drawnNumbers ?? [], [game?.drawnNumbers]);
  const calledSet = useMemo(() => new Set(called), [called]);
  const lastDrawn = called.length ? called[called.length - 1] : null;
  const displayBall = lastDrawn ?? stickyBall;
  const drawCount = called.length;
  const maxBalls = game?.maxBalls ?? 75;
  const recent = [...called].slice(-8);
  const callingPhase = game?.callingPhase ?? (game?.status === 'PAUSED' ? 'paused' : 'ready');
  const isAnnouncing = callingPhase === 'announcing';
  const isCalling = callingPhase === 'calling';
  const isPaused = !isCalling && (callingPhase === 'paused' || game?.status === 'PAUSED' || callingPhase === 'ready');
  const bingoClaimActive = !!game?.bingoClaimActive;
  const showCheckCards = bingoClaimActive || (isPaused && drawCount > 0);
  const announcement = game?.announcement;

  const previewCard = previewCards[previewIndex] ?? null;

  useEffect(() => {
    if (lastDrawn !== null) setStickyBall(lastDrawn);
  }, [lastDrawn]);

  useEffect(() => {
    if (!game) {
      setStickyBall(null);
      setPreviewCards([]);
      return;
    }
    const nums = game.selectedNumbers ?? [];
    if (!nums.length) {
      setPreviewCards([]);
      return;
    }
    void Promise.all(
      nums.slice(0, 12).map((n) =>
        ipc<{ grid: number[][]; cardNumber: string } | null>('cards:get-by-number', n).then((c) =>
          c?.grid ? { cardNumber: c.cardNumber, grid: c.grid } : null,
        ),
      ),
    ).then((rows) => {
      setPreviewCards(rows.filter((r): r is PreviewCard => !!r));
      setPreviewIndex(0);
    });
  }, [game?.id, game?.selectedNumbers, game]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const handlePlay = () => {
    if (!game || isAnnouncing) return;
    if (isCalling) {
      broadcastGameControl({ type: 'pause' });
    } else if (drawCount === 0) {
      broadcastGameControl({ type: 'start-calling' });
    } else {
      broadcastGameControl({ type: 'resume' });
    }
  };

  const handleEndGame = () => {
    if (!game || !confirm('End this game?')) return;
    broadcastGameControl({ type: 'end-game' });
  };

  const handleCheckCards = () => {
    broadcastGameControl({ type: 'check-cards' });
  };

  const handleShufflePreview = () => {
    if (previewCards.length <= 1) return;
    setPreviewIndex((i) => (i + 1) % previewCards.length);
  };

  if (loading && !game && !readPersistedLiveGame()) {
    return (
      <div className="flex h-screen items-center justify-center overflow-hidden bg-[#1e1e1e] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#facc15] border-t-transparent" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#1e1e1e] text-white">
        <header className="shrink-0 px-5 py-2 text-sm text-white/50">{APP_NAME}</header>
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#facc15] border-t-transparent" />
          <p className="text-xl font-bold">{APP_NAME}</p>
          <p className="mt-4 text-gray-300">Waiting for game from Game Board…</p>
          <p className="mt-2 max-w-md text-sm text-gray-500">
            Keep the Game Board tab open. Select cartellas and click <strong>Create Game</strong> — this screen will sync automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#1e1e1e] text-white select-none">
      {announcement && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-6">
          <div className={cn(
            'max-w-xl rounded-xl px-10 py-12 text-center shadow-2xl',
            announcement.type === 'winner' ? 'bg-[#16a34a] text-white' : 'bg-[#b91c1c] text-white',
          )}>
            {announcement.type === 'winner' ? (
              <Trophy className="mx-auto mb-4 h-20 w-20" />
            ) : (
              <Ban className="mx-auto mb-4 h-20 w-20" />
            )}
            <p className="text-4xl font-black">#{announcement.cardNumber}</p>
            {announcement.prizeAmount != null && (
              <p className="mt-4 text-3xl font-bold">{announcement.prizeAmount.toFixed(0)} {CURRENCY_LABEL}</p>
            )}
            <p className="mt-4 text-lg">{announcement.message}</p>
          </div>
        </div>
      )}

      {/* Top bar — Recent draws + Players */}
      <div className="flex shrink-0 items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-300">Recent Draws:</span>
          <div className="flex items-center gap-1.5">
            {recent.length === 0 ? (
              <span className="text-xs text-gray-500">—</span>
            ) : (
              recent.map((n) => (
                <div
                  key={n}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4b5563] text-sm font-bold text-white"
                >
                  {n}
                </div>
              ))
            )}
          </div>
        </div>
        <p className="text-base font-semibold">
          Players: <span className="font-black">{game.playerCount}</span>
        </p>
      </div>

      {/* Main area */}
      <div className="flex min-h-0 flex-1 gap-4 px-5 pb-3">
        {/* Left white panel */}
        <div className="flex w-[10.5rem] shrink-0 flex-col rounded-lg bg-white text-[#111827] shadow-xl sm:w-[11.5rem]">
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-6">
            {isAnnouncing ? (
              <div className="text-center">
                <p className="text-lg font-black uppercase text-emerald-600">
                  {game.language === 'am' ? 'ጨዋታ ጀመረች' : 'Game has started'}
                </p>
              </div>
            ) : displayBall !== null ? (
              <div className="flex h-[7.5rem] w-[7.5rem] items-center justify-center rounded-full border-[3px] border-black bg-white sm:h-32 sm:w-32">
                <span className="text-6xl font-black sm:text-7xl">{displayBall}</span>
              </div>
            ) : (
              <div className="rounded-full border-2 border-black px-8 py-3 text-lg font-semibold text-gray-500">
                Loading
              </div>
            )}
          </div>
          <div className="border-t border-gray-200 px-4 py-4 text-center">
            <p className="text-3xl font-black text-gray-700">{drawCount}/{maxBalls}</p>
            <p className="mt-3 text-base text-gray-600">
              Win:{' '}
              <span className="text-2xl font-black text-red-600">
                {game.prize.toFixed(0)} {CURRENCY_LABEL}
              </span>
            </p>
          </div>
        </div>

        {/* 75-ball board */}
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg bg-[#2a2a2a] px-2 py-2">
          <BingoBallBoard calledSet={calledSet} lastDrawn={displayBall} maxBalls={maxBalls} />
        </div>
      </div>

      {/* Footer — cartella + controls (always visible) */}
      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-white/10 px-5 py-4">
        <div className="w-[7.5rem] shrink-0 sm:w-32">
          {previewCard ? (
            <MinchCartellaPreview grid={previewCard.grid} calledSet={calledSet} compact />
          ) : (
            <div className="rounded-md border-2 border-dashed border-white/20 p-3 text-center text-[10px] text-white/40">
              Cartella
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handlePlay}
            disabled={isAnnouncing}
            className="inline-flex min-h-[3rem] min-w-[7.5rem] items-center justify-center gap-2 rounded-2xl bg-[#22c55e] px-6 py-3 text-base font-bold text-white shadow-lg hover:bg-[#16a34a] disabled:opacity-50"
          >
            <Play className="h-6 w-6 fill-white" /> Play
          </button>
          <button
            type="button"
            onClick={handleEndGame}
            className="inline-flex min-h-[3rem] min-w-[7.5rem] items-center justify-center gap-2 rounded-2xl bg-[#ef4444] px-6 py-3 text-base font-bold text-white shadow-lg hover:bg-[#dc2626]"
          >
            <Square className="h-5 w-5 fill-white" /> End Game
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex min-h-[3rem] min-w-[7.5rem] items-center justify-center gap-2 rounded-2xl bg-[#3b82f6] px-6 py-3 text-base font-bold text-white shadow-lg hover:bg-[#2563eb]"
          >
            {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            Fullscreen
          </button>
          {showCheckCards && (
            <button
              type="button"
              onClick={handleCheckCards}
              className="inline-flex min-h-[3rem] min-w-[8rem] items-center justify-center gap-2 rounded-2xl bg-[#f59e0b] px-6 py-3 text-base font-bold text-[#111827] shadow-lg hover:bg-[#d97706]"
            >
              Check Cards
            </button>
          )}
          {previewCards.length > 1 && (
            <button
              type="button"
              onClick={handleShufflePreview}
              className="inline-flex min-h-[3rem] min-w-[7rem] items-center justify-center gap-2 rounded-2xl bg-[#8b5cf6] px-5 py-3 text-base font-bold text-white shadow-lg hover:bg-[#7c3aed]"
            >
              <Shuffle className="h-5 w-5" /> Shuffle
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
