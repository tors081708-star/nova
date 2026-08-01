/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: {
          DEFAULT: 'hsl(220 35% 4%)',
          elev: 'hsl(217 28% 9%)',
          soft: 'hsl(215 25% 13%)',
        },
        ink: {
          DEFAULT: 'hsl(210 20% 98%)',
          muted: 'hsl(215 15% 65%)',
          subtle: 'hsl(215 15% 45%)',
        },
        line: 'hsl(215 20% 15%)',
        brand: {
          DEFAULT: 'hsl(43 45% 55%)',
          dim: 'hsl(43 35% 40%)',
          glow: 'hsl(43 80% 65%)',
        },
        danger: 'hsl(0 62% 55%)',
      },
      boxShadow: {
        ambient: '0 10px 40px -20px rgba(245, 200, 74, 0.15)',
        card: '0 1px 0 rgba(255,255,255,0.03) inset',
      },
      fontSize: {
        'xxs': '0.6875rem',
      },
      letterSpacing: {
        'widest+': '0.2em',
      },
    },
  },
  plugins: [],
}
