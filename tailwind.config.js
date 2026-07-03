/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Garden-themed palette
        leaf: {
          50: '#f1f8ec',
          100: '#e0efd3',
          200: '#c2e0aa',
          300: '#9ecb78',
          400: '#7cb350',
          500: '#5c9834',
          600: '#457827',
          700: '#365d21',
          800: '#2f4b20',
          900: '#28401f',
        },
        soil: {
          50: '#f7f3ee',
          100: '#e9ddce',
          200: '#d5bd9e',
          300: '#bf9970',
          400: '#ab7d51',
          500: '#8f6440',
          600: '#734f34',
          700: '#5c402d',
          800: '#4d3628',
          900: '#432f25',
        },
        bloom: {
          50: '#fdf2f8',
          100: '#fce7f3',
          400: '#f472b6',
          500: '#ec4899',
        },
      },
    },
  },
  plugins: [],
};
