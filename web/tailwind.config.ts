import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#6366f1', // indigo-500
          600: '#585ce6',
          700: '#4f46e5', // indigo-600
        },
      },
    }
  },
  plugins: [],
} satisfies Config
