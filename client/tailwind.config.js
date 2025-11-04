/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette
        'bg-primary': '#001D22',      // Background - darkest
        'bg-secondary': '#122D32',   // Surface/Cards - darker
        'bg-tertiary': '#263F43',    // Elevated components - medium
        'accent': '#475C5F',         // Highlights/interactive - lighter
      },
      fontFamily: {
        sans: ['Albert Sans', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'sidebar': '240px',
        'sidebar-collapsed': '76px',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
}

