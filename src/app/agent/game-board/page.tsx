'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Eye, EyeOff, Volume2, VolumeX } from 'lucide-react';
import { ipc } from '@/presentation/lib/ipc';
import { useAuth } from '@/presentation/providers/auth-provider';
import { useUiLanguage } from '@/presentation/providers/ui-language-provider';
import { NumberGrid } from '@/presentation/components/bingo/number-grid';
import { CheckCardModal } from '@/presentation/components/bingo/check-card-modal';
import { WINNING_PATTERNS, DRAW_INTERVALS, VOICE_TYPES, MIN_BET, DEFAULT_JACKPOT_MAX_CALLS, DEFAULT_CALL_COOLDOWN_MS, GAME_COMMISSION_OPTIONS, MIN_PLAYERS_TO_START } from '@/shared/constants';
import { isAmharicBundledVoice } from '@/shared/tts/amharic-voice';
import { DRAW_BALL_COUNT, INITIAL_CARTELLA_COUNT } from '@/shared/brand';
import { speakBallCall, speakCartella, speakGameStarted, speakShuffle, loadVoices } from '@/presentation/lib/tts';
import { stopCurrentAudio, preloadBallCallClips, preloadGameEventClips, playGameContinuedClip, playGamePausedClip, playGameStoppedClip, playWinnerClip, playNotWinnerClip, playCartellaLockedClip } from '@/presentation/lib/amharic-audio';
import { AudioSyncManager, runAutoCallLoop } from '@/presentation/lib/audio-sync-manager';
import { calculateTotalPot, calculateGameEconomics, calculateWinnerPrize, calculateWalletReserveRequired, calculateMaxAffordablePlayers, canAffordGamePlayers } from '@/shared/prize';
import { broadcastLiveGame, subscribeGameControl, toHallSnapshot, type LiveGameSnapshot, type CallingPhase, type LiveGameAnnouncement } from '@/presentation/lib/live-game-sync';
import { CallerDisplay, HallModeOverlay } from '@/presentation/components/caller/caller-display';
import { cn } from '@/presentation/lib/utils';

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
  commissionRate?: number;
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
  const { t } = useUiLanguage();
  const [betAmount, setBetAmount] = useState('10');
  const [interval, setInterval_] = useState(DEFAULT_CALL_COOLDOWN_MS);
  const [pattern, setPattern] = useState('FIRST_LINE');
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
  const [_callerLocked, setCallerLocked] = useState(false);
  const [checkModalOpen, setCheckModalOpen] = useState(false);
  const [bingoClaimActive, setBingoClaimActive] = useState(false);
  const [gameWinners, setGameWinners] = useState<GameWinner[]>([]);
  const [commissionPercent, setCommissionPercent] = useState('20');
  const [commissionPickerOpen, setCommissionPickerOpen] = useState(false);
  const commissionPickerRef = useRef<HTMLDivElement>(null);
  const commissionInitializedRef = useRef(false);
  const [cartellaVoiceMuted, setCartellaVoiceMuted] = useState(false);

  const CARTELLA_VOICE_KEY = 'waliya-cartella-voice-muted';

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
  const gameWinnersRef = useRef<GameWinner[]>([]);
  const gameEndedRef = useRef(false);

  const playerCount = activeGame?.playerCount ?? activeGame?.selectedNumbers?.length ?? selected.length;
  const totalPot = activeGame?.totalPot ?? calculateTotalPot(parseFloat(betAmount || '0') || 0, playerCount);
  const effectiveCommissionRate = activeGame?.commissionRate ?? (parseFloat(commissionPercent || '0') || (agent?.commissionRate ?? 20));
  const gameEconomics = useMemo(() => calculateGameEconomics(
    parseFloat(betAmount || '0') || 0,
    selected.length || playerCount,
    effectiveCommissionRate,
    adminCommissionRate,
  ), [betAmount, selected.length, playerCount, effectiveCommissionRate, adminCommissionRate]);
  const walletReserve = useMemo(() => calculateWalletReserveRequired(
    parseFloat(betAmount || '0') || 0,
    selected.length,
    effectiveCommissionRate,
    adminCommissionRate,
  ), [betAmount, selected.length, effectiveCommissionRate, adminCommissionRate]);
  const maxAffordablePlayers = useMemo(() => calculateMaxAffordablePlayers(
    walletBalance,
    parseFloat(betAmount || '0') || 0,
    effectiveCommissionRate,
    INITIAL_CARTELLA_COUNT,
  ), [walletBalance, betAmount, effectiveCommissionRate]);
  const displayProfit = profit > 0 ? profit : gameEconomics.agentGrossCommission;

  const hasWinner = gameWinners.length > 0;
  const canPickCartellas = !activeGame && walletBalance > 0;
  const canCreateGame = canPickCartellas
    && selected.length >= MIN_PLAYERS_TO_START
    && selected.length <= maxAffordablePlayers
    && !creating
    && canAffordGamePlayers(
      walletBalance,
      parseFloat(betAmount || '0') || 0,
      selected.length,
      effectiveCommissionRate,
    );

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const bannedSet = useMemo(() => new Set(bannedCartellas.map(String)), [bannedCartellas]);

  const hallSnapshot = useMemo(() => {
    if (!activeGame) return null;
    const rate = activeGame.commissionRate ?? (parseFloat(commissionPercent) || 20);
    return toHallSnapshot(buildLiveSnapshot(activeGame, called, callHistory, rate, callingPhase, {
      bingoClaimActive,
      bannedCartellas,
      winners: gameWinners,
      announcement: liveAnnouncement,
    }));
  }, [activeGame, called, callHistory, commissionPercent, callingPhase, bingoClaimActive, bannedCartellas, gameWinners, liveAnnouncement]);

  useEffect(() => { bingoClaimActiveRef.current = bingoClaimActive; }, [bingoClaimActive]);
  useEffect(() => { gameWinnersRef.current = gameWinners; }, [gameWinners]);

  useEffect(() => { loadVoices(); preloadBallCallClips(voice); preloadGameEventClips(voice); }, [voice]);
  useEffect(() => {
    if (commissionInitializedRef.current || activeGame) return;
    if (agent?.commissionRate != null) {
      setCommissionPercent(String(agent.commissionRate));
      commissionInitializedRef.current = true;
    }
  }, [agent?.commissionRate, activeGame]);
  useEffect(() => {
    if (activeGame) {
      setShowProfit(false);
      setCommissionPickerOpen(false);
    }
  }, [activeGame?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reset profit UI only when switching games

  useEffect(() => {
    if (!commissionPickerOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (commissionPickerRef.current?.contains(event.target as Node)) return;
      setCommissionPickerOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [commissionPickerOpen]);
  useEffect(() => {
    setCartellaVoiceMuted(localStorage.getItem(CARTELLA_VOICE_KEY) === '1');
  }, []);
  // UI language (header) is separate from game voice — controlled by the Voice dropdown only.
  useEffect(() => {
    ipc<{ cardNumber: string }[]>('cards:list').then((rows) => {
      setAvailableCartellas((rows ?? []).map((c) => Number(c.cardNumber)).filter((n) => Number.isFinite(n)));
    });
  }, [activeGame]);
  useEffect(() => { void refreshBalance(); }, [refreshBalance]);
  useEffect(() => {
    const timer = window.setInterval(() => { void refreshBalance(); }, 15000);
    return () => window.clearInterval(timer);
  }, [refreshBalance]);
  useEffect(() => { syncManagerRef.current.setCooldownMs(interval); intervalRef.current = interval; }, [interval]);
  useEffect(() => { voiceRef.current = voice; }, [voice]);
  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { autoDrawRef.current = autoDraw; }, [autoDraw]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { activeGameRef.current = activeGame; }, [activeGame]);
  useEffect(() => { calledRef.current = called; }, [called]);

  useEffect(() => { callingPhaseRef.current = callingPhase; }, [callingPhase]);
  useEffect(() => { gameEndedRef.current = callingPhase === 'ended'; }, [callingPhase]);

  useEffect(() => {
    if (!activeGame) return;
    const rate = activeGame.commissionRate ?? (parseFloat(commissionPercent) || 20);
    broadcastLiveGame({
      type: 'game-update',
      payload: toHallSnapshot(buildLiveSnapshot(activeGame, called, callHistory, rate, callingPhaseRef.current, {
        bingoClaimActive,
        bannedCartellas,
        winners: gameWinners,
        announcement: liveAnnouncement,
      })),
    });
  }, [activeGame, called, callHistory, commissionPercent, callingPhase, bingoClaimActive, bannedCartellas, gameWinners, liveAnnouncement]);

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
        if (game.voiceType) {
          const known = VOICE_TYPES.some((v) => v.value === game.voiceType);
          setVoice(known ? game.voiceType : 'AMHARIC_MALE');
        }
        if (game.language) setLanguage(game.language === 'en' ? 'en' : 'am');
        if (game.drawSpeedMs != null) setInterval_(game.drawSpeedMs);
        if (game.commissionRate != null) setCommissionPercent(String(game.commissionRate));
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
    if (activeGame || walletBalance <= 0) return;
    setSelected((prev) => {
      if (prev.includes(num)) {
        return prev.filter((n) => n !== num);
      }
      const bet = parseFloat(betAmount || '0') || 0;
      const nextCount = prev.length + 1;
      if (nextCount > maxAffordablePlayers) {
        setBetError(`TBG wallet can only cover ${maxAffordablePlayers} cartellas at ${effectiveCommissionRate}% commission.`);
        return prev;
      }
      if (!canAffordGamePlayers(walletBalance, bet, nextCount, effectiveCommissionRate)) {
        setBetError(`Insufficient TBG balance for ${nextCount} cartellas. Need ${calculateWalletReserveRequired(bet, nextCount, effectiveCommissionRate, adminCommissionRate).reserveRequired.toFixed(0)} ETB commission in wallet.`);
        return prev;
      }
      setBetError('');
      if (!cartellaVoiceMuted) {
        speakCartella(num, voice, language);
      }
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

  const stopCalling = useCallback((
    pauseOnServer = true,
    options?: { playPausedClip?: boolean },
  ) => {
    autoDrawRef.current = false;
    setAutoDraw(false);
    callingLoopIdRef.current += 1;
    isPausedRef.current = true;
    setIsPaused(true);
    announcingRef.current = false;
    setCallingPhase('paused');
    syncManagerRef.current.abort();
    stopCurrentAudio();

    if (options?.playPausedClip && isAmharicBundledVoice(voiceRef.current, languageRef.current)) {
      void playGamePausedClip(voiceRef.current, languageRef.current);
    }

    if (!pauseOnServer || !activeGameRef.current) return;

    const gameId = activeGameRef.current.id;
    void ipc('games:pause', gameId).then(() => {
      setActiveGame((g) => g ? { ...g, status: 'PAUSED' } : g);
    });
  }, []);

  const startCalling = useCallback((resumeOnServer = false) => {
    if (!activeGameRef.current || bingoClaimActiveRef.current || gameWinnersRef.current.length > 0 || gameEndedRef.current) return;

    if (resumeOnServer && activeGameRef.current) {
      void ipc('games:resume', activeGameRef.current.id).then(() => {
        setActiveGame((g) => g ? { ...g, status: 'RUNNING' } : g);
      });
    }

    isPausedRef.current = false;
    setIsPaused(false);
    autoDrawRef.current = true;
    setAutoDraw(true);
    setCallingPhase('calling');
  }, []);

  const beginCalling = useCallback(() => {
    if (!activeGameRef.current || autoDrawRef.current || bingoClaimActiveRef.current || gameWinnersRef.current.length > 0 || gameEndedRef.current) return;

    syncManagerRef.current.abort();
    stopCurrentAudio();

    void speakGameStarted(voiceRef.current, languageRef.current);
    void startCalling(true);
  }, [startCalling]);

  const drawFromServer = useCallback(async () => {
    const game = activeGameRef.current;
    if (!game || isPausedRef.current || !autoDrawRef.current || bingoClaimActiveRef.current || gameWinnersRef.current.length > 0 || gameEndedRef.current) return null;

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
    if (walletBalance <= 0) {
      setBetError('Insufficient wallet balance. Ask your admin for a TBG top-up.');
      return;
    }
    if (selected.length < MIN_PLAYERS_TO_START) {
      setBetError(`Select at least ${MIN_PLAYERS_TO_START} cartellas to start a game.`);
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
    if (!canAffordGamePlayers(walletBalance, bet, selected.length, commission)) {
      setBetError(`Insufficient TBG balance. Need at least ${walletReserve.reserveRequired.toFixed(0)} ETB commission for ${selected.length} cartellas.`);
      return;
    }
    if (selected.length > maxAffordablePlayers) {
      setBetError(`Your TBG wallet can only cover ${maxAffordablePlayers} cartellas at this bet and commission rate.`);
      return;
    }
    setBetError('');
    setDrawError('');
    setCreating(true);
    await refreshBalance();

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
      jackpotMaximumCalls: DEFAULT_JACKPOT_MAX_CALLS,
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
        commissionRate: commission,
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
      gameEndedRef.current = false;
      setBannedCartellas([]);
      setLiveAnnouncement(null);
      setBingoClaimActive(false);
      await refreshBalance();
      const rate = parseFloat(commissionPercent) || 20;
      const snapshot = toHallSnapshot(buildLiveSnapshot(game, [], [], rate, 'ready', {
        bingoClaimActive: false,
        bannedCartellas: [],
        winners: [],
        announcement: null,
      }));
      broadcastLiveGame({ type: 'game-started', payload: snapshot });
      broadcastLiveGame({ type: 'game-update', payload: snapshot });
      setHallMode(true);
    } else {
      setBetError(result.error ?? 'Failed to create game');
    }
  };

  const drawFromServerRef = useRef(drawFromServer);
  const applyDrawResultRef = useRef(applyDrawResult);
  useEffect(() => { drawFromServerRef.current = drawFromServer; }, [drawFromServer]);
  useEffect(() => { applyDrawResultRef.current = applyDrawResult; }, [applyDrawResult]);

  useEffect(() => {
    if (!autoDraw || !activeGame?.id || isPaused || bingoClaimActive || hasWinner) return;

    const loopId = ++callingLoopIdRef.current;
    let cancelled = false;
    const manager = syncManagerRef.current;

    void runAutoCallLoop(manager, {
      cooldownMs: intervalRef.current,
      voiceType: voiceRef.current,
      language: languageRef.current,
      isPaused: () => isPausedRef.current || bingoClaimActiveRef.current || gameWinnersRef.current.length > 0,
      shouldContinue: () =>
        !cancelled
        && callingLoopIdRef.current === loopId
        && autoDrawRef.current
        && !!activeGameRef.current
        && !isPausedRef.current
        && !gameEndedRef.current
        && callingPhaseRef.current !== 'ended'
        && gameWinnersRef.current.length === 0,
      drawNumber: () => drawFromServerRef.current(),
      onDraw: (data) => {
        applyDrawResultRef.current({
          number: data.number,
          drawOrder: data.drawOrder ?? 0,
          drawnAt: data.drawnAt ?? Math.floor(Date.now() / 1000),
        });
      },
      playAudio: (n) => speakBallCall(n, voiceRef.current, languageRef.current),
    });

    return () => {
      cancelled = true;
      callingLoopIdRef.current += 1;
      manager.abort();
      stopCurrentAudio();
    };
  }, [autoDraw, activeGame?.id, isPaused, bingoClaimActive, hasWinner]);

  const handleBingoClaim = useCallback(async () => {
    if (!activeGame || bingoClaimActive) return;
    await stopCalling(true);
    setBingoClaimActive(true);
    bingoClaimActiveRef.current = true;
    setCheckModalOpen(false);
  }, [activeGame, bingoClaimActive, stopCalling]);

  const handleCheckCards = useCallback(async () => {
    if (!activeGame) return;
    if (autoDrawRef.current && !isPausedRef.current) {
      await stopCalling(true);
    }
    setCheckModalOpen(true);
  }, [activeGame, stopCalling]);

  const handleValidateCard = async (cardNumber: string) => {
    if (!activeGame) return { valid: false, message: 'No active game' };
    if (gameWinners.length > 0) {
      return { valid: false, message: 'Winner already declared. End the game to finish.' };
    }
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
      autoDrawRef.current = false;
      setAutoDraw(false);
      isPausedRef.current = true;
      setIsPaused(true);
      announcingRef.current = false;
      callingLoopIdRef.current += 1;
      syncManagerRef.current.abort();
      stopCurrentAudio();
      setCallingPhase('paused');
      setBingoClaimActive(false);
      bingoClaimActiveRef.current = false;
      setCheckModalOpen(false);
      setActiveGame((g) => g ? { ...g, status: 'PAUSED' } : g);
      const winner: GameWinner = {
        cardNumber: normalizedCard,
        prizeAmount: result.prizeAmount,
        pattern: result.winningPattern,
        calledCountAtWin: result.calledCountAtWin,
      };
      setGameWinners((prev) => {
        if (prev.some((w) => w.cardNumber === winner.cardNumber)) return prev;
        const next = [...prev, winner];
        gameWinnersRef.current = next;
        return next;
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
      if (isAmharicBundledVoice(voiceRef.current, languageRef.current)) {
        await playWinnerClip(voiceRef.current, languageRef.current);
      }
      await refreshBalance();
    } else if (result.banned || result.eliminated) {
      setBannedCartellas((prev) => (
        prev.includes(normalizedCard) ? prev : [...prev, normalizedCard]
      ));
      setBingoClaimActive(false);
      bingoClaimActiveRef.current = false;
      setCheckModalOpen(false);
      const ann: LiveGameAnnouncement = {
        type: 'eliminated',
        cardNumber: normalizedCard,
        message: result.message,
        at: Date.now(),
      };
      setLiveAnnouncement(ann);
      window.setTimeout(() => setLiveAnnouncement(null), 5000);
      if (isAmharicBundledVoice(voiceRef.current, languageRef.current)) {
        if (result.banned) await playCartellaLockedClip(voiceRef.current, languageRef.current);
        else await playNotWinnerClip(voiceRef.current, languageRef.current);
      }
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
    bingoClaimActiveRef.current = false;
  };

  const handleResume = useCallback(() => {
    if (!activeGameRef.current || bingoClaimActiveRef.current || gameWinnersRef.current.length > 0) return;
    setCheckModalOpen(false);
    if (getEffectiveDrawCount() === 0) {
      beginCalling();
      return;
    }
    if (isAmharicBundledVoice(voiceRef.current, languageRef.current)) {
      void playGameContinuedClip(voiceRef.current, languageRef.current);
    }
    void startCalling(true);
  }, [beginCalling, startCalling, getEffectiveDrawCount]);

  const handleEndGame = useCallback(async () => {
    const game = activeGameRef.current;
    if (!game) return;
    if (!confirm('End this game and return to Game Board?')) return;

    autoDrawRef.current = false;
    setAutoDraw(false);
    callingLoopIdRef.current += 1;
    announcingRef.current = false;
    isPausedRef.current = true;
    setIsPaused(true);
    syncManagerRef.current.abort();
    stopCurrentAudio();
    if (isAmharicBundledVoice(voiceRef.current, languageRef.current)) {
      void playGameStoppedClip(voiceRef.current, languageRef.current);
    }

    const result = await ipc<{ success: boolean; data?: { agentRevenue: number }; error?: string }>('games:end', game.id);
    if (result.success && result.data) {
      gameEndedRef.current = true;
      setCallingPhase('ended');
      callingPhaseRef.current = 'ended';
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
      setHallMode(false);
      broadcastLiveGame({ type: 'game-ended' });
      await ipc('window:close-caller-display').catch(() => {});
      await refreshBalance();
    } else {
      gameEndedRef.current = false;
      setCallingPhase('paused');
      callingPhaseRef.current = 'paused';
      setBetError(result.error ?? 'Could not end game. Check TBG wallet balance and try again.');
    }
  }, [refreshBalance]);

  const handleHallPlay = useCallback(() => {
    if (gameWinnersRef.current.length > 0) return;

    if (autoDrawRef.current && !isPausedRef.current) {
      void stopCalling(true, { playPausedClip: true });
      if (getEffectiveDrawCount() > 0) {
        setBingoClaimActive(true);
        bingoClaimActiveRef.current = true;
      }
      return;
    }
    setBingoClaimActive(false);
    bingoClaimActiveRef.current = false;
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
        void stopCalling(true, { playPausedClip: true });
        if (getEffectiveDrawCount() > 0 && gameWinnersRef.current.length === 0) {
          setBingoClaimActive(true);
          bingoClaimActiveRef.current = true;
        }
      }
      if (msg.type === 'resume') void handleResume();
      if (msg.type === 'end-game') void handleEndGame();
      if (msg.type === 'bingo-claim') void handleBingoClaim();
      if (msg.type === 'check-cards') handleCheckCards();
    });
  }, [beginCalling, stopCalling, handleResume, handleEndGame, handleCheckCards, handleBingoClaim, getEffectiveDrawCount]);

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
            onClose={() => setCheckModalOpen(false)}
            calledNumbers={called}
            lastDrawn={lastDrawn}
            gamePattern={activeGame?.winningPattern ?? pattern}
            onValidate={handleValidateCard}
            onInvalidClaim={(result) => handleInvalidBingoClaim(result)}
          />
        </HallModeOverlay>
      )}

      {!hallMode && (
        <div>
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Bet (ETB)</span>
              <input
                type="number"
                min={MIN_BET}
                step={1}
                value={betAmount}
                onChange={(e) => { setBetAmount(e.target.value); setBetError(''); }}
                disabled={!!activeGame}
                className="h-14 w-[4.5rem] rounded-lg border-2 border-gray-300 bg-white text-center text-2xl font-black text-gray-900 shadow-inner focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-gray-100"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Speed</span>
              <select
                value={interval}
                onChange={(e) => setInterval_(Number(e.target.value))}
                disabled={!!activeGame}
                className="h-14 min-w-[7.5rem] rounded-lg border-2 border-gray-300 bg-white px-2 text-center text-lg font-bold text-gray-900 focus:border-amber-500 focus:outline-none disabled:bg-gray-100"
              >
                {DRAW_INTERVALS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Type</span>
              <select
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                disabled={!!activeGame}
                className="h-14 min-w-[8rem] rounded-lg border-2 border-gray-300 bg-white px-2 text-center text-lg font-bold text-gray-900 focus:border-amber-500 focus:outline-none disabled:bg-gray-100"
              >
                {WINNING_PATTERNS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Voice</span>
              <select
                value={voice}
                onChange={(e) => handleVoiceChange(e.target.value)}
                disabled={!!activeGame}
                className="h-14 min-w-[9rem] rounded-lg border-2 border-gray-300 bg-white px-2 text-center text-lg font-bold text-gray-900 focus:border-amber-500 focus:outline-none disabled:bg-gray-100"
              >
                {VOICE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>

            <div ref={commissionPickerRef} className="relative flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('commission')}</span>
              <button
                type="button"
                disabled={!!activeGame}
                onClick={() => setCommissionPickerOpen((open) => !open)}
                aria-label={t('commission')}
                aria-expanded={commissionPickerOpen}
                className={cn(
                  'h-14 w-[5.5rem] rounded-lg border-2 border-amber-500 bg-[#e8eaf2] shadow-[0_0_0_2px_rgba(245,158,11,0.35)] transition-shadow disabled:cursor-not-allowed disabled:opacity-50',
                  !commissionPickerOpen && 'hover:border-amber-600',
                )}
              />
              {commissionPickerOpen && !activeGame && (
                <ul
                  className="absolute left-0 top-full z-20 mt-1 min-w-[5.5rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                  role="listbox"
                >
                  {GAME_COMMISSION_OPTIONS.map((pct) => (
                    <li key={pct} role="option" aria-selected={commissionPercent === String(pct)}>
                      <button
                        type="button"
                        className={cn(
                          'w-full px-4 py-2.5 text-left text-base font-bold hover:bg-amber-50',
                          commissionPercent === String(pct) ? 'bg-amber-100 text-amber-900' : 'text-gray-900',
                        )}
                        onClick={() => {
                          setCommissionPercent(String(pct));
                          setCommissionPickerOpen(false);
                        }}
                      >
                        {pct}%
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {betError && <p className="w-full text-sm font-semibold text-red-600">{betError}</p>}
            {drawError && <p className="w-full text-sm font-semibold text-amber-700">{drawError}</p>}
            <button
              type="button"
              onClick={handleCreateGame}
              disabled={!canCreateGame || !!activeGame}
              className="ml-auto h-14 rounded-xl bg-[#22c55e] px-10 text-lg font-black uppercase tracking-wide text-white shadow-lg hover:bg-[#16a34a] disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create Game'}
            </button>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-blue-600">{t('profit')}:</span>
              <span className="font-bold text-blue-600">
                {showProfit ? `${displayProfit.toFixed(2)} ETB` : '******'}
              </span>
              <button
                type="button"
                onClick={() => setShowProfit(!showProfit)}
                className="rounded p-0.5 text-blue-600 hover:bg-blue-50"
                title={showProfit ? t('hide') : t('show')}
                aria-label={showProfit ? t('hide') : t('show')}
              >
                {showProfit ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {!activeGame && (
              <button
                type="button"
                onClick={() => {
                  const next = !cartellaVoiceMuted;
                  setCartellaVoiceMuted(next);
                  localStorage.setItem(CARTELLA_VOICE_KEY, next ? '1' : '0');
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                title={cartellaVoiceMuted ? t('unmute') : t('mute')}
              >
                {cartellaVoiceMuted ? <VolumeX className="h-4 w-4 text-red-500" /> : <Volume2 className="h-4 w-4 text-green-600" />}
                {t('cartellaVoice')}: {cartellaVoiceMuted ? t('mute') : t('unmute')}
              </button>
            )}
          </div>

          {!activeGame && walletBalance <= 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-medium">Wallet balance: 0 ETB</p>
              <p className="mt-1">You cannot create a game or select cartellas until your admin adds TBG balance.</p>
            </div>
          )}

          {!activeGame && walletBalance > 0 && selected.length > maxAffordablePlayers && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
              <p className="font-medium">Too many cartellas for your TBG wallet</p>
              <p className="mt-1">
                At {effectiveCommissionRate}% commission and {parseFloat(betAmount || '0') || 0} ETB bet, your wallet covers up to {maxAffordablePlayers} cartellas. Remove {selected.length - maxAffordablePlayers} selection(s) or ask admin for a TBG top-up.
              </p>
            </div>
          )}

          {!activeGame && walletBalance > 0 && selected.length >= MIN_PLAYERS_TO_START && selected.length <= maxAffordablePlayers && walletBalance < walletReserve.reserveRequired && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
              <p className="font-medium">Insufficient TBG balance for this game</p>
              <p className="mt-1">
                Need at least {walletReserve.reserveRequired.toFixed(0)} ETB commission in TBG wallet (winner gets {walletReserve.prize.toFixed(0)} ETB cash). Current balance: {walletBalance.toFixed(0)} ETB.
              </p>
            </div>
          )}

          {!activeGame && walletBalance > 0 && selected.length > 0 && selected.length < MIN_PLAYERS_TO_START && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
              <p className="font-medium">Select at least {MIN_PLAYERS_TO_START} cartellas to enable Create Game.</p>
            </div>
          )}

          <NumberGrid
            availableNumbers={availableCartellas}
            selectedSet={selectedSet}
            onToggle={toggleNumber}
            onClear={() => setSelected([])}
            onShuffle={() => speakShuffle(voice, language)}
            disabled={!canPickCartellas}
            lockedSet={bannedSet}
            staticMax={INITIAL_CARTELLA_COUNT}
            title={t('selectCartellas')}
            clearLabel={t('clearCards')}
            shuffleLabel={t('shuffle')}
            shuffledLabel={t('shuffled')}
          />
        </div>
      )}
    </>
  );
}
