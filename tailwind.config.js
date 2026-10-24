module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { accent: 'rgb(var(--accent) / <alpha-value>)' },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } }
      },
      animation: { rise: 'rise .25s ease-out both' }
    }
  },
  plugins: []
}
