import { fontFamily } from "tailwindcss/defaultTheme";
import type { Config } from "tailwindcss";

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          50: '#FFFFFF',
          100: '#F5F5FF',
          200: '#E5E7FF',
          300: '#C7C9FF',
          400: '#9B9EFF',
          500: '#4F46E5',
          600: '#3730A3',
          700: '#312E81',
          800: '#1E1B4B',
          900: '#0F172A'
        },
        secondary: {
          DEFAULT: '#6B7280',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#6B7280',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A'
        },
        background: '#FFFFFF',
        foreground: '#0F172A',
        modal: {
          overlay: 'rgba(0, 0, 0, 0.5)',
          background: '#FFFFFF'
        }
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    require("tailwindcss-animate"),
  ],
} satisfies Config;