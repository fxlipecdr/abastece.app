/** @type {import('tailwindcss').Config} */
// Tailwind mapeado para as CSS custom properties do design system, garantindo
// uma fonte única de verdade para cores e suporte automático a dark mode.
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
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          warm: 'var(--color-accent-warm)',
        },
        danger: 'var(--color-danger)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          card: 'var(--color-surface-card)',
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
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
      },
      animation: {
        'xp-pop': 'xp-pop 0.5s ease-out',
        'fade-slide-up': 'fade-slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
