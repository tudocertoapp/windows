import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { PLANS, PLAN_ID_TO_PLAN, PLAN_LABELS, PLAN_IDS_CUSTOM_COLORS } from '../constants/plans';
import { getPlanFeatures } from '../constants/planFeatures';
import { supabase } from '../lib/supabase';
import { getUserSubscription, isPaidSubscriptionActive } from '../lib/subscription';

const PLAN_STORAGE_BASE = '@tudocerto_plan';
const DEFAULT_PLAN_ID = 'pessoal';

function fallbackFreePlanId(currentPlanId) {
  const tier = PLAN_ID_TO_PLAN[currentPlanId] || PLANS.pessoal;
  if (tier === PLANS.empresa) return 'emp_free';
  if (tier === PLANS.pessoal_empresa) return 'pe_free';
  return 'pessoal';
}

export { PLANS };

const PlanContext = createContext(undefined);

export function PlanProvider({ children }) {
  const { user } = useAuth();
  const [planId, setPlanId] = useState(DEFAULT_PLAN_ID);
  const [viewMode, setViewMode] = useState('pessoal');
  const [loaded, setLoaded] = useState(false);

  const storageKey = `${PLAN_STORAGE_BASE}_${user?.id || 'guest'}`;
  const plan = PLAN_ID_TO_PLAN[planId] || PLANS.pessoal;

  useEffect(() => {
    setLoaded(false);
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.planId && PLAN_ID_TO_PLAN[data.planId]) setPlanId(data.planId);
          else if (data.plan && data.plan === PLANS.pessoal_empresa) setPlanId('pe_free');
          else if (data.plan && data.plan === PLANS.empresa) setPlanId('emp_free');
          if (data.viewMode) setViewMode(data.viewMode);
        }
        if (user?.id) {
          const sub = await getUserSubscription(supabase, user.id);
          if (isPaidSubscriptionActive(sub) && sub?.plan && PLAN_ID_TO_PLAN[sub.plan]) {
            setPlanId(sub.plan);
          } else {
            setPlanId((prev) => {
              if (!prev) return 'pessoal';
              const isPaid = !['pessoal', 'pessoal_free', 'pe_free', 'emp_free'].includes(prev);
              return isPaid ? fallbackFreePlanId(prev) : prev;
            });
          }
        }
      } catch (_) {}
      setLoaded(true);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (plan === PLANS.pessoal && viewMode === 'empresa') setViewMode('pessoal');
  }, [plan]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(storageKey, JSON.stringify({ planId, plan, viewMode }));
  }, [loaded, planId, plan, viewMode, storageKey]);

  const isEmpresa = plan === PLANS.empresa || plan === PLANS.pessoal_empresa;
  const showEmpresaFeatures = isEmpresa;
  const canToggleView = isEmpresa;
  const planLabel = PLAN_LABELS[planId] || PLAN_LABELS.pessoal;
  const canUseCustomColors = PLAN_IDS_CUSTOM_COLORS.includes(planId);
  const planFeatures = getPlanFeatures(planId);

  return (
    <PlanContext.Provider
      value={{
        planId,
        setPlanId,
        plan,
        setPlan: (p) => {
          if (p === PLANS.pessoal) setPlanId('pessoal');
          else if (p === PLANS.pessoal_empresa) setPlanId('pe_free');
          else if (p === PLANS.empresa) setPlanId('emp_free');
        },
        viewMode,
        setViewMode,
        isEmpresa,
        showEmpresaFeatures,
        canToggleView,
        planLabel,
        canUseCustomColors,
        planFeatures,
        PLANS,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    return {
      planId: DEFAULT_PLAN_ID,
      setPlanId: () => {},
      planLabel: 'Básico (Grátis)',
      canUseCustomColors: false,
      plan: PLANS.pessoal,
      setPlan: () => {},
      viewMode: 'pessoal',
      setViewMode: () => {},
      isEmpresa: false,
      showEmpresaFeatures: false,
      canToggleView: false,
      planLabel: PLAN_LABELS.pessoal,
      canUseCustomColors: false,
      planFeatures: getPlanFeatures(DEFAULT_PLAN_ID),
      PLANS,
    };
  }
  return ctx;
}
