'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, Square, Maximize2, Minimize2 } from 'lucide-react';
import { BingoBallBoard } from '@/presentation/components/caller/bingo-ball-board';
import { BingoCardView } from '@/presentation/components/bingo/bingo-card-view';
import { useLiveGame } from '@/presentation/hooks/use-live-game';
import { ipc } from '@/presentation/lib/ipc';
import { APP_NAME } from '@/shared/brand';
import { CURRENCY_LABEL } from '@/shared/constants';
import { getBallLabel } from '@/domain/services/bingo-engine';
import { formatBallCallLabel } from '@/shared/tts/ball-call';
import { cn } from '@/presentation/lib/utils';

interface PreviewCard {
  cardNumber: string;
  grid: number[][];
}

export function CallerDisplay() {
  const { game, loading } = useLiveGame(800);
  const [showStarted, setShowStarted] = useState(false);
  const [previewCard, setPreviewCard] = useState<PreviewCard | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const called = useMemo(() => game?.drawnNumbers ?? [], [game?.drawnNumbers]);
  const calledSet = useMemo(() => new Set(called), [called]);
  const lastDrawn = called.length ? called[called.length - 1] : null;
  const drawCount = called.length;
  const maxBalls = game?.maxBalls ?? 75;
  const recent = [...called].slice(-6).reverse();
  const isPaused = game?.status === 'PAUSED';
  const isRunning = game?.status === 'RUNNING';
  const language = game?.language ?? 'am';

  useEffect(() => {
    if (!game || drawCount > 0) return;
    setShowStarted(true);
    const t = window.setTimeout(() => setShowStarted(false), 4000);
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1f3a] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#1a1f3a] p-8 text-center text-white">
        <p className="text-2xl font-bold">{APP_NAME}</p>
        <p className="mt-4 text-lg text-slate-300">No active game</p>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Start a game on the Game Board, then open this caller display for the hall screen.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#1a1f3a] text-white">
      {/* Top bar — recent draws + players */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {recent.length === 0 ? (
            <span className="text-sm text-slate-400">Waiting for first ball…</span>
          ) : (
            recent.map((n, i) => (
              <div
                key={`${n}-${i}`}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
                  i === 0 ? 'bg-yellow-400 text-slate-900 ring-2 ring-yellow-200' : 'bg-slate-600 text-white',
                )}
              >
                {n}
              </div>
            ))
          )}
        </div>
        <p className="text-lg font-semibold">
          Players: <span className="font-black text-yellow-300">{game.playerCount}</span>
        </p>
      </div>

      {/* Main board area */}
      <div className="flex flex-1 flex-col gap-4 px-4 pb-4 lg:flex-row lg:px-6">
        {/* Left panel — current ball */}
        <div className="flex w-full flex-col items-center justify-between rounded-2xl bg-white px-6 py-8 text-slate-900 shadow-xl lg:w-56 xl:w-64">
          {showStarted && drawCount === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="text-2xl font-black uppercase tracking-wide text-emerald-600">Game has</p>
              <p className="text-3xl font-black uppercase tracking-wide text-emerald-600">Started!</p>
            </div>
          ) : lastDrawn !== null ? (
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-slate-800 bg-slate-100 sm:h-32 sm:w-32">
                <span className="text-5xl font-black sm:text-6xl">{lastDrawn}</span>
              </div>
              <p className="mt-3 text-lg font-bold">{getBallLabel(lastDrawn).replace('-', ' ')}</p>
              <p className="text-xs text-slate-500">{formatBallCallLabel(lastDrawn, language)}</p>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <span className="rounded-full border-2 border-dashed border-slate-300 px-6 py-3 text-lg font-semibold text-slate-400">
                Loading…
              </span>
            </div>
          )}

          <div className="mt-4 w-full text-center">
            <p className="text-3xl font-black">{drawCount}/{maxBalls}</p>
            <p className="mt-4 text-sm font-medium text-slate-500">
              Win:{' '}
              <span className="text-2xl font-black text-red-600">
                {game.prize.toFixed(0)} {CURRENCY_LABEL}
              </span>
            </p>
          </div>
        </div>

        {/* 75-number BINGO grid */}
        <div className="flex flex-1 flex-col rounded-2xl bg-[#232848] p-3 sm:p-4">
          <BingoBallBoard calledSet={calledSet} lastDrawn={lastDrawn} maxBalls={maxBalls} />
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 px-4 py-4 sm:px-6">
        <div className="w-36 sm:w-44">
          {previewCard ? (
            <BingoCardView cardNumber={previewCard.cardNumber} grid={previewCard.grid} compact />
          ) : (
            <div className="rounded-xl border border-dashed border-white/20 p-4 text-center text-xs text-slate-400">
              Cartella preview
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isRunning || isPaused ? (
            <button
              type="button"
              onClick={handlePauseResume}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg',
                isPaused ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-emerald-600 hover:bg-emerald-700',
              )}
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleEndGame}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-700"
          >
            <Square className="h-5 w-5" /> End Game
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-700"
          >
            {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            Fullscreen
          </button>
        </div>
      </div>
    </div>
  );
}
