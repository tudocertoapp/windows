import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { authenticateToRevealValues } from '../utils/biometricAuth';

const ValuesVisibilityContext = createContext(undefined);

export function ValuesVisibilityProvider({ children }) {
  const [showValues, setShowValues] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        setShowValues(false);
      }
    });
    return () => sub?.remove?.();
  }, []);

  const toggleValues = useCallback(async () => {
    if (showValues) {
      setShowValues(false);
      return;
    }
    const ok = await authenticateToRevealValues();
    if (ok) setShowValues(true);
  }, [showValues]);

  const hideValues = useCallback(() => setShowValues(false), []);

  return (
    <ValuesVisibilityContext.Provider value={{ showValues, toggleValues, hideValues }}>
      {children}
    </ValuesVisibilityContext.Provider>
  );
}

export function useValuesVisibility() {
  const ctx = useContext(ValuesVisibilityContext);
  if (!ctx) {
    return {
      showValues: false,
      toggleValues: async () => {},
      hideValues: () => {},
    };
  }
  return ctx;
}
