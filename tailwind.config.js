/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./pride_guys.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Courier Prime"', 'monospace'],
        fredoka: ['Fredoka', 'cursive', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        crt: {
          bg: '#040d06',
          card: '#08170b',
          cardborder: '#00aa44',
          green: '#00ff66',
          dimGreen: '#00b347',
          darkGreen: '#00441a',
          bright: '#66ff99',
          amber: '#ffb700',
          alertRed: '#ff3333'
        }
      }
    },
  },
  plugins: [],
}
