export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        surface: '#f4f5fb',
        line: '#dfe3ee',
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6'
        }
      },
      boxShadow: {
        soft: '0 18px 48px rgba(30, 41, 59, 0.09)'
      }
    }
  },
  plugins: []
};
