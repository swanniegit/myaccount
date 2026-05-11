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
        paper: '#F6F0E4',
        'paper-edge': '#EAE3D2',
        ink: '#1A1A1A',
        'ink-2': '#5A554A',
        muted: '#B8B0A0',
        accent: '#D97757',
        positive: '#1F8A5B',
        negative: '#C0392B',
        surface: '#FFFFFF',
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
