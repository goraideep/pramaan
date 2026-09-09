/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0a1128',
          900: '#0f1c3f',
          800: '#152a5c',
          700: '#1c3a7a',
        },
      },
    },
  },
  plugins: [],
};
