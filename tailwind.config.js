/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tealBase: '#5dbfb3',
        tealDark: '#3fa498',
        tealDeep: '#1b4a45',
        arcadeYellow: '#f5c344',
        arcadeYellowDark: '#d8a121',
        arcadeOrange: '#ef6a43',
        terminalGreen: '#45f094'
      },
      fontFamily: {
        pixel: ['"Silkscreen"', 'monospace'],
        vt: ['"VT323"', 'monospace'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif']
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}
