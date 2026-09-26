/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0B1220',
          dark: '#182337',
          card: '#1E2D47',
          cardHover: '#253757',
          border: '#2A3C5B',
          lime: '#B8F34A',
          limeHover: '#A4DC3D',
          limeMuted: 'rgba(184, 243, 74, 0.15)',
          muted: '#9CAFC8',
          textMuted: '#8496B0',
          lightBg: '#F8FAFC',
          lightCard: '#FFFFFF',
          lightBorder: '#E2E8F0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-lime': '0 0 20px -3px rgba(184, 243, 74, 0.3)',
        'premium': '0 10px 30px -5px rgba(11, 18, 32, 0.08), 0 4px 6px -2px rgba(11, 18, 32, 0.04)',
      }
    },
  },
  plugins: [],
}
