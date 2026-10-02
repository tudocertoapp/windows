import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@tudocerto_keyboard_shortcuts_on';

const KeyboardShortcutsContext = createContext({
  shortcutsEnabled: true,
  setShortcutsEnabled: () => {},
  toggleShortcuts: () => {},
});

export function KeyboardShortcutsProvider({ children }) {
  const [shortcutsEnabled, setShortcutsEnabledState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw === '0' || raw === 'false') setShortcutsEnabledState(false);
      if (raw === '1' || raw === 'true') setShortcutsEnabledState(true);
    });
  }, []);

  const setShortcutsEnabled = (next) => {
    const value = !!next;
    setShortcutsEnabledState(value);
    AsyncStorage.setItem(STORAGE_KEY, value ? '1' : '0').catch(() => {});
  };

  const toggleShortcuts = () => setShortcutsEnabled(!shortcutsEnabled);

  const value = useMemo(
    () => ({ shortcutsEnabled, setShortcutsEnabled, toggleShortcuts }),
    [shortcutsEnabled]
  );

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts() {
  return useContext(KeyboardShortcutsContext);
}
