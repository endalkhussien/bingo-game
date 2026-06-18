'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, Square, Maximize2, Minimize2 } from 'lucide-react';
import { BingoBallBoard } from '@/presentation/components/caller/bingo-ball-board';
import { BingoCardView } from '@/presentation/components/bingo/bingo-card-view';
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

/** Hall / projector screen — Minch Bingo style layout */
export function CallerDisplay() {
  const { game, loading } = useLiveGame(2000);
  const [previewCard, setPreviewCard] = useState<PreviewCard | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [stickyBall, setStickyBall] = useState<number | null>(null);

  const called = useMemo(() => game?.drawnNumbers ?? [], [game?.drawnNumbers]);
  const calledSet = useMemo(() => new Set(called), [called]);
  const lastDrawn = called.length ? called[called.length - 1] : null;
  const displayBall = lastDrawn ?? stickyBall;
  const drawCount = called.length;
  const maxBalls = game?.maxBalls ?? 75;
  const recent = [...called].slice(-4).reverse();
  const callingPhase = game?.callingPhase ?? (game?.status === 'PAUSED' ? 'paused' : 'ready');
  const isAnnouncing = callingPhase === 'announcing';
  const isCalling = callingPhase === 'calling';
  const isPaused = callingPhase === 'paused' || (game?.status === 'PAUSED' && !isCalling);
  const canStart = game && (callingPhase === 'ready' || (isPaused && drawCount === 0));
  const showGameStarted = isAnnouncing || (callingPhase === 'calling' && drawCount === 0);

  useEffect(() => {
    if (lastDrawn !== null) setStickyBall(lastDrawn);
  }, [lastDrawn]);

  useEffect(() => {
    if (!game) setStickyBall(null);
  }, [game]);

  useEffect(() => {
    const first = game?.selectedNumbers?.[0];
    if (!first || !game?.id) {
      setPreviewCard(null);
      return;
    }
    void ipc<{ grid: number[][]; cardNumber: string } | null>('cards:get-by-number', first).then((card) => {
      if (card?.grid) setPreviewCard({ cardNumber: card.cardNumber, grid: card.grid });
      else setPreviewCard(null);
    });
  }, [game?.id, game?.selectedNumbers]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const handleStart = () => {
    broadcastGameControl({ type: 'start-calling' });
  };

  const handlePause = () => {
    broadcastGameControl({ type: 'pause' });
  };

  const handleResume = () => {
    broadcastGameControl({ type: 'resume' });
  };

  const handleEndGame = () => {
    if (!game || !confirm('End this game?')) return;
    broadcastGameControl({ type: 'end-game' });
  };

  if (loading && !game && !readPersistedLiveGame()) {
    return (
      <div className="flex h-screen items-center justify-center overflow-hidden bg-[#0b0f1f] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#facc15] border-t-transparent" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#0b0f1f] text-white">
        <header className="shrink-0 border-b border-white/10 px-6 py-2 text-sm text-white/60">{APP_NAME}</header>
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <p className="text-xl font-bold">{APP_NAME}</p>
          <p className="mt-4 text-slate-300">No active game</p>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Prepare a game on Game Board, then press Start — this screen mirrors the hall display.
          </p>
        </div>
      </div>
    );
  }

  const statusLabel = isAnnouncing
    ? (game.language === 'am' ? 'ጨዋታ ጀመረች' : 'Game has started')
    : isCalling
      ? 'Calling…'
      : isPaused
        ? 'Paused'
        : 'Ready';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0b0f1f] text-white select-none">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-2">
        <span className="text-sm font-semibold tracking-wide text-white/80">{APP_NAME}</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#facc15]">
            {statusLabel}
          </span>
          <span className="font-semibold">
            Players: <span className="font-black text-white">{game.playerCount}</span>
          </span>
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-2 px-5 py-2">
        {recent.length === 0 ? (
          <span className="text-xs text-white/40">—</span>
        ) : (
          recent.map((n, i) => (
            <div
              key={`${n}-${i}`}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold',
                i === 0
                  ? 'bg-[#facc15] text-[#111827] ring-2 ring-[#fde047]'
                  : 'bg-[#374151] text-white',
              )}
            >
              {n}
            </div>
          ))
        )}
      </div>

      <div className="flex min-h-0 flex-1 gap-3 px-4 pb-2 sm:px-5">
        <div className="flex w-[11rem] shrink-0 flex-col rounded-lg bg-white text-[#111827] shadow-lg sm:w-[12.5rem]">
          <div className="flex flex-1 flex-col items-center justify-center px-3 py-4">
            {showGameStarted ? (
              <div className="text-center">
                <p className="text-lg font-black uppercase leading-tight text-emerald-600">
                  {game.language === 'am' ? 'ጨዋታ' : 'Game has'}
                </p>
                <p className="text-xl font-black uppercase text-emerald-600">
                  {game.language === 'am' ? 'ጀመረች' : 'Started'}
                </p>
              </div>
            ) : displayBall !== null ? (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-[#111827] bg-white sm:h-28 sm:w-28">
                <span className="text-5xl font-black sm:text-6xl">{displayBall}</span>
              </div>
            ) : (
              <div className="rounded-full border-2 border-[#111827] px-6 py-3 text-base font-semibold text-[#6b7280]">
                Ready
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-200 px-3 py-3 text-center">
            <p className="text-2xl font-black">{drawCount}/{maxBalls}</p>
            <p className="mt-2 text-sm font-medium text-[#6b7280]">
              Win:{' '}
              <span className="text-xl font-black text-red-600">
                {game.prize.toFixed(0)} {CURRENCY_LABEL}
              </span>
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg bg-[#0f1428] px-2 py-2 sm:px-3">
          <BingoBallBoard calledSet={calledSet} lastDrawn={displayBall} maxBalls={maxBalls} />
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-t border-white/10 px-5 py-3">
        <div className="w-28 shrink-0 sm:w-32">
          {previewCard ? (
            <BingoCardView cardNumber={previewCard.cardNumber} grid={previewCard.grid} compact />
          ) : (
            <div className="rounded-lg border border-dashed border-white/15 p-2 text-center text-[10px] text-white/40">
              Cartella
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {canStart && (
            <button
              type="button"
              onClick={handleStart}
              disabled={isAnnouncing}
              className="inline-flex min-w-[6.5rem] items-center justify-center gap-2 rounded-xl bg-[#16a34a] px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#15803d] disabled:opacity-50"
            >
              <Play className="h-5 w-5 fill-white" /> Start
            </button>
          )}
          {isCalling && (
            <button
              type="button"
              onClick={handlePause}
              className="inline-flex min-w-[6.5rem] items-center justify-center gap-2 rounded-xl bg-[#ea580c] px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#c2410c]"
            >
              <Pause className="h-5 w-5" /> Pause
            </button>
          )}
          {isPaused && drawCount > 0 && !canStart && (
            <button
              type="button"
              onClick={handleResume}
              className="inline-flex min-w-[6.5rem] items-center justify-center gap-2 rounded-xl bg-[#16a34a] px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#15803d]"
            >
              <Play className="h-5 w-5 fill-white" /> Resume
            </button>
          )}
          <button
            type="button"
            onClick={handleEndGame}
            className="inline-flex min-w-[6.5rem] items-center justify-center gap-2 rounded-xl bg-[#dc2626] px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#b91c1c]"
          >
            <Square className="h-4 w-4 fill-white" /> End Game
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex min-w-[6.5rem] items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#1d4ed8]"
          >
            {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            Fullscreen
          </button>
        </div>
      </footer>
    </div>
  );
}
