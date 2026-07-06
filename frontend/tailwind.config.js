/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base dark palette
        bg: {
          base: '#0F172A',
          surface: '#1E293B',
          elevated: '#263348',
          border: '#334155',
        },
        // Text
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
        // Accent (indigo-ish)
        accent: {
          DEFAULT: '#6366F1',
          hover: '#818CF8',
          muted: '#312E81',
          subtle: '#1E1B4B',
        },
        // Status colors
        success: {
          DEFAULT: '#10B981',
          muted: '#064E3B',
          subtle: '#022C22',
        },
        warning: {
          DEFAULT: '#F59E0B',
          muted: '#78350F',
          subtle: '#451A03',
        },
        danger: {
          DEFAULT: '#EF4444',
          muted: '#7F1D1D',
          subtle: '#450A0A',
        },
        info: {
          DEFAULT: '#3B82F6',
          muted: '#1E3A5F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-dot': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
