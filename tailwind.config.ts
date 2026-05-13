import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper:        'var(--paper)',
        'paper-edge': 'var(--paper-edge)',
        ink:          'var(--ink)',
        'ink-2':      'var(--ink-2)',
        muted:        'var(--muted)',
        accent:       'var(--accent)',
        positive:     'var(--positive)',
        negative:     'var(--negative)',
        surface:      'var(--surface)',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': '11px',
      },
    },
  },
  plugins: [],
}
export default config
