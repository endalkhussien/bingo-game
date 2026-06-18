'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Eye, EyeOff, Play, Pause, Megaphone, ListOrdered, Monitor, Search, Ban } from 'lucide-react';
import { ipc } from '@/presentation/lib/ipc';
import { useAuth } from '@/presentation/providers/auth-provider';
import { NumberGrid } from '@/presentation/components/bingo/number-grid';
import { CalledNumbersModal } from '@/presentation/components/bingo/called-numbers-modal';
import { CalledNumbersStrip } from '@/presentation/components/bingo/called-numbers-strip';
import { CheckCardModal } from '@/presentation/components/bingo/check-card-modal';
import { WINNING_PATTERNS, DRAW_INTERVALS, VOICE_TYPES, MIN_BET, DEFAULT_JACKPOT_MAX_CALLS, DEFAULT_CALL_COOLDOWN_MS, GAME_START_DELAY_MS } from '@/shared/constants';
import { DRAW_BALL_COUNT } from '@/shared/brand';
import { speakBallCall, speakCartella, speakGameStarted, loadVoices } from '@/presentation/lib/tts';
import { stopCurrentAudio, preloadBallCallClips } from '@/presentation/lib/amharic-audio';
import { AudioSyncManager, runAutoCallLoop } from '@/presentation/lib/audio-sync-manager';
import { CallingEngine } from '@/domain/services/calling-engine';
import { getBallLabel } from '@/domain/services/bingo-engine';
import { formatBallCallLabel } from '@/shared/tts/ball-call';
import { calculateTotalPot, calculateGameEconomics, calculateWinnerPrize } from '@/shared/prize';
import { broadcastLiveGame, subscribeGameControl, type LiveGameSnapshot, type CallingPhase, type LiveGameAnnouncement } from '@/presentation/lib/live-game-sync';
import { isElectron } from '@/shared/runtime';
import { CallerDisplay } from '@/presentation/components/caller/caller-display';

interface GameWinner {
  cardNumber: string;
  prizeAmount: number;
  pattern?: string;
  calledCountAtWin?: number;
}

interface CallHistoryEntry {
  number: number;
  drawOrder: number;
  drawnAt: number;
}

interface ActiveGame {
  id: string;
  gameCode: string;
  betAmount: number;
  status: string;
  selectedNumbers: number[];
  drawnNumbers: number[];
  callHistory?: CallHistoryEntry[];
  drawSpeedMs: number;
  totalPot?: number;
  playerCount?: number;
  maxBalls?: number;
  voiceType?: string;
  language?: string;
  winners?: GameWinner[];
  bannedCartellas?: string[];
  winningPattern?: string;
}

function buildLiveSnapshot(
  game: ActiveGame,
  called: number[],
  callHistory: CallHistoryEntry[],
  commissionRate: number,
  callingPhase: CallingPhase,
  extras?: {
    bingoClaimActive?: boolean;
    bannedCartellas?: string[];
    winners?: GameWinner[];
    announcement?: LiveGameAnnouncement | null;
  },
): LiveGameSnapshot {
  const playerCount = game.playerCount ?? game.selectedNumbers?.length ?? 0;
  const { prize } = calculateWinnerPrize(game.betAmount, playerCount, commissionRate);
  return {
    id: game.id,
    gameCode: game.gameCode,
    betAmount: game.betAmount,
    status: game.status,
    playerCount,
    totalPot: game.totalPot ?? calculateTotalPot(game.betAmount, playerCount),
    prize,
    drawnNumbers: called,
    callHistory,
    maxBalls: game.maxBalls ?? DRAW_BALL_COUNT,
    voiceType: game.voiceType,
    language: game.language,
    selectedNumbers: game.selectedNumbers,
    commissionRate,
    startedAt: Math.floor(Date.now() / 1000),
    callingPhase,
    bingoClaimActive: extras?.bingoClaimActive,
    bannedCartellas: extras?.bannedCartellas ?? game.bannedCartellas,
    winners: extras?.winners ?? game.winners,
    announcement: extras?.announcement,
  };
}

async function openCallerDisplayWindow(existingTab?: Window | null): Promise<boolean> {
  if (isElectron()) {
    await ipc('window:open-caller-display');
    return true;
  }
  const tab = existingTab ?? window.open('/agent/caller-display/', '_blank', 'noopener,noreferrer');
  return !!(tab && !tab.closed);
}

export default function GameBoardPage() {
  const { agent, refreshBalance } = useAuth();
  const [betAmount, setBetAmount] = useState('10');
  const [interval, setInterval_] = useState(3000);
  const [pattern, setPattern] = useState('FIRST_LINE');
  const [jackpotMaxCalls, setJackpotMaxCalls] = useState(String(DEFAULT_JACKPOT_MAX_CALLS));
  const [voice, setVoice] = useState('AMHARIC_MALE');
  const [language, setLanguage] = useState('am');
  const [selected, setSelected] = useState<number[]>([]);
  const [called, setCalled] = useState<number[]>([]);
  const [callHistory, setCallHistory] = useState<CallHistoryEntry[]>([]);
  const [lastDrawn, setLastDrawn] = useState<number | null>(null);
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [betError, setBetError] = useState('');
  const [showProfit, setShowProfit] = useState(false);
  const [profit, setProfit] = useState(0);
  const [creating, setCreating] = useState(false);
  const [autoDraw, setAutoDraw] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [callerLocked, setCallerLocked] = useState(false);
  const [checkModalOpen, setCheckModalOpen] = useState(false);
  const [bingoClaimActive, setBingoClaimActive] = useState(false);
  const [calledModalOpen, setCalledModalOpen] = useState(false);
  const [gameWinners, setGameWinners] = useState<GameWinner[]>([]);
  const [commissionPercent, setCommissionPercent] = useState('20');

  const adminCommissionRate = agent?.adminCommissionRate ?? 20;
  const walletBalance = agent?.walletBalance ?? 0;
  const [drawError, setDrawError] = useState('');
  const [callerTabBlocked, setCallerTabBlocked] = useState(false);
  const [showWebCallerPreview, setShowWebCallerPreview] = useState(false);
  const [availableCartellas, setAvailableCartellas] = useState<number[]>([]);
  const [callingPhase, setCallingPhase] = useState<CallingPhase>('ready');
  const [bannedCartellas, setBannedCartellas] = useState<string[]>([]);
  const [liveAnnouncement, setLiveAnnouncement] = useState<LiveGameAnnouncement | null>(null);
  const inBrowser = !isElectron();

  const syncManagerRef = useRef(new AudioSyncManager({
    cooldownMs: DEFAULT_CALL_COOLDOWN_MS,
    onEvent: (event) => {
      if (event === 'lock' || event === 'audio-start' || event === 'cooldown-start') {
        setCallerLocked(true);
      }
      if (event === 'unlock' || event === 'cooldown-end') {
        setCallerLocked(false);
      }
    },
  }));
  const autoDrawRef = useRef(false);
  const isPausedRef = useRef(false);
  const activeGameRef = useRef<ActiveGame | null>(null);
  const callingLoopIdRef = useRef(0);
  const intervalRef = useRef(interval);
  const voiceRef = useRef(voice);
  const languageRef = useRef(language);
  const callingPhaseRef = useRef<CallingPhase>('ready');
  const announcingRef = useRef(false);
  const bingoClaimActiveRef = useRef(false);

  const playerCount = activeGame?.playerCount ?? activeGame?.selectedNumbers?.length ?? selected.length;
  const totalPot = activeGame?.totalPot ?? calculateTotalPot(parseFloat(betAmount || '0') || 0, playerCount);
  const gameEconomics = useMemo(() => calculateGameEconomics(
    parseFloat(betAmount || '0') || 0,
    playerCount,
    parseFloat(commissionPercent || '0') || 0,
    adminCommissionRate,
  ), [betAmount, playerCount, commissionPercent, adminCommissionRate]);
  const maxBalls = activeGame?.maxBalls ?? DRAW_BALL_COUNT;
  const drawCount = called.length;

  const callerEngine = useMemo(() => {
    const engine = new CallingEngine(maxBalls);
    engine.loadFromHistory(called, callHistory.map((c) => c.drawnAt * 1000));
    return engine;
  }, [called, callHistory, maxBalls]);

  const remainingCount = callerEngine.remainingNumbers.length;
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const bannedSet = useMemo(() => new Set(bannedCartellas.map(String)), [bannedCartellas]);

  useEffect(() => { bingoClaimActiveRef.current = bingoClaimActive; }, [bingoClaimActive]);

  useEffect(() => { loadVoices(); preloadBallCallClips(); }, []);
  useEffect(() => {
    ipc<{ cardNumber: string }[]>('cards:list').then((rows) => {
      setAvailableCartellas((rows ?? []).map((c) => Number(c.cardNumber)).filter((n) => Number.isFinite(n)));
    });
  }, [activeGame]);
  useEffect(() => { void refreshBalance(); }, [refreshBalance]);
  useEffect(() => {
    if (agent?.commissionRate != null && !activeGame) {
      setCommissionPercent(String(agent.commissionRate));
    }
  }, [agent?.commissionRate, activeGame]);
  useEffect(() => { syncManagerRef.current.setCooldownMs(interval); intervalRef.current = interval; }, [interval]);
  useEffect(() => { voiceRef.current = voice; }, [voice]);
  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { autoDrawRef.current = autoDraw; }, [autoDraw]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { activeGameRef.current = activeGame; }, [activeGame]);

  useEffect(() => { callingPhaseRef.current = callingPhase; }, [callingPhase]);

  useEffect(() => {
    if (!activeGame) return;
    const rate = parseFloat(commissionPercent) || 20;
    broadcastLiveGame({
      type: 'game-update',
      payload: buildLiveSnapshot(activeGame, called, callHistory, rate, callingPhaseRef.current, {
        bingoClaimActive,
        bannedCartellas,
        winners: gameWinners,
        announcement: liveAnnouncement,
      }),
    });
  }, [activeGame, called, callHistory, commissionPercent, callingPhase, bingoClaimActive, bannedCartellas, gameWinners, liveAnnouncement]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    if (lang === 'en') {
      setVoice('ENGLISH');
    } else if (voice === 'ENGLISH') {
      setVoice('AMHARIC_MALE');
    }
  };

  const handleVoiceChange = (v: string) => {
    setVoice(v);
    if (v === 'ENGLISH') setLanguage('en');
    else setLanguage('am');
  };

  useEffect(() => {
    ipc<ActiveGame | null>('games:active').then((game) => {
      if (game) {
        setActiveGame(game);
        activeGameRef.current = game;
        setCalled(game.drawnNumbers ?? []);
        setCallHistory(game.callHistory ?? []);
        setLastDrawn(game.drawnNumbers?.length ? game.drawnNumbers[game.drawnNumbers.length - 1] : null);
        setSelected(game.selectedNumbers ?? []);
        setBetAmount(String(game.betAmount));
        const paused = game.status === 'PAUSED';
        setIsPaused(paused);
        isPausedRef.current = paused;
        if (game.voiceType) setVoice(game.voiceType);
        if (game.language) setLanguage(game.language);
        if (game.drawSpeedMs != null) setInterval_(game.drawSpeedMs);
        setGameWinners(game.winners ?? []);
        setBannedCartellas((game.bannedCartellas ?? []).map(String));
        const drawnCount = game.drawnNumbers?.length ?? 0;
        const max = game.maxBalls ?? DRAW_BALL_COUNT;
        autoDrawRef.current = false;
        setAutoDraw(false);
        setCallingPhase('ready');
        if (drawnCount >= max) {
          setDrawError('All numbers drawn');
          setCallingPhase('paused');
        }
      }
    });
  }, []);

  const toggleNumber = (num: number) => {
    if (activeGame) return;
    setSelected((prev) => {
      if (prev.includes(num)) {
        return prev.filter((n) => n !== num);
      }
      speakCartella(num, voice, language);
      return [...prev, num];
    });
  };

  const applyDrawResult = useCallback((data: {
    number: number;
    drawOrder: number;
    drawnAt: number;
  }) => {
    setCalled((prev) => [...prev, data.number]);
    setCallHistory((prev) => [...prev, {
      number: data.number,
      drawOrder: data.drawOrder,
      drawnAt: data.drawnAt,
    }]);
    setLastDrawn(data.number);
  }, []);

  const stopCalling = useCallback(async (pauseOnServer = true) => {
    autoDrawRef.current = false;
    setAutoDraw(false);
    callingLoopIdRef.current += 1;
    isPausedRef.current = true;
    setIsPaused(true);
    announcingRef.current = false;
    setCallingPhase('paused');
    syncManagerRef.current.abort();
    stopCurrentAudio();

    if (!pauseOnServer || !activeGameRef.current) return;

    await ipc('games:pause', activeGameRef.current.id);
    setActiveGame((g) => g ? { ...g, status: 'PAUSED' } : g);
  }, []);

  const startCalling = useCallback(async (resumeOnServer = false) => {
    if (!activeGameRef.current || bingoClaimActive || announcingRef.current) return;

    if (resumeOnServer) {
      await ipc('games:resume', activeGameRef.current.id);
      setActiveGame((g) => g ? { ...g, status: 'RUNNING' } : g);
    }

    isPausedRef.current = false;
    setIsPaused(false);
    autoDrawRef.current = true;
    setAutoDraw(true);
    setCallingPhase('calling');
  }, [bingoClaimActive]);

  const beginCalling = useCallback(async () => {
    if (!activeGameRef.current || autoDrawRef.current || bingoClaimActive || announcingRef.current) return;

    announcingRef.current = true;
    setCallingPhase('announcing');
    syncManagerRef.current.abort();
    stopCurrentAudio();

    try {
      await speakGameStarted(voiceRef.current, languageRef.current);
      const delayStart = Date.now();
      while (Date.now() - delayStart < GAME_START_DELAY_MS) {
        if (!activeGameRef.current || isPausedRef.current) {
          setCallingPhase('paused');
          return;
        }
        await new Promise((r) => setTimeout(r, 50));
      }
    } finally {
      announcingRef.current = false;
    }

    if (!activeGameRef.current || isPausedRef.current) {
      setCallingPhase('paused');
      return;
    }
    await startCalling(true);
  }, [bingoClaimActive, startCalling]);

  const drawFromServer = useCallback(async () => {
    const game = activeGameRef.current;
    if (!game || isPausedRef.current || !autoDrawRef.current || announcingRef.current) return null;

    const result = await ipc<{
      success: boolean;
      data?: {
        number: number;
        drawOrder: number;
        drawnAt: number;
        voiceType: string;
        language: string;
      };
      error?: string;
    }>('games:draw', game.id);

    if (!result.success || !result.data) {
      if (result.error) {
        setDrawError(result.error);
        if (result.error.includes('All numbers drawn')) {
          autoDrawRef.current = false;
          setAutoDraw(false);
        }
      }
      return null;
    }
    setDrawError('');
    return result.data;
  }, []);

  const handleCreateGame = async () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet < MIN_BET) {
      setBetError(`Bet must be at least ${MIN_BET} ETB.`);
      return;
    }
    if (selected.length === 0) {
      setBetError('Select at least one card number.');
      return;
    }
    const commission = parseFloat(commissionPercent);
    if (isNaN(commission) || commission < 0 || commission > 100) {
      setBetError('Commission must be between 0% and 100%.');
      return;
    }
    setBetError('');
    setDrawError('');
    setCallerTabBlocked(false);
    setCreating(true);

    // Open hall display immediately on user click (before async create) — web + Electron.
    const callerTab = inBrowser
      ? window.open('/agent/caller-display/', '_blank', 'noopener,noreferrer')
      : null;
    if (!inBrowser) {
      void ipc('window:open-caller-display');
    }
    if (inBrowser) setShowWebCallerPreview(true);

    const result = await ipc<{
      success: boolean;
      data?: ActiveGame & { maxBalls: number };
      error?: string;
    }>('games:create', {
      betAmount: bet,
      winningPattern: pattern,
      drawSpeedMs: interval,
      voiceType: voice,
      language,
      commissionRate: commission,
      jackpotMaximumCalls: parseInt(jackpotMaxCalls, 10) || DEFAULT_JACKPOT_MAX_CALLS,
      selectedNumbers: selected,
    });

    setCreating(false);
    if (result.success && result.data) {
      const game: ActiveGame = {
        ...result.data,
        selectedNumbers: selected,
        drawnNumbers: [],
        drawSpeedMs: interval,
        status: 'PAUSED',
        playerCount: selected.length,
        totalPot: calculateTotalPot(bet, selected.length),
      };
      setActiveGame(game);
      activeGameRef.current = game;
      setCalled([]);
      setCallHistory([]);
      setLastDrawn(null);
      setIsPaused(true);
      isPausedRef.current = true;
      autoDrawRef.current = false;
      setAutoDraw(false);
      setCallingPhase('ready');
      setBannedCartellas([]);
      setLiveAnnouncement(null);
      setBingoClaimActive(false);
      await refreshBalance();
      const rate = parseFloat(commissionPercent) || 20;
      const snapshot = buildLiveSnapshot(game, [], [], rate, 'ready', {
        bingoClaimActive: false,
        bannedCartellas: [],
        winners: [],
        announcement: null,
      });
      broadcastLiveGame({ type: 'game-started', payload: snapshot });
      broadcastLiveGame({ type: 'game-update', payload: snapshot });
      if (inBrowser) {
        if (!callerTab || callerTab.closed) setCallerTabBlocked(true);
      }
    } else {
      setBetError(result.error ?? 'Failed to create game');
      if (inBrowser && callerTab && !callerTab.closed) callerTab.close();
      if (!inBrowser) await ipc('window:close-caller-display').catch(() => {});
    }
  };

  const handleDraw = useCallback(async () => {
    if (!activeGame || isPaused || syncManagerRef.current.isLocked()) return;

    const data = await drawFromServer();
    if (!data) return;

    applyDrawResult(data);
    void syncManagerRef.current.callNumber(
      data.number,
      (n) => speakBallCall(n, data.voiceType ?? voice, data.language ?? language),
      interval,
    );
  }, [activeGame, isPaused, drawFromServer, applyDrawResult, voice, language, interval]);

  useEffect(() => {
    if (!autoDraw || !activeGame?.id || isPaused || bingoClaimActive) return;

    const loopId = ++callingLoopIdRef.current;
    let cancelled = false;
    const manager = syncManagerRef.current;

    void runAutoCallLoop(manager, {
      cooldownMs: intervalRef.current,
      voiceType: voiceRef.current,
      language: languageRef.current,
      isPaused: () => isPausedRef.current || bingoClaimActive,
      shouldContinue: () =>
        !cancelled
        && callingLoopIdRef.current === loopId
        && autoDrawRef.current
        && !!activeGameRef.current
        && !isPausedRef.current
        && !announcingRef.current,
      drawNumber: drawFromServer,
      onDraw: (data) => {
        applyDrawResult({
          number: data.number,
          drawOrder: data.drawOrder ?? 0,
          drawnAt: data.drawnAt ?? Math.floor(Date.now() / 1000),
        });
      },
      playAudio: (n, v, l) => speakBallCall(n, v, l),
    });

    return () => {
      cancelled = true;
      callingLoopIdRef.current += 1;
      manager.abort();
      stopCurrentAudio();
    };
  }, [autoDraw, activeGame?.id, isPaused, bingoClaimActive, drawFromServer, applyDrawResult]);

  const handleBingoClaim = async () => {
    if (!activeGame || bingoClaimActive) return;
    await stopCalling(true);
    setBingoClaimActive(true);
    setCheckModalOpen(false);
  };

  const handleCheckCards = () => {
    if (!activeGame || !bingoClaimActive) return;
    setCheckModalOpen(true);
  };

  const continueAfterClaim = useCallback(async () => {
    setCheckModalOpen(false);
    setBingoClaimActive(false);
    if (!activeGameRef.current) return;
    if (called.length > 0) {
      await startCalling(true);
    } else {
      await beginCalling();
    }
  }, [beginCalling, startCalling, called.length]);

  const handleValidateCard = async (cardNumber: string) => {
    if (!activeGame) return { valid: false, message: 'No active game' };
    const result = await ipc<{
      success: boolean;
      valid: boolean;
      message: string;
      cardNumber?: string;
      prizeAmount?: number;
      playerCount?: number;
      betAmount?: number;
      totalPot?: number;
      calledCountAtWin?: number;
      winningPattern?: string;
      grid?: number[][] | null;
      calledNumbers?: number[];
      banned?: boolean;
      eliminated?: boolean;
    }>('games:validate-winner', activeGame.id, cardNumber);

    const normalizedCard = result.cardNumber ?? cardNumber;

    if (result.valid && result.prizeAmount) {
      setBingoClaimActive(false);
      setActiveGame((g) => g ? { ...g, status: 'PAUSED' } : g);
      const winner: GameWinner = {
        cardNumber: normalizedCard,
        prizeAmount: result.prizeAmount,
        pattern: result.winningPattern,
        calledCountAtWin: result.calledCountAtWin,
      };
      setGameWinners((prev) => {
        if (prev.some((w) => w.cardNumber === winner.cardNumber)) return prev;
        return [...prev, winner];
      });
      const ann: LiveGameAnnouncement = {
        type: 'winner',
        cardNumber: normalizedCard,
        prizeAmount: result.prizeAmount,
        message: `Cartella #${normalizedCard} wins ${result.prizeAmount.toFixed(0)} ETB!`,
        at: Date.now(),
      };
      setLiveAnnouncement(ann);
      window.setTimeout(() => setLiveAnnouncement(null), 8000);
    } else if (result.banned || result.eliminated) {
      setBannedCartellas((prev) => (
        prev.includes(normalizedCard) ? prev : [...prev, normalizedCard]
      ));
      const ann: LiveGameAnnouncement = {
        type: 'eliminated',
        cardNumber: normalizedCard,
        message: result.message,
        at: Date.now(),
      };
      setLiveAnnouncement(ann);
      window.setTimeout(() => setLiveAnnouncement(null), 5000);
      window.setTimeout(() => { void continueAfterClaim(); }, 2500);
    }

    return {
      valid: result.valid,
      message: result.message,
      cardNumber: normalizedCard,
      prizeAmount: result.prizeAmount,
      playerCount: result.playerCount ?? playerCount,
      betAmount: result.betAmount ?? activeGame.betAmount,
      totalPot: result.totalPot ?? totalPot,
      calledCountAtWin: result.calledCountAtWin,
      winningPattern: result.winningPattern,
      grid: result.grid,
      calledNumbers: result.calledNumbers ?? called,
      banned: result.banned,
      eliminated: result.eliminated,
    };
  };

  const handleInvalidBingoClaim = (result?: { banned?: boolean; eliminated?: boolean }) => {
    if (result?.banned || result?.eliminated) return;
    setBingoClaimActive(false);
  };

  const handleResume = useCallback(async () => {
    if (!activeGameRef.current || bingoClaimActive) return;
    setCheckModalOpen(false);
    if ((activeGameRef.current.drawnNumbers?.length ?? called.length) === 0) {
      await beginCalling();
    } else {
      await startCalling(true);
    }
  }, [bingoClaimActive, beginCalling, startCalling, called.length]);

  const handleEndGame = useCallback(async () => {
    const game = activeGameRef.current;
    if (!game) return;
    await stopCalling(false);
    setCallingPhase('ended');
    const result = await ipc<{ success: boolean; data?: { agentRevenue: number } }>('games:end', game.id);
    if (result.success && result.data) {
      setProfit(result.data.agentRevenue);
      setActiveGame(null);
      activeGameRef.current = null;
      setCalled([]);
      setCallHistory([]);
      setLastDrawn(null);
      setGameWinners([]);
      setBannedCartellas([]);
      setBingoClaimActive(false);
      setLiveAnnouncement(null);
      setCheckModalOpen(false);
      setCalledModalOpen(false);
      broadcastLiveGame({ type: 'game-ended' });
      await ipc('window:close-caller-display').catch(() => {});
      await refreshBalance();
    }
  }, [stopCalling, refreshBalance]);

  useEffect(() => {
    return subscribeGameControl((msg) => {
      if (msg.type === 'start-calling') void beginCalling();
      if (msg.type === 'pause') void stopCalling(true);
      if (msg.type === 'resume') void handleResume();
      if (msg.type === 'end-game') void handleEndGame();
      if (msg.type === 'bingo-claim') void handleBingoClaim();
      if (msg.type === 'check-cards') handleCheckCards();
    });
  }, [beginCalling, stopCalling, handleResume, handleEndGame]);

  return (
    <div>
      {inBrowser && activeGame && callerTabBlocked && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Popup blocked — allow popups or open Caller Display from the sidebar.
        </div>
      )}

      {inBrowser && showWebCallerPreview && activeGame && (
        <div className="mb-4 overflow-hidden rounded-2xl border-2 border-slate-700 shadow-xl">
          <div className="bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200">
            Inline caller display (web test) — also open in a separate tab for full-screen
          </div>
          <div className="max-h-[70vh] overflow-hidden">
            <CallerDisplay />
          </div>
        </div>
      )}

      {activeGame && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-700 p-5 text-white shadow-lg">
          <div>
            <p className="text-sm opacity-80">
              {activeGame.gameCode} ·{' '}
              {isPaused
                ? (bingoClaimActive ? 'BINGO CLAIM — PAUSED' : 'PAUSED')
                : autoDraw
                  ? (callerLocked ? 'CALLING…' : drawCount >= maxBalls ? 'ALL BALLS CALLED' : 'LIVE')
                  : drawCount >= maxBalls ? 'FINISHED — press End Game' : 'READY — press Start'}
            </p>
            <p className="text-4xl font-black tracking-tight">{drawCount}/{maxBalls}</p>
            <p className="text-sm opacity-80">{remainingCount} balls remaining</p>
          </div>
          {lastDrawn !== null && (
            <div className="flex h-24 min-w-[7rem] flex-col items-center justify-center rounded-2xl bg-white/20 px-4 backdrop-blur">
              <span className="text-2xl font-black tracking-wide">{getBallLabel(lastDrawn).replace('-', ' ')}</span>
              <span className="mt-1 text-center text-xs font-medium leading-tight opacity-90">
                {formatBallCallLabel(lastDrawn, language)}
              </span>
            </div>
          )}
          <div className="text-right text-sm">
            <p>Players: <strong>{playerCount}</strong></p>
            <p>Prize pool: <strong>{totalPot.toFixed(0)} ETB</strong></p>
            <p className="text-xs opacity-75">{playerCount} × {activeGame.betAmount} ETB</p>
          </div>
        </div>
      )}

      {activeGame && (
        <CalledNumbersStrip
          called={called}
          lastDrawn={lastDrawn}
          maxBalls={maxBalls}
          language={language}
        />
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
        <input
          type="number"
          min={MIN_BET}
          step={1}
          value={betAmount}
          onChange={(e) => { setBetAmount(e.target.value); setBetError(''); }}
          disabled={!!activeGame}
          className="w-20 rounded-lg border px-3 py-2 text-sm font-semibold disabled:bg-gray-100"
          title="Bet amount"
        />
        <select
          value={interval}
          onChange={(e) => setInterval_(Number(e.target.value))}
          disabled={!!activeGame}
          className="rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
          title="Call delay"
        >
          {DRAW_INTERVALS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <select
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          disabled={!!activeGame}
          className="rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
          title="Game type"
        >
          {WINNING_PATTERNS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select
          value={voice}
          onChange={(e) => handleVoiceChange(e.target.value)}
          disabled={!!activeGame}
          className="rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
          title="Voice"
        >
          {VOICE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
        {betError && <p className="w-full text-xs text-red-500">{betError}</p>}
        {!activeGame ? (
          <button
            type="button"
            onClick={handleCreateGame}
            disabled={creating || selected.length === 0}
            className="ml-auto rounded-lg bg-[#22c55e] px-8 py-2.5 text-sm font-bold text-white shadow hover:bg-[#16a34a] disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create Game'}
          </button>
        ) : (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {isPaused && !bingoClaimActive && !autoDraw && (callingPhase === 'ready' || drawCount === 0) && (
              <button
                type="button"
                onClick={() => beginCalling()}
                disabled={callingPhase === 'announcing'}
                className="inline-flex items-center gap-2 rounded-lg bg-[#22c55e] px-5 py-2 text-sm font-bold text-white hover:bg-[#16a34a] disabled:opacity-50"
              >
                <Play className="h-5 w-5 fill-white" /> Play
              </button>
            )}
            <button onClick={() => setCalledModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              <ListOrdered className="h-4 w-4" /> All called ({drawCount})
            </button>
            <button
              type="button"
              onClick={async () => {
                const ok = await openCallerDisplayWindow();
                if (inBrowser && !ok) setCallerTabBlocked(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Monitor className="h-4 w-4" /> Caller Display
            </button>
            <button onClick={handleDraw} disabled={isPaused || callerLocked}
              className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">Draw once</button>
            {autoDraw && !isPaused ? (
              <button onClick={() => stopCalling(true)} disabled={callerLocked}
                className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50">
                <Pause className="h-4 w-4" /> Pause
              </button>
            ) : isPaused && !bingoClaimActive && drawCount > 0 && callingPhase !== 'ready' ? (
              <button onClick={handleResume}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                <Play className="h-4 w-4" /> Resume
              </button>
            ) : null}
            <button onClick={handleBingoClaim} disabled={bingoClaimActive || drawCount === 0}
              className="inline-flex items-center gap-1 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-600 disabled:opacity-50">
              <Megaphone className="h-4 w-4" /> BINGO!
            </button>
            {bingoClaimActive && (
              <button type="button" onClick={handleCheckCards}
                className="inline-flex items-center gap-1 rounded-lg bg-[#f59e0b] px-5 py-2 text-sm font-bold text-[#111827] hover:bg-[#d97706]">
                <Search className="h-4 w-4" /> Check Cards
              </button>
            )}
            <button onClick={handleEndGame}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white">End Game</button>
          </div>
        )}
      </div>

      {activeGame && gameWinners.length > 0 && (
        <div className="mb-4 rounded-xl border-2 border-green-400 bg-green-50 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-green-900">
            <Megaphone className="h-5 w-5" /> Winners this game
          </h3>
          <ul className="space-y-2">
            {gameWinners.map((w) => (
              <li key={w.cardNumber} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-4 py-2 shadow-sm">
                <span className="text-xl font-black text-green-700">Cartella #{w.cardNumber}</span>
                <span className="font-semibold text-green-900">Wins {w.prizeAmount.toFixed(0)} ETB</span>
                {w.calledCountAtWin != null && (
                  <span className="text-xs text-gray-500">after {w.calledCountAtWin} calls</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="font-medium text-gray-700">Profit:</span>
        <span className="font-semibold">{showProfit ? `${profit.toFixed(2)} ETB` : '******'}</span>
        <button type="button" onClick={() => setShowProfit(!showProfit)} className="text-blue-500">
          {showProfit ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {!activeGame && walletBalance <= 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Wallet balance: 0 ETB</p>
          <p className="mt-1">You can still run a game — player stakes are added when the game starts. Use a <strong>TBG</strong> code on Recharge if you need extra float.</p>
        </div>
      )}

      {drawError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {drawError}
          {drawError.includes('All numbers drawn') && (
            <p className="mt-1 text-xs">All 75 balls were called. Press <strong>BINGO!</strong> to check a winner, or <strong>End Game</strong>.</p>
          )}
        </div>
      )}

      {activeGame && bannedCartellas.length > 0 && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="flex items-center gap-2 font-semibold">
            <Ban className="h-4 w-4" /> Eliminated cartellas (false BINGO)
          </p>
          <p className="mt-1 text-xs">
            Locked for this game: {bannedCartellas.map((n) => `#${n}`).join(', ')}
          </p>
        </div>
      )}

      <NumberGrid
        availableNumbers={activeGame ? (activeGame.selectedNumbers ?? []) : availableCartellas}
        selectedSet={activeGame ? new Set(activeGame.selectedNumbers ?? []) : selectedSet}
        lockedSet={activeGame ? bannedSet : undefined}
        onToggle={toggleNumber}
        onClear={() => setSelected([])}
        disabled={!!activeGame}
      />

      <CalledNumbersModal
        open={calledModalOpen && !!activeGame}
        onClose={() => setCalledModalOpen(false)}
        called={called}
        lastDrawn={lastDrawn}
        maxBalls={maxBalls}
        language={language}
        callHistory={callHistory}
        remainingNumbers={callerEngine.remainingNumbers}
      />

      <CheckCardModal
        open={checkModalOpen}
        onClose={() => {
          setCheckModalOpen(false);
          if (!gameWinners.length) setBingoClaimActive(false);
        }}
        calledNumbers={called}
        gamePattern={activeGame?.winningPattern ?? pattern}
        onValidate={handleValidateCard}
        onInvalidClaim={(result) => handleInvalidBingoClaim(result)}
      />
    </div>
  );
}
