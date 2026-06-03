import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { PLANS, PLAN_ID_TO_PLAN, PLAN_LABELS, PLAN_IDS_CUSTOM_COLORS } from '../constants/plans';
import { getPlanFeatures } from '../constants/planFeatures';
import { supabase } from '../lib/supabase';
import {
  getUserSubscription,
  getStripeCheckoutSessionIdFromUrl,
  isPaidSubscriptionActive,
  isSubscriptionPastDue,
  syncSubscriptionFromStripe,
} from '../lib/subscription';

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
  const [subscription, setSubscription] = useState(null);

  const storageKey = `${PLAN_STORAGE_BASE}_${user?.id || 'guest'}`;

  const subscriptionPastDue = isSubscriptionPastDue(subscription);
  const hasPaidPlanAccess = isPaidSubscriptionActive(subscription);
  const subscribedPlanId = subscriptionPastDue ? subscription?.plan || null : null;
  const subscribedPlanLabel = subscribedPlanId ? (PLAN_LABELS[subscribedPlanId] || subscribedPlanId) : null;

  const effectivePlanId = useMemo(() => {
    if (hasPaidPlanAccess && subscription?.plan) return subscription.plan;
    if (subscriptionPastDue && subscription?.plan) return fallbackFreePlanId(subscription.plan);
    return planId;
  }, [hasPaidPlanAccess, subscriptionPastDue, subscription?.plan, planId]);

  const plan = PLAN_ID_TO_PLAN[effectivePlanId] || PLANS.pessoal;

  const applySubscriptionToPlan = useCallback((sub) => {
    setSubscription(sub);
    if (isPaidSubscriptionActive(sub) && sub?.plan && PLAN_ID_TO_PLAN[sub.plan]) {
      setPlanId(sub.plan);
      return;
    }
    if (isSubscriptionPastDue(sub) && sub?.plan) {
      setPlanId(fallbackFreePlanId(sub.plan));
      return;
    }
    setPlanId((prev) => {
      if (!prev) return 'pessoal';
      const isPaid = !['pessoal', 'pessoal_free', 'pe_free', 'emp_free'].includes(prev);
      return isPaid ? fallbackFreePlanId(prev) : prev;
    });
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!user?.id) {
      setSubscription(null);
      return null;
    }
    const sub = await getUserSubscription(supabase, user.id);
    applySubscriptionToPlan(sub);
    return sub;
  }, [user?.id, applySubscriptionToPlan]);

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
          applySubscriptionToPlan(sub);
        } else {
          setSubscription(null);
        }
      } catch (_) {}
      setLoaded(true);
    })();
  }, [user?.id, storageKey, applySubscriptionToPlan]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshSubscription().catch(() => {});
    });
    return () => sub?.remove?.();
  }, [user?.id, refreshSubscription]);

  /** Após pagamento no Stripe (web): sincroniza antes de limpar a URL. */
  useEffect(() => {
    if (!user?.id) return undefined;
    const sessionId = getStripeCheckoutSessionIdFromUrl();
    const path =
      typeof window !== 'undefined'
        ? (window.location.pathname || '/').replace(/\/$/, '') || '/'
        : '';
    const onSuccessPath = path === '/sucesso';
    if (!sessionId && !onSuccessPath) return undefined;

    let cancelled = false;
    (async () => {
      try {
        await syncSubscriptionFromStripe(supabase, { sessionId });
        if (!cancelled) await refreshSubscription();
      } catch (e) {
        console.warn('[PlanContext] sync pós-checkout:', e?.message || e);
      } finally {
        if (typeof window !== 'undefined' && !cancelled) {
          window.history.replaceState({}, '', '/');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshSubscription]);

  useEffect(() => {
    if (plan === PLANS.pessoal && viewMode === 'empresa') setViewMode('pessoal');
  }, [plan]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(storageKey, JSON.stringify({ planId: effectivePlanId, plan, viewMode }));
  }, [loaded, effectivePlanId, plan, viewMode, storageKey]);

  const isEmpresa = plan === PLANS.empresa || plan === PLANS.pessoal_empresa;
  const showEmpresaFeatures = isEmpresa;
  const canToggleView = isEmpresa;
  const planLabel = PLAN_LABELS[effectivePlanId] || PLAN_LABELS.pessoal;
  const canUseCustomColors = hasPaidPlanAccess && PLAN_IDS_CUSTOM_COLORS.includes(subscription?.plan || effectivePlanId);
  const planFeatures = getPlanFeatures(effectivePlanId);

  return (
    <PlanContext.Provider
      value={{
        planId: effectivePlanId,
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
        subscription,
        subscriptionPastDue,
        subscribedPlanId,
        subscribedPlanLabel,
        hasPaidPlanAccess,
        refreshSubscription,
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
      planFeatures: getPlanFeatures(DEFAULT_PLAN_ID),
      subscription: null,
      subscriptionPastDue: false,
      subscribedPlanId: null,
      subscribedPlanLabel: null,
      hasPaidPlanAccess: false,
      refreshSubscription: async () => null,
      PLANS,
    };
  }
  return ctx;
}
