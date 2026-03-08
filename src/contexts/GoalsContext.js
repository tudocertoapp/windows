import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GOALS_KEY = '@tudocerto_goals';
const DEPOSITS_KEY = '@tudocerto_goals_deposits';

const GoalsContext = createContext(undefined);

function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function GoalsProvider({ children }) {
  const [goals, setGoals] = useState([]);
  const [deposits, setDeposits] = useState([]);

  const load = useCallback(async () => {
    try {
      const [gRaw, dRaw] = await Promise.all([
        AsyncStorage.getItem(GOALS_KEY),
        AsyncStorage.getItem(DEPOSITS_KEY),
      ]);
      const g = gRaw ? JSON.parse(gRaw) : [];
      const d = dRaw ? JSON.parse(dRaw) : [];
      setGoals(Array.isArray(g) ? g : []);
      setDeposits(Array.isArray(d) ? d : []);
    } catch {
      setGoals([]);
      setDeposits([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveGoals = useCallback((next) => {
    setGoals(next);
    AsyncStorage.setItem(GOALS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const saveDeposits = useCallback((next) => {
    setDeposits(next);
    AsyncStorage.setItem(DEPOSITS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const addGoal = useCallback((goal) => {
    const n = {
      id: Date.now().toString(),
      title: (goal?.title || '').trim() || 'Meta',
      targetValue: Number(goal?.targetValue) || 0,
      description: (goal?.description || '').trim() || '',
      photoUris: Array.isArray(goal?.photoUris) ? goal.photoUris : [],
      createdAt: new Date().toISOString(),
    };
    setGoals((prev) => {
      const next = [n, ...prev];
      AsyncStorage.setItem(GOALS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    return n.id;
  }, []);

  const updateGoal = useCallback((id, data) => {
    setGoals((prev) => {
      const next = prev.map((g) =>
        g.id === id
          ? {
              ...g,
              ...data,
              title: (data.title !== undefined ? data.title : g.title).trim() || 'Meta',
              targetValue: data.targetValue !== undefined ? Number(data.targetValue) : g.targetValue,
              description: data.description !== undefined ? data.description : g.description,
              photoUris: data.photoUris !== undefined ? data.photoUris : g.photoUris,
            }
          : g
      );
      AsyncStorage.setItem(GOALS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const deleteGoal = useCallback((id) => {
    setGoals((prev) => {
      const next = prev.filter((g) => g.id !== id);
      AsyncStorage.setItem(GOALS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    setDeposits((prev) => {
      const next = prev.filter((d) => d.goalId !== id);
      AsyncStorage.setItem(DEPOSITS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const addDeposit = useCallback((goalId, amount) => {
    const amt = Number(amount) || 0;
    if (amt <= 0) return;
    const n = {
      id: Date.now().toString(),
      goalId,
      amount: amt,
      monthKey: getMonthKey(),
      createdAt: new Date().toISOString(),
    };
    setDeposits((prev) => {
      const next = [n, ...prev];
      AsyncStorage.setItem(DEPOSITS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const getTotalSavedForGoal = useCallback(
    (goalId) => {
      return deposits.filter((d) => d.goalId === goalId).reduce((s, d) => s + (d.amount || 0), 0);
    },
    [deposits]
  );

  const getDepositsByMonth = useCallback(
    (goalId) => {
      const byMonth = {};
      deposits
        .filter((d) => d.goalId === goalId)
        .forEach((d) => {
          const k = d.monthKey || getMonthKey();
          byMonth[k] = (byMonth[k] || 0) + (d.amount || 0);
        });
      return Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0]));
    },
    [deposits]
  );

  const value = {
    goals,
    deposits,
    addGoal,
    updateGoal,
    deleteGoal,
    addDeposit,
    getTotalSavedForGoal,
    getDepositsByMonth,
  };

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error('useGoals must be used within GoalsProvider');
  return ctx;
}
