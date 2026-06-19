/** @type {import('tailwindcss').Config} */
// Tailwind mapeado para as CSS custom properties do design system v2.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          bright: 'var(--color-primary-bright)',
          deep: 'var(--color-primary-deep)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          warm: 'var(--color-accent-warm)',
        },
        danger: 'var(--color-danger)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          card: 'var(--color-surface-card)',
          alt: 'var(--color-surface-alt)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        border: 'var(--color-border)',
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        card: 'var(--shadow-card)',
        soft: 'var(--shadow-soft)',
        float: 'var(--shadow-float)',
        sheet: 'var(--shadow-sheet)',
        'glow-primary': 'var(--glow-primary)',
      },
      backgroundImage: {
        'gradient-brand': 'var(--gradient-brand)',
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-accent': 'var(--gradient-accent)',
      },
      animation: {
        'xp-pop': 'xp-pop 0.5s ease-out',
        'fade-slide-up': 'fade-slide-up 0.35s ease-out both',
        'float-bob': 'float-bob 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
