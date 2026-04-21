import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan, PLANS } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import { TopBar } from '../components/TopBar';
import { playTapSound } from '../utils/sounds';

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

function mapDeleteAccountError(err) {
  const code = String(err?.code || err?.details || '');
  const msg = String(err?.message || err || '').toLowerCase();
  if (msg.includes('plan_not_free') || code.includes('P0001')) {
    return 'Só é possível excluir a conta no plano Básico (grátis). Cancele o plano pago acima e volte ao Básico.';
  }
  if (msg.includes('not_authenticated') || msg.includes('28000')) {
    return 'Sessão inválida. Entre de novo e tente outra vez.';
  }
  if (
    msg.includes('delete_my_account') ||
    msg.includes('function') ||
    msg.includes('does not exist') ||
    msg.includes('pgrst202')
  ) {
    return 'Função de exclusão não configurada no Supabase. Execute o ficheiro supabase-delete-my-account.sql no painel SQL.';
  }
  return err?.message || 'Não foi possível excluir a conta. Tente mais tarde.';
}

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
  dangerZone: { marginHorizontal: 16, marginTop: 8, marginBottom: 24, padding: 20, borderRadius: 16, borderWidth: 1 },
  dangerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  dangerText: { fontSize: 14, lineHeight: 22, marginBottom: 14 },
  dangerBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  mutedBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 8, borderWidth: 1 },
});

export function AssinaturaScreen({ onClose, isModal }) {
  const { colors } = useTheme();
  const { user, deleteAccount } = useAuth();
  const { planId, setPlanId, plan } = usePlan();
  const [categoriaAtiva, setCategoriaAtiva] = useState(plan === PLANS.empresa ? 'empresa' : plan === PLANS.pessoal_empresa ? 'pessoal_empresa' : 'pessoal');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const planosCategoria = PLANOS[categoriaAtiva];
  const mensagemUpgrade = MENSAGENS_UPGRADE[categoriaAtiva];
  const isPlanoGratuito = planId === 'pessoal';

  useEffect(() => {
    if (['pe_starter', 'pe_pro', 'pe_business'].includes(planId)) setCategoriaAtiva('pessoal_empresa');
    else if (['emp_small', 'emp_medium', 'emp_enterprise'].includes(planId)) setCategoriaAtiva('empresa');
    else if (['pessoal', 'pessoal_plus', 'pessoal_premium'].includes(planId)) setCategoriaAtiva('pessoal');
  }, [planId]);

  const handleSelecionar = (planoId) => {
    playTapSound();
    if (MAP_ID_TO_PLAN[planoId]) setPlanId(planoId);
  };

  const voltarPlanoGratis = useCallback(() => {
    playTapSound();
    setPlanId('pessoal');
    setCategoriaAtiva('pessoal');
    Alert.alert(
      'Plano Básico',
      'O plano foi alterado para Básico (grátis). Quando a alteração estiver sincronizada com a conta, pode excluir a conta abaixo.',
      [{ text: 'OK' }]
    );
  }, [setPlanId]);

  const runDeleteAccount = useCallback(async () => {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      onClose?.();
    } catch (e) {
      Alert.alert('Erro', mapDeleteAccountError(e));
    } finally {
      setDeletingAccount(false);
    }
  }, [deleteAccount, onClose]);

  const confirmarExcluirConta = useCallback(() => {
    if (!user?.id) {
      Alert.alert('Conta', 'Inicie sessão para gerir a conta.');
      return;
    }
    if (!isPlanoGratuito) {
      Alert.alert(
        'Plano ativo',
        'Para excluir a conta, primeiro tem de cancelar o plano pago: escolha o plano Básico (Grátis) na categoria Pessoal. Depois pode usar «Excluir conta».'
      );
      return;
    }
    const titulo = 'Excluir conta';
    const texto =
      'Isto apaga permanentemente a sua conta e os dados associados no servidor. Não pode ser anulado. Continuar?';
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(`${titulo}\n\n${texto}`)) {
        void runDeleteAccount();
      }
      return;
    }
    Alert.alert(titulo, texto, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir para sempre', style: 'destructive', onPress: () => void runDeleteAccount() },
    ]);
  }, [user?.id, isPlanoGratuito, runDeleteAccount]);

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
                onPress={() => handleSelecionar(p.id)}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: isSelected ? colors.textSecondary : (isGratis ? colors.textSecondary : '#fff') }}>
                  {isSelected ? 'Plano atual' : (isGratis ? p.cta : 'Selecionar plano')}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        {user?.id ? (
          <View style={[as.dangerZone, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[as.dangerTitle, { color: colors.text }]}>Zona de perigo</Text>
            {!isPlanoGratuito ? (
              <>
                <Text style={[as.dangerText, { color: colors.textSecondary }]}>
                  Com um plano pago ativo não pode excluir a conta. Cancele o plano: volte ao **Básico (Grátis)** na
                  categoria Pessoal e confirme. Depois disso, o botão «Excluir conta» fica disponível.
                </Text>
                <TouchableOpacity
                  style={[as.mutedBtn, { borderColor: colors.primary, backgroundColor: colors.primaryRgba(0.08) }]}
                  onPress={voltarPlanoGratis}
                  accessibilityLabel="Voltar ao plano Básico grátis"
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>Voltar ao plano Básico (grátis)</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={[as.dangerText, { color: colors.textSecondary }]}>
                A exclusão remove a conta no Supabase e os dados associados (conforme as regras da base de dados). Esta
                ação não pode ser desfeita.
              </Text>
            )}
            <TouchableOpacity
              style={[
                as.dangerBtn,
                {
                  backgroundColor: isPlanoGratuito && !deletingAccount ? '#dc2626' : colors.border,
                  opacity: deletingAccount ? 0.85 : 1,
                },
              ]}
              onPress={() => {
                playTapSound();
                confirmarExcluirConta();
              }}
              disabled={!isPlanoGratuito || deletingAccount}
              accessibilityLabel="Excluir conta"
            >
              {deletingAccount ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '700', color: isPlanoGratuito ? '#fff' : colors.textSecondary }}>
                  Excluir conta
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
