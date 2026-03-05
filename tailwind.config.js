/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"DM Sans"', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      colors: {
        cyan: { DEFAULT: '#00FFC8', dim: '#00FFC820' },
        danger: '#FF3B3B',
        warn: '#FFB800',
      },
      animation: {
        pulse_slow: 'pulse 3s ease-in-out infinite',
        blink: 'blink 1.2s step-start infinite',
        'slide-in': 'slideIn 0.4s ease-out',
        'fade-up': 'fadeUp 0.5s ease-out',
      },
      keyframes: {
        blink: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
        slideIn: { from: { transform: 'translateY(-20px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        fadeUp: { from: { transform: 'translateY(16px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
