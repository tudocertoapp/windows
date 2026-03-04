import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BUDGETS_KEY = '@tudocerto_budgets';

const BudgetContext = createContext(undefined);

export function BudgetProvider({ children }) {
  const [limits, setLimits] = useState({});

  const loadBudgets = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(BUDGETS_KEY);
      const data = raw ? JSON.parse(raw) : {};
      setLimits(typeof data === 'object' && data !== null ? data : {});
    } catch {
      setLimits({});
    }
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const setBudgetLimit = useCallback(async (category, value) => {
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    const next = { ...limits, [category]: num > 0 ? num : undefined };
    if (num <= 0) delete next[category];
    setLimits(next);
    try {
      await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Erro ao salvar limite:', e);
    }
    return next;
  }, [limits]);

  const getBudgetLimit = useCallback((category) => {
    return limits[category] ?? null;
  }, [limits]);

  const removeBudgetLimit = useCallback(async (category) => {
    const next = { ...limits };
    delete next[category];
    setLimits(next);
    try {
      await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Erro ao remover limite:', e);
    }
  }, [limits]);

  const value = {
    limits,
    setBudgetLimit,
    getBudgetLimit,
    removeBudgetLimit,
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider');
  return ctx;
}
