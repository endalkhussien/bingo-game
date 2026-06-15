'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Eye, EyeOff, Play, Pause, Megaphone, ListOrdered } from 'lucide-react';
import { ipc } from '@/presentation/lib/ipc';
import { useAuth } from '@/presentation/providers/auth-provider';
import { NumberGrid } from '@/presentation/components/bingo/number-grid';
import { CalledNumbersModal } from '@/presentation/components/bingo/called-numbers-modal';
import { CalledNumbersStrip } from '@/presentation/components/bingo/called-numbers-strip';
import { CheckCardModal } from '@/presentation/components/bingo/check-card-modal';
import { WINNING_PATTERNS, DRAW_INTERVALS, VOICE_TYPES, MIN_BET, DEFAULT_JACKPOT_MAX_CALLS, DEFAULT_CALL_COOLDOWN_MS } from '@/shared/constants';
import { DRAW_BALL_COUNT } from '@/shared/brand';
import { speakBallCall, speakCartella, loadVoices } from '@/presentation/lib/tts';
import { stopCurrentAudio, preloadBallCallClips } from '@/presentation/lib/amharic-audio';
import { AudioSyncManager, runAutoCallLoop } from '@/presentation/lib/audio-sync-manager';
import { CallingEngine } from '@/domain/services/calling-engine';
import { getBallLabel } from '@/domain/services/bingo-engine';
import { formatBallCallLabel } from '@/shared/tts/ball-call';
import { calculateTotalPot, calculateGameEconomics } from '@/shared/prize';

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
}

export default function GameBoardPage() {
  const { agent, refreshBalance } = useAuth();
  const [betAmount, setBetAmount] = useState('10');
  const [interval, setInterval_] = useState(DEFAULT_CALL_COOLDOWN_MS);
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
  const canSelectCartellas = !activeGame && walletBalance > 0;

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

  useEffect(() => { loadVoices(); preloadBallCallClips(); }, []);
  useEffect(() => {
    if (agent?.commissionRate != null && !activeGame) {
      setCommissionPercent(String(agent.commissionRate));
    }
  }, [agent?.commissionRate, activeGame]);
  useEffect(() => { syncManagerRef.current.setCooldownMs(interval); }, [interval]);
  useEffect(() => { autoDrawRef.current = autoDraw; }, [autoDraw]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { activeGameRef.current = activeGame; }, [activeGame]);

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
        if (paused) {
          autoDrawRef.current = false;
          setAutoDraw(false);
        }
      }
    });
  }, []);

  const toggleNumber = (num: number) => {
    if (activeGame || !canSelectCartellas) return;
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
    syncManagerRef.current.abort();
    stopCurrentAudio();

    if (!pauseOnServer || !activeGameRef.current) return;

    isPausedRef.current = true;
    setIsPaused(true);
    await ipc('games:pause', activeGameRef.current.id);
    setActiveGame((g) => g ? { ...g, status: 'PAUSED' } : g);
  }, []);

  const startCalling = useCallback(async (resumeOnServer = false) => {
    if (!activeGameRef.current || bingoClaimActive) return;

    if (resumeOnServer) {
      await ipc('games:resume', activeGameRef.current.id);
      setActiveGame((g) => g ? { ...g, status: 'RUNNING' } : g);
    }

    isPausedRef.current = false;
    setIsPaused(false);
    autoDrawRef.current = true;
    setAutoDraw(true);
  }, [bingoClaimActive]);

  const drawFromServer = useCallback(async () => {
    const game = activeGameRef.current;
    if (!game || isPausedRef.current) return null;

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

    if (!result.success || !result.data) return null;
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
        status: 'RUNNING',
        playerCount: selected.length,
        totalPot: calculateTotalPot(bet, selected.length),
      };
      setActiveGame(game);
      activeGameRef.current = game;
      setCalled([]);
      setCallHistory([]);
      setLastDrawn(null);
      setIsPaused(false);
      isPausedRef.current = false;
      autoDrawRef.current = false;
      setAutoDraw(false);
      await refreshBalance();
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
    if (!autoDraw || !activeGame || isPaused || bingoClaimActive) return;

    const loopId = ++callingLoopIdRef.current;
    let cancelled = false;

    void runAutoCallLoop(syncManagerRef.current, {
      cooldownMs: interval,
      voiceType: voice,
      language,
      isPaused: () => isPausedRef.current || bingoClaimActive,
      shouldContinue: () =>
        !cancelled
        && callingLoopIdRef.current === loopId
        && autoDrawRef.current
        && !!activeGameRef.current
        && !isPausedRef.current,
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
      syncManagerRef.current.abort();
      stopCurrentAudio();
    };
  }, [autoDraw, activeGame, isPaused, bingoClaimActive, interval, voice, language, drawFromServer, applyDrawResult]);

  const handleBingoClaim = async () => {
    if (!activeGame) return;

    await stopCalling(true);
    setBingoClaimActive(true);
    setCheckModalOpen(true);
  };

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
    }>('games:validate-winner', activeGame.id, cardNumber);

    if (result.valid && result.prizeAmount) {
      setBingoClaimActive(false);
      setActiveGame((g) => g ? { ...g, status: 'PAUSED' } : g);
      const winner: GameWinner = {
        cardNumber: result.cardNumber ?? cardNumber,
        prizeAmount: result.prizeAmount,
        pattern: result.winningPattern,
        calledCountAtWin: result.calledCountAtWin,
      };
      setGameWinners((prev) => {
        if (prev.some((w) => w.cardNumber === winner.cardNumber)) return prev;
        return [...prev, winner];
      });
    }
    return {
      valid: result.valid,
      message: result.message,
      cardNumber: result.cardNumber ?? cardNumber,
      prizeAmount: result.prizeAmount,
      playerCount: result.playerCount ?? playerCount,
      betAmount: result.betAmount ?? activeGame.betAmount,
      totalPot: result.totalPot ?? totalPot,
      calledCountAtWin: result.calledCountAtWin,
      winningPattern: result.winningPattern,
      grid: result.grid,
      calledNumbers: result.calledNumbers ?? called,
    };
  };

  const handleInvalidBingoClaim = () => {
    setBingoClaimActive(false);
  };

  const handleResume = async () => {
    if (!activeGame || bingoClaimActive) return;
    setCheckModalOpen(false);
    await startCalling(true);
  };

  const handleEndGame = async () => {
    if (!activeGame) return;
    await stopCalling(false);
    const result = await ipc<{ success: boolean; data?: { agentRevenue: number } }>('games:end', activeGame.id);
    if (result.success && result.data) {
      setProfit(result.data.agentRevenue);
      setActiveGame(null);
      setCalled([]);
      setCallHistory([]);
      setLastDrawn(null);
      setGameWinners([]);
      setCheckModalOpen(false);
      setCalledModalOpen(false);
      await refreshBalance();
    }
  };

  return (
    <div>
      {activeGame && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-700 p-5 text-white shadow-lg">
          <div>
            <p className="text-sm opacity-80">
              {activeGame.gameCode} ·{' '}
              {isPaused
                ? (bingoClaimActive ? 'BINGO CLAIM — PAUSED' : 'PAUSED')
                : autoDraw
                  ? (callerLocked ? 'CALLING…' : 'LIVE')
                  : 'READY — press Start'}
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

      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex-1 min-w-[100px]">
          <label className="mb-1 block text-sm font-medium text-gray-700">Bet (ETB)</label>
          <input type="number" min={MIN_BET} step={1} value={betAmount} onChange={(e) => { setBetAmount(e.target.value); setBetError(''); }}
            disabled={!!activeGame}
            className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100" />
          {betError && <p className="mt-1 text-xs text-red-500">{betError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Call pace</label>
          <select value={interval} onChange={(e) => setInterval_(Number(e.target.value))} disabled={!!activeGame}
            className="rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100">
            {DRAW_INTERVALS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Pattern</label>
          <select value={pattern} onChange={(e) => setPattern(e.target.value)} disabled={!!activeGame}
            className="rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100">
            {WINNING_PATTERNS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        {pattern === 'EARLY_JACKPOT' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Jackpot max calls</label>
            <input
              type="number"
              min={1}
              max={75}
              value={jackpotMaxCalls}
              onChange={(e) => setJackpotMaxCalls(e.target.value)}
              disabled={!!activeGame}
              className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Voice</label>
          <select value={voice} onChange={(e) => handleVoiceChange(e.target.value)} disabled={!!activeGame}
            className="rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100">
            {VOICE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Language</label>
          <select value={language} onChange={(e) => handleLanguageChange(e.target.value)} disabled={!!activeGame}
            className="rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100">
            <option value="am">Amharic</option>
            <option value="en">English</option>
          </select>
        </div>
        {!activeGame && selected.length > 0 && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Your commission %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">From pot — winner sees net prize only</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Winner prize</label>
              <div className="rounded-lg border bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                {gameEconomics.prize.toFixed(0)} ETB
              </div>
              <p className="mt-1 text-xs text-gray-500">{totalPot.toFixed(0)} ETB pot − {commissionPercent}% commission</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Your estimated cut</label>
              <div className="rounded-lg border bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                {gameEconomics.agentNetCommission.toFixed(0)} ETB
              </div>
              <p className="mt-1 text-xs text-gray-500">After admin share ({adminCommissionRate}%)</p>
            </div>
          </>
        )}
        {!activeGame ? (
          <button onClick={handleCreateGame} disabled={creating || selected.length === 0 || walletBalance <= 0}
            className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
            {creating ? 'Starting...' : `Start Game (${selected.length} cards)`}
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {!isPaused && !autoDraw && (
              <button
                onClick={() => startCalling(false)}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-green-700"
              >
                <Play className="h-5 w-5" /> Start
              </button>
            )}
            <button onClick={() => setCalledModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              <ListOrdered className="h-4 w-4" /> All called ({drawCount})
            </button>
            <button onClick={handleDraw} disabled={isPaused || callerLocked || !autoDraw}
              className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">Draw once</button>
            {autoDraw && !isPaused ? (
              <button onClick={() => stopCalling(true)} disabled={callerLocked}
                className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50">
                <Pause className="h-4 w-4" /> Stop
              </button>
            ) : isPaused && !bingoClaimActive && gameWinners.length === 0 ? (
              <button onClick={handleResume}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                <Play className="h-4 w-4" /> Resume
              </button>
            ) : null}
            <button onClick={handleBingoClaim}
              className="inline-flex items-center gap-1 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-600">
              <Megaphone className="h-4 w-4" /> BINGO!
            </button>
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

      <div className="mb-4 flex items-center gap-2 text-sm">
        <span className="font-medium">Your earnings (game):</span>
        <span className="font-semibold">{showProfit ? `${profit.toFixed(2)} ETB` : '****'}</span>
        <button onClick={() => setShowProfit(!showProfit)} className="text-blue-500">
          {showProfit ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        {!activeGame && selected.length > 0 && (
          <span className="ml-2 text-gray-500">
            Pot: {totalPot.toFixed(0)} ETB · Winner: {gameEconomics.prize.toFixed(0)} ETB
          </span>
        )}
      </div>

      {!activeGame && walletBalance <= 0 && (
        <div className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Wallet empty — cartella selection disabled</p>
          <p className="mt-1">Ask shop admin for a <strong>TBG</strong> recharge code, then redeem it on the Recharge page.</p>
        </div>
      )}

      <NumberGrid selectedSet={selectedSet} onToggle={toggleNumber}
        onClear={() => setSelected([])} disabled={!!activeGame || !canSelectCartellas} />

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
        onValidate={handleValidateCard}
        onInvalidClaim={handleInvalidBingoClaim}
      />
    </div>
  );
}
