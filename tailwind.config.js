/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#e0cec2',
        secondary: '#b8947f',
        ink: '#2f2219',
        shell: '#fff9f5',
        surface: '#f5eeea',
      },
      fontFamily: {
        sans: ['Roboto', 'Avenir Next', 'Segoe UI', 'sans-serif'],
        display: ['Alkatra', 'cursive'],
      },
      boxShadow: {
        soft: '0 16px 40px -24px rgba(56, 34, 20, 0.35)',
      },
      backgroundImage: {
        warm: 'radial-gradient(circle at 0% 0%, #f7ece6 0%, #fdfbf9 42%, #f4ebe6 100%)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 420ms ease-out both',
      },
    },
  },
  plugins: [],
}
