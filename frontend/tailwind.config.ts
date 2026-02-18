import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'Monaco', 'monospace'],
      },
      colors: {
        aegis: {
          bg: '#0a0e17',
          card: '#0f1624',
          elevated: '#141d2e',
          cyan: '#22d3ee',
          emerald: '#34d399',
        },
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(34, 211, 238, 0.15)',
        'glow-emerald': '0 0 40px -10px rgba(52, 211, 153, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
