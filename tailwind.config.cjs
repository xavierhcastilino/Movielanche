module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#080A0F',
        panel: '#10131A',
        card: '#151922',
        snow: '#F5F7FA',
        muted: '#9AA1AE',
        ice: '#8FD3FF',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
      },
      boxShadow: {
        poster: '0 18px 50px rgba(0, 0, 0, 0.42)',
      },
    },
  },
  plugins: [],
};
