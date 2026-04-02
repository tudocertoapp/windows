import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, Alert, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan, PLANS } from '../contexts/PlanContext';
import { TopBar } from '../components/TopBar';
import { playTapSound } from '../utils/sounds';
import { supabase } from '../lib/supabase';
import { handleSubscribe, getUserSubscription, hasActiveBusinessSubscription } from '../lib/subscription';

const CATEGORIAS = [
  { id: 'pessoal', label: 'Pessoal', icon: 'person-outline' },
  { id: 'empresa', label: 'Empresa', icon: 'business-outline' },
  { id: 'pessoal_empresa', label: 'Pessoal + Empresa', icon: 'business-outline' },
];

const PLANOS = {
  pessoal: [
    { id: 'pessoal', nome: 'Básico', preco: 'Grátis', desc: ['Transações ilimitadas', 'Gráficos e relatórios', '2 cores no tema'], popular: false, cta: 'Plano atual' },
    { id: 'pessoal_plus', nome: 'Plus', preco: 'R$ 9,90/mês', desc: ['Tudo do Básico', 'Cores personalizadas', 'Criar cores favoritas', 'Suporte prioritário'], popular: true, cta: 'Começar agora' },
    { id: 'pessoal_premium', nome: 'Premium', preco: 'R$ 14,90/mês', desc: ['Tudo do Plus', 'Exportar relatórios', 'Backup em nuvem', 'Sem anúncios'], popular: false, cta: 'Assinar' },
  ],
  pessoal_empresa: [
    { id: 'pe_starter', nome: 'Starter', preco: 'R$ 19,90/mês', desc: ['Separação pessoal/empresa', 'CRM com clientes', 'Produtos e serviços', 'Até 50 cadastros'], popular: false, cta: 'Escolher' },
    { id: 'pe_pro', nome: 'Pro', preco: 'R$ 29,90/mês', desc: ['Tudo do Starter', 'Clientes e fornecedores', 'Boletos e a receber', 'Até 200 cadastros'], popular: true, cta: 'Mais popular' },
    { id: 'pe_business', nome: 'Business', preco: 'R$ 39,90/mês', desc: ['Tudo do Pro', 'Fornecedores', 'Relatórios avançados', 'Cadastros ilimitados'], popular: false, cta: 'Para crescer' },
  ],
  empresa: [
    { id: 'emp_small', nome: 'Small', preco: 'R$ 49,90/mês', desc: ['Múltiplos usuários', 'Gestão completa', 'Integração bancária', 'Até 5 usuários'], popular: false, cta: 'Para pequenas' },
    { id: 'emp_medium', nome: 'Medium', preco: 'R$ 89,90/mês', desc: ['Tudo do Small', 'Até 15 usuários', 'API de integração', 'Suporte dedicado'], popular: true, cta: 'Recomendado' },
    { id: 'emp_enterprise', nome: 'Enterprise', preco: 'Sob consulta', desc: ['Usuários ilimitados', 'Personalização total', 'Treinamento incluído', 'SLA garantido'], popular: false, cta: 'Falar com vendas' },
  ],
};

const MAP_ID_TO_PLAN = {
  pessoal: PLANS.pessoal,
  pessoal_plus: PLANS.pessoal,
  pessoal_premium: PLANS.pessoal,
  pe_starter: PLANS.pessoal_empresa,
  pe_pro: PLANS.pessoal_empresa,
  pe_business: PLANS.pessoal_empresa,
  emp_small: PLANS.empresa,
  emp_medium: PLANS.empresa,
  emp_enterprise: PLANS.empresa,
};

const MENSAGENS_UPGRADE = {
  pessoal: 'Dê um upgrade na sua experiência! Desbloqueie cores personalizadas e recursos exclusivos.',
  pessoal_empresa: 'Escale seu negócio! Gerencie pessoal e empresa no mesmo app com muito mais recursos.',
  empresa: 'Potencialize sua empresa! Múltiplos usuários, integrações e suporte especializado.',
};

const as = StyleSheet.create({
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 20, gap: 8 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', gap: 4 },
  tabLabel: { fontSize: 12, fontWeight: '600' },
  card: { borderRadius: 20, padding: 24, marginHorizontal: 16, marginBottom: 16, borderWidth: 2 },
  popular: { borderColor: '#10b981' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  preco: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  badge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  ctaBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  upgradeBanner: { marginHorizontal: 16, marginBottom: 20, padding: 20, borderRadius: 16, borderWidth: 1 },
  upgradeTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  upgradeText: { fontSize: 14, lineHeight: 22 },
});

export function AssinaturaScreen({ onClose, isModal }) {
  const { colors } = useTheme();
  const { planId, setPlanId, plan } = usePlan();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [businessSub, setBusinessSub] = useState(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState(plan === PLANS.empresa ? 'empresa' : plan === PLANS.pessoal_empresa ? 'pessoal_empresa' : 'pessoal');

  const planosCategoria = PLANOS[categoriaAtiva];
  const mensagemUpgrade = MENSAGENS_UPGRADE[categoriaAtiva];
  const isPlanoGratuito = planId === 'pessoal';

  useEffect(() => {
    if (['pe_starter', 'pe_pro', 'pe_business'].includes(planId)) setCategoriaAtiva('pessoal_empresa');
    else if (['emp_small', 'emp_medium', 'emp_enterprise'].includes(planId)) setCategoriaAtiva('empresa');
    else if (['pessoal', 'pessoal_plus', 'pessoal_premium'].includes(planId)) setCategoriaAtiva('pessoal');
  }, [planId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const row = await getUserSubscription(supabase, user.id);
      if (!cancelled) setBusinessSub(row);
    })();
    return () => { cancelled = true; };
  }, [planId]);

  const handleSelecionar = (planoId) => {
    playTapSound();
    if (planoId === 'pe_business' && !hasActiveBusinessSubscription(businessSub)) return;
    if (MAP_ID_TO_PLAN[planoId]) setPlanId(planoId);
  };

  const handleBusinessSubscribe = async () => {
    playTapSound();
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    try {
      await handleSubscribe(supabase);
    } catch (e) {
      const msg = e?.message || String(e);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('Checkout', msg);
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {isModal && onClose ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, backgroundColor: colors.card, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Planos</Text>
          <TouchableOpacity onPress={() => { playTapSound(); onClose(); }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TopBar title="Planos" colors={colors} />
      )}
      <ScrollView showsVerticalScrollIndicator={false} style={{ paddingTop: 16 }}>
        {isPlanoGratuito && (
          <View style={[as.upgradeBanner, { backgroundColor: colors.primaryRgba(0.08), borderColor: colors.primary + '50' }]}>
            <Text style={[as.upgradeTitle, { color: colors.primary }]}>✨ Atualize e desbloqueie mais</Text>
            <Text style={[as.upgradeText, { color: colors.text }]}>
              Você está no plano gratuito. Faça upgrade para cores personalizadas, gestão empresarial e muito mais. Escolha o plano ideal abaixo!
            </Text>
          </View>
        )}

        <View style={as.tabRow}>
          {CATEGORIAS.map((cat) => {
            const ativo = categoriaAtiva === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[as.tab, { backgroundColor: ativo ? colors.primaryRgba(0.2) : colors.card, borderWidth: ativo ? 2 : 1, borderColor: ativo ? colors.primary : colors.border }]}
                onPress={() => { playTapSound(); setCategoriaAtiva(cat.id); }}
              >
                <Ionicons name={cat.icon} size={20} color={ativo ? colors.primary : colors.textSecondary} />
                <Text style={[as.tabLabel, { color: ativo ? colors.primary : colors.textSecondary }]} numberOfLines={1}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[as.upgradeBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[as.upgradeText, { color: colors.text }]}>{mensagemUpgrade}</Text>
        </View>

        {planosCategoria.map((p) => {
          const isGratis = p.preco === 'Grátis';
          const isSelected =
            p.id === 'pe_business'
              ? planId === 'pe_business' && hasActiveBusinessSubscription(businessSub)
              : planId === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[
                as.card,
                { backgroundColor: colors.card, borderColor: p.popular ? colors.primary : isSelected ? colors.primary + '80' : colors.border },
              ]}
              onPress={() => handleSelecionar(p.id)}
            >
              {p.popular && (
                <View style={[as.badge, { backgroundColor: colors.primary }]}>
                  <Text style={as.badgeText}>MAIS POPULAR</Text>
                </View>
              )}
              {isSelected && !p.popular && (
                <View style={[as.badge, { backgroundColor: colors.textSecondary }]}>
                  <Text style={as.badgeText}>ATUAL</Text>
                </View>
              )}
              <Text style={[as.title, { color: colors.text }]}>{p.nome}</Text>
              <Text style={[as.preco, { color: colors.primary }]}>{p.preco}</Text>
              {p.desc.map((d, i) => (
                <View key={i} style={as.item}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  <Text style={{ fontSize: 14, color: colors.text }}>{d}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={[as.ctaBtn, { backgroundColor: isSelected ? colors.border : (isGratis ? colors.border : colors.primary) }]}
                disabled={checkoutLoading && p.id === 'pe_business'}
                onPress={() => {
                  if (p.id === 'pe_business' && !isSelected && !isGratis) {
                    handleBusinessSubscribe();
                    return;
                  }
                  handleSelecionar(p.id);
                }}
              >
                {checkoutLoading && p.id === 'pe_business' && !isSelected && !isGratis ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: '700', color: isSelected ? colors.textSecondary : (isGratis ? colors.textSecondary : '#fff') }}>
                    {isSelected ? 'Plano atual' : (isGratis ? p.cta : 'Selecionar plano')}
                  </Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
