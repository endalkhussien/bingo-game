/** Maximum cartella (card) numbers agents can select per game */
export const CARTELLA_MAX = 150;
export const MIN_BET = 10;
export const CURRENCY = 'ETB';
export const CURRENCY_LABEL = 'Birr';

export const WINNING_PATTERNS = [
  { value: 'SINGLE_LINE', label: '1 line' },
  { value: 'DOUBLE_LINE', label: '2 lines' },
  { value: 'FOUR_CORNERS', label: '4 corners' },
  { value: 'X_PATTERN', label: 'X pattern' },
  { value: 'FULL_HOUSE', label: 'Full house' },
] as const;

export const DRAW_INTERVALS = [
  { value: 1000, label: '1 second' },
  { value: 2000, label: '2 seconds' },
  { value: 3000, label: '3 seconds' },
  { value: 5000, label: '5 seconds' },
  { value: 10000, label: '10 seconds' },
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
