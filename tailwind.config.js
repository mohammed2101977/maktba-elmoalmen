/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fff8ed',
          100: '#ffefd4',
          200: '#ffd9a8',
          300: '#ffbe72',
          400: '#ff9836',
          500: '#ff7a0f',
          600: '#f05c06',
          700: '#c74407',
          800: '#9e370d',
          900: '#7f2f0e',
        },
      },
    },
  },
  plugins: [],
};
