import { CARTELLA_COUNT } from './brand';

/** Cartella card numbers — 1 to 150 (each card grid uses numbers 1–75) */
export const CARTELLA_MAX = CARTELLA_COUNT;
export const MIN_BET = 10;
export const CURRENCY = 'ETB';
export const CURRENCY_LABEL = 'Birr';

export const WINNING_PATTERNS = [
  { value: 'FIRST_LINE', label: 'First line (1 row)' },
  { value: 'TWO_LINES', label: 'Two lines (2 rows)' },
  { value: 'FULL_HOUSE', label: 'Full house' },
  { value: 'EARLY_JACKPOT', label: 'Early jackpot (full house before N calls)' },
  { value: 'SINGLE_LINE', label: '1 line (legacy)' },
  { value: 'DOUBLE_LINE', label: '2 lines (legacy)' },
  { value: 'FOUR_CORNERS', label: '4 corners' },
  { value: 'X_PATTERN', label: 'X pattern' },
] as const;

export const DEFAULT_JACKPOT_MAX_CALLS = 45;

export const DEFAULT_CALL_COOLDOWN_MS = 300;

export const DRAW_INTERVALS = [
  { value: 0, label: 'Instant (no pause)' },
  { value: 500, label: '0.5 sec after call' },
  { value: 1000, label: '1 sec after call' },
  { value: 2000, label: '2 sec after call' },
  { value: 3000, label: '3 sec after call' },
] as const;

export const VOICE_TYPES = [
  { value: 'AMHARIC_MALE', label: 'Amharic Male 1' },
  { value: 'AMHARIC_FEMALE', label: 'Amharic Female 1' },
  { value: 'ENGLISH', label: 'English' },
] as const;

export const BINGO_COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const;
export const BINGO_COLUMN_COLORS = {
  B: 'bg-bingo-b',
  I: 'bg-bingo-i',
  N: 'bg-bingo-n',
  G: 'bg-bingo-g',
  O: 'bg-bingo-o',
} as const;

// Standard 75-ball BINGO column ranges (numbers called during play)
export const COLUMN_RANGES = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75],
} as const;
