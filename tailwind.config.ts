import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#1a1f2e',
          hover: '#252b3d',
          active: '#2d3548',
        },
        bingo: {
          b: '#3b82f6',
          i: '#22c55e',
          n: '#ef4444',
          g: '#eab308',
          o: '#f97316',
        },
      },
    },
  },
  plugins: [],
};

export default config;
