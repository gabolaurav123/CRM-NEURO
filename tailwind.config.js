export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        surface: '#f6f7f9',
        line: '#d9dee7',
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          500: '#0891b2',
          600: '#0e7490',
          700: '#155e75'
        }
      },
      boxShadow: {
        soft: '0 16px 40px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
};
