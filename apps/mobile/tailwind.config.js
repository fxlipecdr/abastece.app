/** @type {import('tailwindcss').Config} */
// NativeWind usa valores hex diretos (CSS vars não funcionam em RN).
// Mantém os mesmos valores do design system web (Seção 2).
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B5E20',
          light: '#2E7D32',
          bright: '#43A047',
        },
        accent: {
          DEFAULT: '#FFD600',
          warm: '#FF8F00',
        },
        danger: '#C62828',
        surface: {
          DEFAULT: '#F9FBF7',
          card: '#FFFFFF',
        },
        text: {
          primary: '#1A1A1A',
          secondary: '#546E57',
          muted: '#90A593',
        },
        border: '#E0EAE0',
      },
    },
  },
  plugins: [],
};
