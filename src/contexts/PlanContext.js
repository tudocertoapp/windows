import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PLAN_STORAGE_KEY = '@tudocerto_plan';

const PlanContext = createContext(undefined);

export const PLANS = {
  pessoal: 'pessoal',
  pessoal_empresa: 'pessoal_empresa',
  empresa: 'empresa',
};

export function PlanProvider({ children }) {
  const [plan, setPlan] = useState(PLANS.pessoal);
  const [viewMode, setViewMode] = useState('pessoal'); // 'pessoal' | 'empresa' - nunca misturar
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PLAN_STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.plan && PLANS[data.plan]) setPlan(data.plan);
          if (data.viewMode) setViewMode(data.viewMode);
        }
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (plan === PLANS.pessoal && viewMode === 'empresa') setViewMode('pessoal');
  }, [plan]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify({ plan, viewMode }));
  }, [loaded, plan, viewMode]);

  const isEmpresa = plan === PLANS.empresa || plan === PLANS.pessoal_empresa;
  const showEmpresaFeatures = isEmpresa;
  const canToggleView = isEmpresa;

  return (
    <PlanContext.Provider
      value={{
        plan,
        setPlan,
        viewMode,
        setViewMode,
        isEmpresa,
        showEmpresaFeatures,
        canToggleView,
        PLANS,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) return { plan: PLANS.pessoal, setPlan: () => {}, viewMode: 'pessoal', setViewMode: () => {}, isEmpresa: false, showEmpresaFeatures: false, canToggleView: false, PLANS };
  return ctx;
}
