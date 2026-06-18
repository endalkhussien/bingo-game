'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, Square, Maximize2, Minimize2 } from 'lucide-react';
import { BingoBallBoard } from '@/presentation/components/caller/bingo-ball-board';
import { BingoCardView } from '@/presentation/components/bingo/bingo-card-view';
import { useLiveGame } from '@/presentation/hooks/use-live-game';
import { ipc } from '@/presentation/lib/ipc';
import { APP_NAME } from '@/shared/brand';
import { CURRENCY_LABEL } from '@/shared/constants';
import { readPersistedLiveGame } from '@/presentation/lib/live-game-sync';
import { cn } from '@/presentation/lib/utils';

interface PreviewCard {
  cardNumber: string;
  grid: number[][];
}

/** Hall / projector screen — Minch Bingo style layout */
export function CallerDisplay() {
  const { game, loading } = useLiveGame(2000);
  const [showStarted, setShowStarted] = useState(false);
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
  const isPaused = game?.status === 'PAUSED';
  const isRunning = game?.status === 'RUNNING';
  const waitingForFirstBall = isRunning && drawCount === 0;

  useEffect(() => {
    if (lastDrawn !== null) setStickyBall(lastDrawn);
  }, [lastDrawn]);

  useEffect(() => {
    if (!game) setStickyBall(null);
  }, [game]);

  useEffect(() => {
    if (!game || drawCount > 0) return;
    setShowStarted(true);
    const t = window.setTimeout(() => setShowStarted(false), 3500);
    return () => window.clearTimeout(t);
  }, [game?.id, drawCount, game]);

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

  const handlePauseResume = async () => {
    if (!game) return;
    if (isPaused) await ipc('games:resume', game.id);
    else await ipc('games:pause', game.id);
  };

  const handleEndGame = async () => {
    if (!game || !confirm('End this game?')) return;
    await ipc('games:end', game.id);
  };

  if (loading && !game && !readPersistedLiveGame()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0f1f] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#facc15] border-t-transparent" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0b0f1f] text-white">
        <header className="border-b border-white/10 px-6 py-2 text-sm text-white/60">{APP_NAME}</header>
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <p className="text-xl font-bold">{APP_NAME}</p>
          <p className="mt-4 text-slate-300">No active game</p>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Start a game on Game Board — this screen will show called numbers for the hall.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0f1f] text-white select-none">
      {/* App title bar (Minch-style) */}
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-2">
        <span className="text-sm font-semibold tracking-wide text-white/80">{APP_NAME}</span>
        <span className="text-base font-semibold">
          Players: <span className="font-black text-white">{game.playerCount}</span>
        </span>
      </header>

      {/* Recent draws row */}
      <div className="flex items-center gap-2 px-5 py-3">
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

      {/* Main: left status panel + ball board */}
      <div className="flex flex-1 gap-3 px-4 pb-3 sm:px-5">
        {/* White left panel */}
        <div className="flex w-[11rem] shrink-0 flex-col rounded-lg bg-white text-[#111827] shadow-lg sm:w-[12.5rem]">
          <div className="flex flex-1 flex-col items-center justify-center px-3 py-6">
            {showStarted && waitingForFirstBall ? (
              <div className="text-center">
                <p className="text-lg font-black uppercase leading-tight text-emerald-600">Game has</p>
                <p className="text-xl font-black uppercase text-emerald-600">Started</p>
              </div>
            ) : waitingForFirstBall ? (
              <div className="rounded-full border-2 border-[#111827] px-8 py-3 text-lg font-semibold text-[#6b7280]">
                Loading
              </div>
            ) : displayBall !== null ? (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-[#111827] bg-white sm:h-28 sm:w-28">
                <span className="text-5xl font-black sm:text-6xl">{displayBall}</span>
              </div>
            ) : (
              <div className="rounded-full border-2 border-[#111827] px-8 py-3 text-lg font-semibold text-[#6b7280]">
                Loading
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 px-3 py-4 text-center">
            <p className="text-2xl font-black">{drawCount}/{maxBalls}</p>
            <p className="mt-3 text-sm font-medium text-[#6b7280]">
              Win:{' '}
              <span className="text-xl font-black text-red-600">
                {game.prize.toFixed(0)} {CURRENCY_LABEL}
              </span>
            </p>
          </div>
        </div>

        {/* 75-number grid */}
        <div className="min-h-0 flex-1 rounded-lg bg-[#0f1428] px-2 py-3 sm:px-3">
          <BingoBallBoard calledSet={calledSet} lastDrawn={displayBall} maxBalls={maxBalls} />
        </div>
      </div>

      {/* Footer: cartella preview + controls */}
      <footer className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 px-5 py-4">
        <div className="w-32 shrink-0 sm:w-36">
          {previewCard ? (
            <BingoCardView cardNumber={previewCard.cardNumber} grid={previewCard.grid} compact />
          ) : (
            <div className="rounded-lg border border-dashed border-white/15 p-3 text-center text-[10px] text-white/40">
              Cartella
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {(isRunning || isPaused) && (
            <button
              type="button"
              onClick={handlePauseResume}
              className="inline-flex min-w-[7rem] items-center justify-center gap-2 rounded-xl bg-[#16a34a] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[#15803d]"
            >
              {isPaused ? <Play className="h-5 w-5 fill-white" /> : <Pause className="h-5 w-5" />}
              {isPaused ? 'Play' : 'Pause'}
            </button>
          )}
          <button
            type="button"
            onClick={handleEndGame}
            className="inline-flex min-w-[7rem] items-center justify-center gap-2 rounded-xl bg-[#dc2626] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[#b91c1c]"
          >
            <Square className="h-4 w-4 fill-white" /> End Game
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex min-w-[7rem] items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[#1d4ed8]"
          >
            {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            Fullscreen
          </button>
        </div>
      </footer>
    </div>
  );
}
