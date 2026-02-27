import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@tudocerto_theme';
const FAVORITES_STORAGE_KEY = '@tudocerto_theme_favorites';

export const FREE_COLORS = [
  { id: 'green', hex: '#10b981', name: 'Verde' },
  { id: 'blue', hex: '#3b82f6', name: 'Azul' },
];

export const PRIMARY_COLOR_OPTIONS = [
  { id: 'green', hex: '#10b981', name: 'Verde' },
  { id: 'emerald', hex: '#059669', name: 'Esmeralda' },
  { id: 'teal', hex: '#06b6d4', name: 'Ciano' },
  { id: 'cyan', hex: '#0891b2', name: 'Ciano escuro' },
  { id: 'blue', hex: '#3b82f6', name: 'Azul' },
  { id: 'indigo', hex: '#6366f1', name: 'Índigo' },
  { id: 'violet', hex: '#8b5cf6', name: 'Violeta' },
  { id: 'purple', hex: '#a855f7', name: 'Roxo' },
  { id: 'fuchsia', hex: '#d946ef', name: 'Fúcsia' },
  { id: 'pink', hex: '#ec4899', name: 'Rosa' },
  { id: 'rose', hex: '#f43f5e', name: 'Rosa escuro' },
  { id: 'red', hex: '#ef4444', name: 'Vermelho' },
  { id: 'orange', hex: '#f97316', name: 'Laranja' },
  { id: 'amber', hex: '#f59e0b', name: 'Âmbar' },
  { id: 'yellow', hex: '#eab308', name: 'Amarelo' },
  { id: 'lime', hex: '#84cc16', name: 'Lima' },
  { id: 'sky', hex: '#0ea5e9', name: 'Céu' },
  { id: 'azul_claro', hex: '#93c5fd', name: 'Azul claro' },
  { id: 'azul_medio', hex: '#60a5fa', name: 'Azul médio' },
  { id: 'azul_forte', hex: '#1d4ed8', name: 'Azul forte' },
  { id: 'blue2', hex: '#2563eb', name: 'Azul intenso' },
  { id: 'violet2', hex: '#7c3aed', name: 'Violeta forte' },
  { id: 'purple2', hex: '#9333ea', name: 'Roxo forte' },
  { id: 'pink2', hex: '#db2777', name: 'Rosa forte' },
  { id: 'red2', hex: '#dc2626', name: 'Vermelho forte' },
  { id: 'orange2', hex: '#ea580c', name: 'Laranja forte' },
  { id: 'amber2', hex: '#d97706', name: 'Âmbar forte' },
  { id: 'teal2', hex: '#0d9488', name: 'Teal forte' },
  { id: 'cyan2', hex: '#0e7490', name: 'Ciano forte' },
  { id: 'indigo2', hex: '#4f46e5', name: 'Índigo forte' },
  { id: 'green2', hex: '#16a34a', name: 'Verde forte' },
  { id: 'emerald2', hex: '#047857', name: 'Esmeralda forte' },
  { id: 'fuchsia2', hex: '#c026d3', name: 'Fúcsia forte' },
];

export function getThemeColors(dark, primaryHex) {
  const parseHex = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };
  const primaryRgba = (a) => {
    const { r, g, b } = parseHex(primaryHex);
    return `rgba(${r},${g},${b},${a})`;
  };
  if (dark) {
    return {
      bg: '#111827',
      bgSecondary: '#1f2937',
      card: '#1f2937',
      border: '#374151',
      text: '#f9fafb',
      textSecondary: '#9ca3af',
      primary: primaryHex,
      primaryRgba,
      expense: '#fca5a5',
      income: '#6ee7b7',
    };
  }
  return {
    bg: '#f9fafb',
    bgSecondary: '#fff',
    card: '#fff',
    border: '#e5e7eb',
    text: '#1f2937',
    textSecondary: '#6b7280',
    primary: primaryHex,
    primaryRgba,
    expense: '#fca5a5',
    income: '#6ee7b7',
  };
}

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [favoriteColors, setFavoriteColors] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (raw) {
          const { dark, primary } = JSON.parse(raw);
          if (typeof dark === 'boolean') setDarkMode(dark);
          if (primary) setPrimaryColor(primary);
        }
        const favRaw = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
        if (favRaw) {
          try {
            const favs = JSON.parse(favRaw);
            setFavoriteColors(Array.isArray(favs) ? favs.slice(0, 10) : []);
          } catch (_) {}
        }
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ dark: darkMode, primary: primaryColor }));
  }, [loaded, darkMode, primaryColor]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteColors));
  }, [loaded, favoriteColors]);

  const MAX_FAVORITES = 10;

  const addFavoriteColor = (hex, name) => {
    const normalizedHex = hex.startsWith('#') ? hex : `#${hex}`;
    const hexUpper = normalizedHex.toUpperCase();
    const newFav = { id: `fav_${Date.now()}`, hex: hexUpper, name: name || hexUpper };
    setFavoriteColors((prev) => {
      const exists = prev.some((f) => f.hex.toLowerCase() === normalizedHex.toLowerCase());
      if (exists) return prev;
      if (prev.length >= MAX_FAVORITES) return prev;
      return [...prev, newFav];
    });
  };

  const removeFavoriteColor = (id) => {
    setFavoriteColors((prev) => prev.filter((f) => f.id !== id));
  };

  const colors = getThemeColors(darkMode, primaryColor);
  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        setDarkMode,
        primaryColor,
        setPrimaryColor,
        colors,
        primaryOptions: PRIMARY_COLOR_OPTIONS,
        favoriteColors,
        addFavoriteColor,
        removeFavoriteColor,
        maxFavorites: MAX_FAVORITES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme fora do ThemeProvider');
  return ctx;
}
