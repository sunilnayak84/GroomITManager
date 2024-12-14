import { type Config } from "tailwindcss";

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(0, 0%, 100%)',
        foreground: 'hsl(222.2, 84%, 4.9%)',
        primary: {
          DEFAULT: 'hsl(221.2, 83.2%, 53.3%)',
          dark: 'hsl(221.2, 83.2%, 43.3%)',
          light: 'hsl(221.2, 83.2%, 63.3%)',
          foreground: 'hsl(210, 40%, 98%)'
        },
        secondary: {
          DEFAULT: 'hsl(210, 40%, 96.1%)',
          dark: 'hsl(215, 20.2%, 65.1%)',
          light: 'hsl(210, 40%, 98%)',
          foreground: 'hsl(222.2, 47.4%, 11.2%)'
        },
        accent: {
          DEFAULT: 'hsl(262.1, 83.3%, 57.8%)',
          dark: 'hsl(262.1, 83.3%, 47.8%)',
          light: 'hsl(262.1, 83.3%, 67.8%)',
          foreground: 'hsl(210, 40%, 98%)'
        },
        muted: {
          DEFAULT: 'hsl(210, 40%, 96.1%)',
          foreground: 'hsl(215.4, 16.3%, 46.9%)'
        },
        card: {
          DEFAULT: 'hsl(0, 0%, 100%)',
          foreground: 'hsl(222.2, 84%, 4.9%)'
        },
        popover: {
          DEFAULT: 'hsl(0, 0%, 100%)',
          foreground: 'hsl(222.2, 84%, 4.9%)'
        },
        border: 'hsl(214.3, 31.8%, 91.4%)',
        input: 'hsl(214.3, 31.8%, 91.4%)',
        ring: 'hsl(221.2, 83.2%, 53.3%)'
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem'
      }
    },
  },
  plugins: [
    require("@tailwindcss/forms")
  ],
} satisfies Config;