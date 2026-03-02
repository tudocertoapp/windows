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

export const BACKGROUND_COLORS = [
  { id: '1', hex: '#f9fafb' }, { id: '2', hex: '#f3f4f6' }, { id: '3', hex: '#e5e7eb' },
  { id: '4', hex: '#e0f2fe' }, { id: '5', hex: '#bae6fd' }, { id: '6', hex: '#7dd3fc' },
  { id: '7', hex: '#fff7ed' }, { id: '8', hex: '#fed7aa' }, { id: '9', hex: '#fef3c7' },
  { id: '10', hex: '#fef9c3' }, { id: '11', hex: '#ecfccb' }, { id: '12', hex: '#dcfce7' },
  { id: '13', hex: '#d1fae5' }, { id: '14', hex: '#ccfbf1' }, { id: '15', hex: '#cffafe' },
  { id: '16', hex: '#fce7f3' }, { id: '17', hex: '#fbcfe8' }, { id: '18', hex: '#ede9fe' },
  { id: '19', hex: '#ddd6fe' }, { id: '20', hex: '#f5f5f4' }, { id: '21', hex: '#111827' },
  { id: '22', hex: '#1f2937' }, { id: '23', hex: '#0f172a' }, { id: '24', hex: '#1e293b' },
  { id: '25', hex: '#1a1a2e' }, { id: '26', hex: '#0c4a6e' }, { id: '27', hex: '#134e4a' },
  { id: '28', hex: '#14532d' }, { id: '29', hex: '#422006' }, { id: '30', hex: '#431407' },
  { id: '31', hex: '#4c1d95' }, { id: '32', hex: '#581c87' }, { id: '33', hex: '#1e3a5f' },
  { id: '34', hex: '#312e81' }, { id: '35', hex: '#7c2d12' }, { id: '36', hex: '#1e1b4b' },
  { id: '37', hex: '#171e2e' }, { id: '38', hex: '#0f1419' }, { id: '39', hex: '#374151' },
  { id: '40', hex: '#4b5563' },
];

export const THEME_PRESETS = {
  light: {
    id: 'light',
    name: 'Claro',
    icon: 'sunny',
    bg: '#f9fafb',
    bgSecondary: '#fff',
    card: '#fff',
    border: '#e5e7eb',
    text: '#1f2937',
    textSecondary: '#6b7280',
  },
  dark: {
    id: 'dark',
    name: 'Escuro',
    icon: 'moon',
    bg: '#111827',
    bgSecondary: '#1f2937',
    card: '#1f2937',
    border: '#374151',
    text: '#f9fafb',
    textSecondary: '#9ca3af',
  },
  archipelago: {
    id: 'archipelago',
    name: 'Arquipélago',
    icon: 'water',
    bg: '#e0f2fe',
    bgSecondary: '#f0f9ff',
    card: '#f0f9ff',
    border: '#7dd3fc',
    text: '#0c4a6e',
    textSecondary: '#0369a1',
  },
  sunset: {
    id: 'sunset',
    name: 'Pôr do sol',
    icon: 'partly-sunny',
    bg: '#fff7ed',
    bgSecondary: '#fffbeb',
    card: '#fffbeb',
    border: '#fed7aa',
    text: '#431407',
    textSecondary: '#9a3412',
  },
};

function blendWithWhite(hex, amount) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const w = Math.min(1, Math.max(0, amount));
  return `rgb(${Math.round(r + (255 - r) * w)},${Math.round(g + (255 - g) * w)},${Math.round(b + (255 - b) * w)})`;
}

function blendWithBlack(hex, amount) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const w = Math.min(1, Math.max(0, amount));
  return `rgb(${Math.round(r * (1 - w))},${Math.round(g * (1 - w))},${Math.round(b * (1 - w))})`;
}

export function isDarkBg(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

export function getThemeColors(themeMode, primaryHex, secondaryHex = null, customBg = null) {
  const preset = THEME_PRESETS[themeMode] || THEME_PRESETS.light;
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
  const bg = customBg || preset.bg;
  const bgSecondary = customBg ? blendWithWhite(customBg, 0.12) : preset.bgSecondary;
  const darkBg = isDarkBg(bg);
  const hexToRgba = (hex, a) => {
    if (!hex || !hex.startsWith('#')) return darkBg ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.35)';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  };
  const card = darkBg ? blendWithWhite(bg, 0.1) : blendWithBlack(bg, 0.06);
  const text = darkBg ? '#f9fafb' : '#1f2937';
  const textSecondary = darkBg ? '#9ca3af' : '#6b7280';
  const border = darkBg ? blendWithWhite(bg, 0.18) : blendWithBlack(bg, 0.12);
  return {
    bg,
    bgSecondary,
    card,
    border,
    text,
    textSecondary,
    primary: primaryHex,
    secondary: secondaryHex || primaryHex,
    primaryRgba,
    expense: '#fca5a5',
    income: '#6ee7b7',
    isDarkBg: darkBg,
  };
}

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState('light');
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [secondaryColor, setSecondaryColor] = useState(null);
  const [customBgColor, setCustomBgColor] = useState('#f9fafb');
  const [favoriteColors, setFavoriteColors] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const darkMode = themeMode === 'dark';
  const setDarkMode = (v) => setThemeMode(v ? 'dark' : 'light');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.themeMode && THEME_PRESETS[data.themeMode]) setThemeMode(data.themeMode);
          else if (typeof data.dark === 'boolean') setThemeMode(data.dark ? 'dark' : 'light');
          if (data.primary) setPrimaryColor(data.primary);
          if (data.secondary) setSecondaryColor(data.secondary);
          if (data.customBg) setCustomBgColor(data.customBg);
          else if (data.themeMode && THEME_PRESETS[data.themeMode]) setCustomBgColor(THEME_PRESETS[data.themeMode].bg);
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
    AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({
      themeMode,
      primary: primaryColor,
      secondary: secondaryColor,
      customBg: customBgColor,
    }));
  }, [loaded, themeMode, primaryColor, secondaryColor, customBgColor]);

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

  const colors = getThemeColors(themeMode, primaryColor, secondaryColor, customBgColor);
  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        setDarkMode,
        themeMode,
        setThemeMode,
        primaryColor,
        setPrimaryColor,
        secondaryColor,
        setSecondaryColor,
        customBgColor,
        setCustomBgColor,
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
