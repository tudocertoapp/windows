import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, Alert, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan, PLANS } from '../contexts/PlanContext';
import { TopBar } from '../components/TopBar';
import { playTapSound } from '../utils/sounds';
import { supabase } from '../lib/supabase';
import { getUserSubscription, handleSubscribe, isPaidSubscriptionActive } from '../lib/subscription';

const CATEGORIAS = [
  { id: 'pessoal', label: 'Pessoal', icon: 'person-outline' },
  { id: 'empresa', label: 'Empresa', icon: 'business-outline' },
  { id: 'pessoal_empresa', label: 'Pessoal + Empresa', icon: 'business-outline' },
];

const PLANOS = {
  pessoal: [
    { id: 'pessoal', nome: 'Free', preco: 'Grátis', desc: ['Agenda até 10/mês e tarefas 20/mês', 'Até 2 aniversariantes e 5 anotações', 'Sem produtos, serviços e vendas'], popular: false, cta: 'Plano atual' },
    { id: 'pessoal_plus', nome: 'Plus', preco: 'R$ 12,90/mês', desc: ['Sem vendas e sem cadastro de produto/serviço', 'Meus Gastos liberado', 'Até 2 notas por dia'], popular: true, cta: 'Assinar Plus' },
    { id: 'pessoal_premium', nome: 'Premium', preco: 'R$ 17,90/mês', desc: ['Sem vendas e sem cadastro de produto/serviço', 'Meus Gastos liberado', 'Até 4 notas por dia'], popular: false, cta: 'Assinar Premium' },
    { id: 'pessoal_pro', nome: 'Pro', preco: 'R$ 24,90/mês', desc: ['Sem vendas e sem cadastro de produto/serviço', 'Meus Gastos liberado', 'Até 10 notas por dia'], popular: false, cta: 'Assinar Pro' },
  ],
  pessoal_empresa: [
    { id: 'pe_free', nome: 'Free', preco: 'Grátis', desc: ['Pessoal + Empresa no mesmo app', 'PDV liberado', 'Até 5 produtos e 5 serviços'], popular: false, cta: 'Plano atual' },
    { id: 'pe_teste_real', nome: 'Teste Real', preco: 'R$ 1,00/mês', desc: ['Plano de teste para cobrança real', 'Ativa Pessoal + Empresa', 'Use para validar pós-pagamento'], popular: false, cta: 'Testar pagamento' },
    { id: 'pe_starter', nome: 'Starter', preco: 'R$ 44,90/mês', desc: ['Até 80 produtos e 80 serviços', 'PDV e vendas', 'Até 2 notas por dia'], popular: false, cta: 'Assinar Starter' },
    { id: 'pe_pro', nome: 'Pro', preco: 'R$ 64,90/mês', desc: ['Até 400 produtos e 400 serviços', 'Relatórios empresariais', 'Até 4 notas por dia'], popular: true, cta: 'Assinar Pro' },
    { id: 'pe_business', nome: 'Business', preco: 'R$ 99,90/mês', desc: ['Sem limite de produtos/serviços', 'Equipe e escala', 'Até 10 notas por dia'], popular: false, cta: 'Assinar Business' },
  ],
  empresa: [
    { id: 'emp_free', nome: 'Free', preco: 'Grátis', desc: ['PDV disponível', 'Até 5 produtos e 5 serviços', 'Gestão empresarial essencial'], popular: false, cta: 'Plano atual' },
    { id: 'emp_small', nome: 'Small', preco: 'R$ 39,90/mês', desc: ['Até 80 produtos e 80 serviços', 'PDV completo', 'Até 2 notas por dia'], popular: false, cta: 'Assinar Small' },
    { id: 'emp_medium', nome: 'Medium', preco: 'R$ 59,90/mês', desc: ['Até 400 produtos e 400 serviços', 'PDV + equipe', 'Até 4 notas por dia'], popular: true, cta: 'Assinar Medium' },
    { id: 'emp_enterprise', nome: 'Enterprise', preco: 'R$ 94,90/mês', desc: ['Sem limite de produtos/serviços', 'Operação completa', 'Até 10 notas por dia'], popular: false, cta: 'Assinar Enterprise' },
  ],
};

const MAP_ID_TO_PLAN = {
  pessoal: PLANS.pessoal,
  pessoal_free: PLANS.pessoal,
  pessoal_plus: PLANS.pessoal,
  pessoal_premium: PLANS.pessoal,
  pessoal_pro: PLANS.pessoal,
  pe_free: PLANS.pessoal_empresa,
  pe_teste_real: PLANS.pessoal_empresa,
  pe_starter: PLANS.pessoal_empresa,
  pe_pro: PLANS.pessoal_empresa,
  pe_business: PLANS.pessoal_empresa,
  emp_free: PLANS.empresa,
  emp_small: PLANS.empresa,
  emp_medium: PLANS.empresa,
  emp_enterprise: PLANS.empresa,
};

const MENSAGENS_UPGRADE = {
  pessoal: 'Dê um upgrade na sua experiência! Desbloqueie cores personalizadas e recursos exclusivos.',
  pessoal_empresa: 'Escale seu negócio! Gerencie pessoal e empresa no mesmo app com muito mais recursos.',
  empresa: 'Potencialize sua empresa! Múltiplos usuários, integrações e suporte especializado.',
};

const STRIPE_CHECKOUT_PLAN_IDS = new Set([
  'pessoal_plus',
  'pessoal_premium',
  'pessoal_pro',
  'pe_teste_real',
  'pe_starter',
  'pe_pro',
  'pe_business',
  'emp_small',
  'emp_medium',
  'emp_enterprise',
]);

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
  const [checkoutLoadingPlanId, setCheckoutLoadingPlanId] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState(plan === PLANS.empresa ? 'empresa' : plan === PLANS.pessoal_empresa ? 'pessoal_empresa' : 'pessoal');

  const planosCategoria = PLANOS[categoriaAtiva];
  const mensagemUpgrade = MENSAGENS_UPGRADE[categoriaAtiva];
  const isPlanoGratuito = ['pessoal', 'pessoal_free', 'pe_free', 'emp_free'].includes(planId);

  useEffect(() => {
    if (['pe_free', 'pe_teste_real', 'pe_starter', 'pe_pro', 'pe_business'].includes(planId)) setCategoriaAtiva('pessoal_empresa');
    else if (['emp_free', 'emp_small', 'emp_medium', 'emp_enterprise'].includes(planId)) setCategoriaAtiva('empresa');
    else if (['pessoal', 'pessoal_free', 'pessoal_plus', 'pessoal_premium', 'pessoal_pro'].includes(planId)) setCategoriaAtiva('pessoal');
  }, [planId]);

  const handleSelecionar = (planoId) => {
    playTapSound();
    if (MAP_ID_TO_PLAN[planoId]) setPlanId(planoId);
  };

  const handlePlanSubscribe = async (selectedPlanId) => {
    playTapSound();
    if (checkoutLoadingPlanId) return;
    setCheckoutLoadingPlanId(selectedPlanId);
    try {
      await handleSubscribe(supabase, selectedPlanId);
    } catch (e) {
      const msg = e?.message || String(e);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('Checkout', msg);
      }
    } finally {
      setCheckoutLoadingPlanId('');
    }
  };

  const handlePlanoPress = async (plano) => {
    const isGratis = plano.preco === 'Grátis';
    const isSelected = planId === plano.id;

    if (checkoutLoadingPlanId) return;

    if (!isGratis && STRIPE_CHECKOUT_PLAN_IDS.has(plano.id)) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          Alert.alert('Login necessário', 'Entre com a mesma conta usada na compra para restaurar o plano.');
          return;
        }
        const sub = await getUserSubscription(supabase, user.id);
        const alreadyActive = isPaidSubscriptionActive(sub) && sub?.plan === plano.id;
        if (alreadyActive) {
          handleSelecionar(plano.id);
          return;
        }
        if (plano.id === 'pe_teste_real') {
          Alert.alert(
            'Plano de teste',
            'Não encontramos assinatura ativa deste plano nesta conta. Se você já pagou com esta conta, toque em Restaurar. Caso contrário, toque em Pagar.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Restaurar', onPress: () => handleSelecionar('pe_teste_real') },
              { text: 'Pagar', onPress: () => handlePlanSubscribe(plano.id) },
            ]
          );
          return;
        }
      } catch (_) {
        // se falhar leitura da assinatura, segue fluxo normal para checkout
      }
    }

    if (!isGratis && STRIPE_CHECKOUT_PLAN_IDS.has(plano.id)) {
      handlePlanSubscribe(plano.id);
      return;
    }

    handleSelecionar(plano.id);
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
          const isSelected = planId === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[
                as.card,
                { backgroundColor: colors.card, borderColor: p.popular ? colors.primary : isSelected ? colors.primary + '80' : colors.border },
              ]}
              onPress={() => handlePlanoPress(p)}
              activeOpacity={0.9}
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
              <View
                style={[as.ctaBtn, { backgroundColor: isSelected ? colors.border : (isGratis ? colors.border : colors.primary) }]}
              >
                {checkoutLoadingPlanId === p.id && !isSelected && !isGratis ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: '700', color: isSelected ? colors.textSecondary : (isGratis ? colors.textSecondary : '#fff') }}>
                    {isSelected ? 'Plano atual' : (isGratis ? p.cta : 'Selecionar plano')}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
