import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Corporate theme
        'corp-bg-primary': 'var(--bg-primary)',
        'corp-bg-secondary': 'var(--bg-secondary)',
        'corp-text-primary': 'var(--text-primary)',
        'corp-text-secondary': 'var(--text-secondary)',
        'corp-text-muted': 'var(--text-muted)',
        'corp-accent': 'var(--accent)',
        'corp-border': 'var(--border)',

        // Breach theme
        'breach-bg-primary': 'var(--bg-primary)',
        'breach-bg-secondary': 'var(--bg-secondary)',
        'breach-text-primary': 'var(--text-primary)',
        'breach-text-secondary': 'var(--text-secondary)',
        'breach-text-muted': 'var(--text-muted)',
        'breach-accent': 'var(--accent)',
        'breach-border': 'var(--border)',
        'breach-danger': 'var(--accent-red)',
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'window': 'var(--shadow-window)',
        'card': 'var(--shadow-card)',
        'glow-green': 'var(--glow-green, none)',
        'glow-red': 'var(--glow-red, none)',
      },
    },
  },
};

export default config;
