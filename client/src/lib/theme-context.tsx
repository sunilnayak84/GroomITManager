import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type ThemeColor = 'default' | 'purple' | 'blue' | 'green';

interface ThemeContextType {
  mode: ThemeMode;
  color: ThemeColor;
  setMode: (mode: ThemeMode) => void;
  setColor: (color: ThemeColor) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeColors = {
  default: {
    light: {
      primary: '#6366f1',
      secondary: '#4f46e5',
      accent: '#818cf8',
      background: '#ffffff',
      text: '#1f2937',
      border: '#e5e7eb',
    },
    dark: {
      primary: '#818cf8',
      secondary: '#6366f1',
      accent: '#4f46e5',
      background: '#111827',
      text: '#f9fafb',
      border: '#374151',
    },
  },
  purple: {
    light: {
      primary: '#8b5cf6',
      secondary: '#7c3aed',
      accent: '#a78bfa',
      background: '#ffffff',
      text: '#1f2937',
      border: '#e5e7eb',
    },
    dark: {
      primary: '#a78bfa',
      secondary: '#8b5cf6',
      accent: '#7c3aed',
      background: '#111827',
      text: '#f9fafb',
      border: '#374151',
    },
  },
  blue: {
    light: {
      primary: '#3b82f6',
      secondary: '#2563eb',
      accent: '#60a5fa',
      background: '#ffffff',
      text: '#1f2937',
      border: '#e5e7eb',
    },
    dark: {
      primary: '#60a5fa',
      secondary: '#3b82f6',
      accent: '#2563eb',
      background: '#111827',
      text: '#f9fafb',
      border: '#374151',
    },
  },
  green: {
    light: {
      primary: '#10b981',
      secondary: '#059669',
      accent: '#34d399',
      background: '#ffffff',
      text: '#1f2937',
      border: '#e5e7eb',
    },
    dark: {
      primary: '#34d399',
      secondary: '#10b981',
      accent: '#059669',
      background: '#111827',
      text: '#f9fafb',
      border: '#374151',
    },
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('themeMode') as ThemeMode) || 'light';
    }
    return 'light';
  });

  const [color, setColor] = useState<ThemeColor>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('themeColor') as ThemeColor) || 'default';
    }
    return 'default';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const colors = themeColors[color][mode];

    // Apply theme colors as CSS variables
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Update color mode class
    root.classList.remove('light', 'dark');
    root.classList.add(mode);

    // Save preferences
    localStorage.setItem('themeMode', mode);
    localStorage.setItem('themeColor', color);
  }, [mode, color]);

  const toggleMode = () => setMode(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ mode, color, setMode, setColor, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
