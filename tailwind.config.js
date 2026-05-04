/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bi: {
          bg:        '#faf9f6',
          card:      '#ffffff',
          tint:      '#f5f1ea',
          border:    '#e8e4dc',
          text:      '#1c1917',
          'text-soft': '#57534e',
          'text-mute': '#a8a29e',
          primary:      '#b45309',
          'primary-hover': '#92400e',
          'primary-soft': '#fed7aa',
          good:      '#15803d',
          'good-soft': '#d1fae5',
          warn:      '#b45309',
          'warn-soft': '#fef3c7',
          bad:       '#b91c1c',
          'bad-soft': '#fee2e2'
        },
        // Keep brand-* aliases pointing to bi-primary so existing code doesn't break:
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#d97706',
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#7c2d12'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
      }
    }
  },
  plugins: []
}
