'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
import { CallerDisplay, HallModeOverlay } from '@/presentation/components/caller/caller-display';

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
  const [hallMode, setHallMode] = useState(false);
  const [availableCartellas, setAvailableCartellas] = useState<number[]>([]);
  const [callingPhase, setCallingPhase] = useState<CallingPhase>('ready');
  const [bannedCartellas, setBannedCartellas] = useState<string[]>([]);
  const [liveAnnouncement, setLiveAnnouncement] = useState<LiveGameAnnouncement | null>(null);

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
  const calledRef = useRef<number[]>([]);

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

  const hallSnapshot = useMemo(() => {
    if (!activeGame) return null;
    const rate = parseFloat(commissionPercent) || 20;
    return buildLiveSnapshot(activeGame, called, callHistory, rate, callingPhase, {
      bingoClaimActive,
      bannedCartellas,
      winners: gameWinners,
      announcement: liveAnnouncement,
    });
  }, [activeGame, called, callHistory, commissionPercent, callingPhase, bingoClaimActive, bannedCartellas, gameWinners, liveAnnouncement]);

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
  useEffect(() => { calledRef.current = called; }, [called]);

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
        setHallMode(true);
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
    setCalled((prev) => {
      const next = [...prev, data.number];
      calledRef.current = next;
      return next;
    });
    setCallHistory((prev) => [...prev, {
      number: data.number,
      drawOrder: data.drawOrder,
      drawnAt: data.drawnAt,
    }]);
    setLastDrawn(data.number);
    setActiveGame((g) => {
      if (!g) return g;
      const drawn = [...(g.drawnNumbers ?? []), data.number];
      const next = { ...g, drawnNumbers: drawn, status: 'RUNNING' };
      activeGameRef.current = next;
      return next;
    });
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
        // Game starts PAUSED on server — only abort if user pressed Pause (stopCalling clears announcingRef).
        if (!activeGameRef.current || !announcingRef.current) {
          setCallingPhase('paused');
          return;
        }
        await new Promise((r) => setTimeout(r, 50));
      }
    } finally {
      announcingRef.current = false;
    }

    if (!activeGameRef.current) {
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

  const getEffectiveDrawCount = useCallback(
    () => Math.max(activeGameRef.current?.drawnNumbers?.length ?? 0, calledRef.current.length),
    [],
  );

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
    setCreating(true);

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
        winningPattern: pattern,
      };
      setActiveGame(game);
      activeGameRef.current = game;
      setCalled([]);
      calledRef.current = [];
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
      setHallMode(true);
    } else {
      setBetError(result.error ?? 'Failed to create game');
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

  const handleCheckCards = useCallback(async () => {
    if (!activeGame) return;
    if (autoDrawRef.current && !isPausedRef.current) {
      await stopCalling(true);
    }
    setCheckModalOpen(true);
  }, [activeGame, stopCalling]);

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
      setBingoClaimActive(false);
      setCheckModalOpen(false);
      const ann: LiveGameAnnouncement = {
        type: 'eliminated',
        cardNumber: normalizedCard,
        message: result.message,
        at: Date.now(),
      };
      setLiveAnnouncement(ann);
      window.setTimeout(() => setLiveAnnouncement(null), 5000);
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
    if (getEffectiveDrawCount() === 0) {
      await beginCalling();
    } else {
      await startCalling(true);
    }
  }, [bingoClaimActive, beginCalling, startCalling, getEffectiveDrawCount]);

  const handleEndGame = useCallback(async () => {
    const game = activeGameRef.current;
    if (!game) return;
    if (!confirm('End this game and return to Game Board?')) return;
    await stopCalling(false);
    setCallingPhase('ended');
    const result = await ipc<{ success: boolean; data?: { agentRevenue: number } }>('games:end', game.id);
    if (result.success && result.data) {
      setProfit(result.data.agentRevenue);
      setActiveGame(null);
      activeGameRef.current = null;
      setCalled([]);
      calledRef.current = [];
      setCallHistory([]);
      setLastDrawn(null);
      setGameWinners([]);
      setBannedCartellas([]);
      setBingoClaimActive(false);
      setLiveAnnouncement(null);
      setCheckModalOpen(false);
      setCalledModalOpen(false);
      setHallMode(false);
      broadcastLiveGame({ type: 'game-ended' });
      await ipc('window:close-caller-display').catch(() => {});
      await refreshBalance();
    }
  }, [stopCalling, refreshBalance]);

  const handleHallPlay = useCallback(() => {
    if (autoDrawRef.current && !isPausedRef.current) {
      void stopCalling(true);
      if (getEffectiveDrawCount() > 0) {
        setBingoClaimActive(true);
      }
      return;
    }
    if (getEffectiveDrawCount() === 0) {
      void beginCalling();
      return;
    }
    void handleResume();
  }, [stopCalling, beginCalling, handleResume, getEffectiveDrawCount]);

  useEffect(() => {
    return subscribeGameControl((msg) => {
      if (msg.type === 'start-calling') void beginCalling();
      if (msg.type === 'pause') {
        void stopCalling(true).then(() => {
          if (getEffectiveDrawCount() > 0) setBingoClaimActive(true);
        });
      }
      if (msg.type === 'resume') void handleResume();
      if (msg.type === 'end-game') void handleEndGame();
      if (msg.type === 'bingo-claim') void handleBingoClaim();
      if (msg.type === 'check-cards') handleCheckCards();
    });
  }, [beginCalling, stopCalling, handleResume, handleEndGame, handleCheckCards, getEffectiveDrawCount]);

  return (
    <>
      {hallMode && hallSnapshot && (
        <HallModeOverlay>
          <CallerDisplay
            embedded={{
              game: hallSnapshot,
              controls: {
                onPlay: handleHallPlay,
                onEndGame: () => { void handleEndGame(); },
                onCheckCards: handleCheckCards,
              },
            }}
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
        </HallModeOverlay>
      )}

      {!hallMode && (
        <div>
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
            <input
              type="number"
              min={MIN_BET}
              step={1}
              value={betAmount}
              onChange={(e) => { setBetAmount(e.target.value); setBetError(''); }}
              className="w-20 rounded-lg border px-3 py-2 text-sm font-semibold"
              title="Bet amount"
            />
            <select
              value={interval}
              onChange={(e) => setInterval_(Number(e.target.value))}
              className="rounded-lg border px-3 py-2 text-sm"
              title="Call delay"
            >
              {DRAW_INTERVALS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <select
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              title="Game type"
            >
              {WINNING_PATTERNS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select
              value={voice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              title="Voice"
            >
              {VOICE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
            {betError && <p className="w-full text-xs text-red-500">{betError}</p>}
            <button
              type="button"
              onClick={handleCreateGame}
              disabled={creating || selected.length === 0}
              className="ml-auto rounded-lg bg-[#22c55e] px-8 py-2.5 text-sm font-bold text-white shadow hover:bg-[#16a34a] disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create Game'}
            </button>
          </div>

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
              <p className="mt-1">You can still run a game — player stakes are added when the game starts.</p>
            </div>
          )}

          <NumberGrid
            availableNumbers={availableCartellas}
            selectedSet={selectedSet}
            onToggle={toggleNumber}
            onClear={() => setSelected([])}
            disabled={false}
          />
        </div>
      )}
    </>
  );
}
