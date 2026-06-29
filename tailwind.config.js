/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#fff9f1',
        ink: '#262626',
        coral: '#f97362',
        mint: '#7ad7bd',
        butter: '#f8d971',
        lilac: '#c7b7ff',
        clay: '#b86b5f',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(38, 38, 38, 0.10)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
