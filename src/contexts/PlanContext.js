import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import {
  PLANS,
  PLAN_ID_TO_PLAN,
  PLAN_LABELS,
  PLAN_IDS_CUSTOM_COLORS,
  planTierIncludesEmpresaModule,
} from '../constants/plans';

const PLAN_STORAGE_BASE = '@tudocerto_plan';
const DEFAULT_PLAN_ID = 'pessoal';

export { PLANS };

const PlanContext = createContext(undefined);

export function PlanProvider({ children }) {
  const { user } = useAuth();
  const [planId, setPlanId] = useState(DEFAULT_PLAN_ID);
  const [viewMode, setViewMode] = useState('pessoal');
  const [loaded, setLoaded] = useState(false);

  const storageKey = `${PLAN_STORAGE_BASE}_${user?.id || 'guest'}`;
  const plan = PLAN_ID_TO_PLAN[planId] || PLANS.pessoal;
  const metadata = user?.user_metadata || {};

  const mapLegacyPlanToPlanId = (legacyPlan) => {
    if (legacyPlan === PLANS.pessoal_empresa) return 'pe_starter';
    if (legacyPlan === PLANS.empresa) return 'emp_small';
    return null;
  };

  useEffect(() => {
    setLoaded(false);
    (async () => {
      try {
        let nextPlanId = DEFAULT_PLAN_ID;
        let nextViewMode = 'pessoal';

        // 1) Prioridade: plano salvo na conta (Supabase Auth metadata)
        const metadataPlanId = metadata.plan_id || metadata.planId;
        const metadataLegacyPlanId = mapLegacyPlanToPlanId(metadata.plan);
        const resolvedMetadataPlanId = metadataPlanId || metadataLegacyPlanId;
        if (resolvedMetadataPlanId && PLAN_ID_TO_PLAN[resolvedMetadataPlanId]) {
          nextPlanId = resolvedMetadataPlanId;
        }

        const metadataViewMode = metadata.view_mode || metadata.viewMode;
        if (metadataViewMode === 'pessoal' || metadataViewMode === 'empresa') {
          nextViewMode = metadataViewMode;
        }

        // 2) Fallback: armazenamento local por usuário/dispositivo
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const data = JSON.parse(raw);
          if (!resolvedMetadataPlanId) {
            const localLegacyPlanId = mapLegacyPlanToPlanId(data.plan);
            const resolvedLocalPlanId = data.planId || localLegacyPlanId;
            if (resolvedLocalPlanId && PLAN_ID_TO_PLAN[resolvedLocalPlanId]) {
              nextPlanId = resolvedLocalPlanId;
            }
          }
          if (!metadataViewMode && (data.viewMode === 'pessoal' || data.viewMode === 'empresa')) {
            nextViewMode = data.viewMode;
          }
        }

        setPlanId(nextPlanId);
        setViewMode(nextViewMode);
      } catch (_) {}
      setLoaded(true);
    })();
  }, [user?.id, metadata.plan_id, metadata.planId, metadata.plan, metadata.view_mode, metadata.viewMode]);

  useEffect(() => {
    if (plan === PLANS.pessoal && viewMode === 'empresa') setViewMode('pessoal');
  }, [plan]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(storageKey, JSON.stringify({ planId, plan, viewMode }));
  }, [loaded, planId, plan, viewMode, storageKey]);

  useEffect(() => {
    if (!loaded || !user?.id) return;
    const currentMeta = metadata || {};
    const currentPlanId = currentMeta.plan_id || currentMeta.planId;
    const currentViewMode = currentMeta.view_mode || currentMeta.viewMode;
    const currentPlan = currentMeta.plan;

    if (currentPlanId === planId && currentViewMode === viewMode && currentPlan === plan) return;

    (async () => {
      try {
        await supabase.auth.updateUser({
          data: {
            ...currentMeta,
            plan_id: planId,
            plan,
            view_mode: viewMode,
          },
        });
      } catch (err) {
        console.warn('[PlanContext] Falha ao salvar plano na conta:', err?.message || err);
      }
    })();
  }, [loaded, user?.id, metadata, planId, plan, viewMode]);

  const isEmpresa = planTierIncludesEmpresaModule(plan);
  const showEmpresaFeatures = isEmpresa;
  const canToggleView = isEmpresa;
  const planLabel = PLAN_LABELS[planId] || PLAN_LABELS.pessoal;
  const canUseCustomColors = PLAN_IDS_CUSTOM_COLORS.includes(planId);

  return (
    <PlanContext.Provider
      value={{
        planId,
        setPlanId,
        plan,
        setPlan: (p) => {
          if (p === PLANS.pessoal) setPlanId('pessoal');
          else if (p === PLANS.pessoal_empresa) setPlanId('pe_starter');
          else if (p === PLANS.empresa) setPlanId('emp_small');
        },
        viewMode,
        setViewMode,
        isEmpresa,
        showEmpresaFeatures,
        canToggleView,
        planLabel,
        canUseCustomColors,
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
      PLANS,
    };
  }
  return ctx;
}
