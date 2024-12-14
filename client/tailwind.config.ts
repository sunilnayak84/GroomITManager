import { type Config } from "tailwindcss";

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        foreground: '#000000',
        primary: {
          DEFAULT: '#2563eb',
          dark: '#1d4ed8',
          light: '#60a5fa'
        },
        secondary: {
          DEFAULT: '#4b5563',
          dark: '#374151',
          light: '#9ca3af'
        }
      },
      backgroundColor: {
        modal: {
          overlay: 'rgba(0, 0, 0, 0.75)',
          content: '#ffffff'
        }
      }
    },
  },
  plugins: [
    require("@tailwindcss/forms")
  ],
} satisfies Config;