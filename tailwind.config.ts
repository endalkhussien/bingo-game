import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#1a1410',
          hover: '#2a1f18',
          active: '#3d2e1f',
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
