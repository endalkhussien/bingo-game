'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, Square, Maximize2, Minimize2, Shuffle, Trophy, Ban } from 'lucide-react';
import { BingoBallBoard } from '@/presentation/components/caller/bingo-ball-board';
import { MinchCartellaPreview } from '@/presentation/components/caller/minch-cartella-preview';
import { useLiveGame } from '@/presentation/hooks/use-live-game';
import { ipc } from '@/presentation/lib/ipc';
import { APP_NAME } from '@/shared/brand';
import { AppLogo } from '@/presentation/components/shared/app-logo';
import { CURRENCY_LABEL } from '@/shared/constants';
import { broadcastGameControl, readPersistedLiveGame, type LiveGameSnapshot } from '@/presentation/lib/live-game-sync';
import { cn } from '@/presentation/lib/utils';

interface PreviewCard {
  cardNumber: string;
  grid: number[][];
}

export interface CallerDisplayControls {
  onPlay: () => void;
  onEndGame: () => void;
  onCheckCards: () => void;
}

export interface CallerDisplayProps {
  embedded?: {
    game: LiveGameSnapshot;
    controls: CallerDisplayControls;
  };
}

function CallerDisplayView({
  game,
  onPlay,
  onEndGame,
  onCheckCards,
}: {
  game: LiveGameSnapshot;
  onPlay: () => void;
  onEndGame: () => void;
  onCheckCards: () => void;
}) {
  const [previewCards, setPreviewCards] = useState<PreviewCard[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [shuffleFlash, setShuffleFlash] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [stickyBall, setStickyBall] = useState<number | null>(null);

  const called = useMemo(() => game.drawnNumbers ?? [], [game.drawnNumbers]);
  const calledSet = useMemo(() => new Set(called), [called]);
  const lastDrawn = called.length ? called[called.length - 1] : null;
  const displayBall = lastDrawn ?? stickyBall;
  const drawCount = called.length;
  const maxBalls = game.maxBalls ?? 75;
  const recent = [...called].slice(-8);
  const callingPhase = game.callingPhase ?? (game.status === 'PAUSED' ? 'paused' : 'ready');
  const isAnnouncing = callingPhase === 'announcing';
  const isCalling = callingPhase === 'calling';
  const isPaused = !isCalling;
  const claimActive = !!game.bingoClaimActive;
  const hasWinner = (game.winners?.length ?? 0) > 0;
  const announcement = game.announcement;

  const previewCard = previewCards[previewIndex] ?? null;

  useEffect(() => {
    if (lastDrawn !== null) setStickyBall(lastDrawn);
  }, [lastDrawn]);

  useEffect(() => {
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
  }, [game.id, game.selectedNumbers]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const handleShufflePreview = () => {
    if (previewCards.length <= 1) return;
    setPreviewCards((cards) => {
      const shuffled = [...cards];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    setPreviewIndex(0);
    setShuffleFlash(true);
    window.setTimeout(() => setShuffleFlash(false), 2000);
  };

  return (
    <div className="relative flex h-full min-h-screen flex-col overflow-hidden bg-[#141c2e] text-white select-none">
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
            <p className="text-5xl font-black">#{announcement.cardNumber}</p>
            {announcement.prizeAmount != null && (
              <p className="mt-4 text-4xl font-bold">{announcement.prizeAmount.toFixed(0)} {CURRENCY_LABEL}</p>
            )}
            <p className="mt-4 text-xl">{announcement.message}</p>
          </div>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <AppLogo size={64} className="rounded-xl shadow-md ring-2 ring-amber-400/20" />
          <span className="text-lg font-semibold text-gray-200">Recent Draws:</span>
          <div className="flex items-center gap-2">
            {recent.length === 0 ? (
              <span className="text-sm text-gray-500">—</span>
            ) : (
              recent.map((n) => (
                <div
                  key={n}
                  className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[#facc15] bg-white text-xl font-bold text-[#111827]"
                >
                  {n}
                </div>
              ))
            )}
          </div>
        </div>
        <p className="text-xl font-semibold">
          Players: <span className="text-2xl font-black">{game.playerCount}</span>
        </p>
      </div>

      <div className="flex min-h-0 flex-1 gap-5 px-6 pb-4">
        <div className="flex w-[13rem] shrink-0 flex-col rounded-lg bg-white text-[#111827] shadow-xl sm:w-[15rem] lg:w-[17rem]">
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
            {isAnnouncing ? (
              <p className="text-center text-2xl font-black uppercase leading-tight text-emerald-600">
                {game.language === 'am' ? 'ጨዋታ ጀመረች' : 'Game has started'}
              </p>
            ) : displayBall !== null ? (
              <div className={cn(
                'flex h-40 w-40 items-center justify-center rounded-full border-[5px] lg:h-52 lg:w-52',
                isPaused || claimActive
                  ? 'border-[#facc15] bg-[#facc15] text-[#111827] shadow-lg ring-4 ring-[#fde047]'
                  : 'border-black bg-white',
              )}>
                <span className="text-8xl font-black lg:text-[7rem]">{displayBall}</span>
              </div>
            ) : (
              <div className="rounded-full border-[3px] border-black px-10 py-4 text-2xl font-bold text-gray-500">
                —
              </div>
            )}
          </div>
          <div className="border-t-2 border-gray-200 px-4 py-5 text-center">
            <p className="text-4xl font-black text-gray-800 lg:text-5xl">{drawCount}/{maxBalls}</p>
            <p className="mt-4 text-lg text-gray-600">
              Win:{' '}
              <span className="text-3xl font-black text-red-600 lg:text-4xl">
                {game.prize.toFixed(0)} {CURRENCY_LABEL}
              </span>
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg bg-[#1e2a42] px-3 py-3">
          <BingoBallBoard calledSet={calledSet} lastDrawn={displayBall} maxBalls={maxBalls} large />
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-white/10 px-6 py-5">
        <div className="w-32 shrink-0 lg:w-36">
          {previewCard ? (
            <div>
              <p className="mb-1 text-center text-[10px] font-bold text-[#facc15]">
                #{previewCard.cardNumber}
                {shuffleFlash && <span className="ml-1 text-white">· Shuffled!</span>}
              </p>
              <MinchCartellaPreview grid={previewCard.grid} calledSet={calledSet} compact />
            </div>
          ) : (
            <div className="rounded-md border-2 border-dashed border-white/20 p-4 text-center text-xs text-white/40">
              Cartella
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-4">
          <button
            type="button"
            onClick={onPlay}
            disabled={isAnnouncing || hasWinner}
            className="inline-flex min-h-[3.5rem] min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl bg-[#22c55e] px-8 py-4 text-xl font-bold text-white shadow-lg hover:bg-[#16a34a] disabled:opacity-50"
          >
            <Play className="h-7 w-7 fill-white" />
            {hasWinner ? 'Winner!' : isCalling ? 'Pause' : isPaused && drawCount > 0 ? 'Resume' : 'Play'}
          </button>
          <button
            type="button"
            onClick={onEndGame}
            className="inline-flex min-h-[3.5rem] min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl bg-[#ef4444] px-8 py-4 text-lg font-bold text-white shadow-lg hover:bg-[#dc2626]"
          >
            <Square className="h-6 w-6 fill-white" /> End Game
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex min-h-[3.5rem] min-w-[8.5rem] items-center justify-center gap-2 rounded-2xl bg-[#3b82f6] px-8 py-4 text-lg font-bold text-white shadow-lg hover:bg-[#2563eb]"
          >
            {fullscreen ? <Minimize2 className="h-6 w-6" /> : <Maximize2 className="h-6 w-6" />}
            {fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          {claimActive && (
            <button
              type="button"
              onClick={onCheckCards}
              className="check-cards-claim inline-flex min-h-[3.5rem] min-w-[10rem] items-center justify-center gap-2 rounded-2xl bg-[#facc15] px-8 py-4 text-xl font-black text-[#111827] shadow-lg hover:bg-[#eab308]"
            >
              Check Cards
            </button>
          )}
          {previewCards.length > 1 && (
            <button
              type="button"
              onClick={handleShufflePreview}
              className={cn(
                'inline-flex min-h-[3.5rem] min-w-[8rem] items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-bold text-white shadow-lg',
                shuffleFlash ? 'bg-[#a855f7] ring-2 ring-[#fde047]' : 'bg-[#8b5cf6] hover:bg-[#7c3aed]',
              )}
            >
              <Shuffle className="h-6 w-6" /> Shuffle
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

/** Hall / projector screen — Minch Bingo layout */
export function CallerDisplay({ embedded }: CallerDisplayProps = {}) {
  const live = useLiveGame(embedded ? 0 : 800);
  const game = embedded?.game ?? live.game;
  const loading = embedded ? false : live.loading;

  if (!embedded) {
    if (loading && !game && !readPersistedLiveGame()) {
      return (
        <div className="flex h-screen items-center justify-center overflow-hidden bg-[#141c2e] text-white">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#facc15] border-t-transparent" />
        </div>
      );
    }

    if (!game) {
      return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#141c2e] text-white">
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <p className="text-2xl font-bold">{APP_NAME}</p>
            <p className="mt-4 text-gray-300">No active game</p>
            <p className="mt-2 text-sm text-gray-500">Create a game on Game Board first.</p>
          </div>
        </div>
      );
    }

    return (
      <CallerDisplayView
        game={game}
        onPlay={() => {
          if ((game.winners?.length ?? 0) > 0) return;
          const phase = game.callingPhase ?? 'ready';
          const calling = phase === 'calling';
          const count = game.drawnNumbers?.length ?? 0;
          if (calling) broadcastGameControl({ type: 'pause' });
          else if (count === 0) broadcastGameControl({ type: 'start-calling' });
          else broadcastGameControl({ type: 'resume' });
        }}
        onEndGame={() => {
          if (confirm('End this game?')) broadcastGameControl({ type: 'end-game' });
        }}
        onCheckCards={() => broadcastGameControl({ type: 'check-cards' })}
      />
    );
  }

  return (
    <CallerDisplayView
      game={embedded.game}
      onPlay={embedded.controls.onPlay}
      onEndGame={embedded.controls.onEndGame}
      onCheckCards={embedded.controls.onCheckCards}
    />
  );
}

export function HallModeOverlay({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    document.body.classList.add('overflow-hidden');
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, []);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#141c2e]">{children}</div>,
    document.body,
  );
}
