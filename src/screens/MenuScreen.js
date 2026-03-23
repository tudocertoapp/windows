import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppIcon } from '../components/AppIcon';
import { GlassCard } from '../components/GlassCard';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { topBarStyles } from '../components/TopBar';
import { playTapSound } from '../utils/sounds';
import { Image } from 'react-native';

const logoImage = require('../../assets/logo.png');

const ms = StyleSheet.create({
  profileSection: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16, borderBottomWidth: 1 },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  profileName: { fontSize: 18, fontWeight: '700' },
  profileSub: { fontSize: 13, marginTop: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  sectionCard: { marginHorizontal: 16, marginTop: 4, borderRadius: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, gap: 12 },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '500' },
  menuSub: { fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  logoHeader: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, paddingTop: 36, borderBottomWidth: 1 },
  logoLarge: { width: 96, height: 96 },
  appTitle: { fontSize: 26, fontWeight: '800', letterSpacing: 0.5, marginTop: 6 },
  dropdownHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
});

export function MenuScreen({ navigation, onClose, onNavigateToTab, onOpenCadastro, onOpenPerfil, onOpenAssinatura, onOpenIndique, onOpenAReceber, onOpenClientes, onOpenBancos, onOpenOrcamento, onOpenAnotacoes, onOpenMeusGastos, onOpenListaCompras, onOpenMetasSonhos, onOpenMensagensWhatsApp, onOpenImageGenerator, onOpenTemas, onOpenTermos, onOpenCalculadoraFull, onOpenOrdemServico, onOpenOrcamentos, onOpenPDV, onOpenEmpresa, compact }) {
  const { clients, products, services, boletos, checkListItems, suppliers } = useFinance();
  const { colors } = useTheme();
  const { showEmpresaFeatures, planLabel, planId } = usePlan();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const [photoError, setPhotoError] = useState(false);
  const [empresaDropdownOpen, setEmpresaDropdownOpen] = useState(false);
  const isModal = Boolean(onClose);
  const isWeb = typeof window !== 'undefined';
  const isCompact = compact ?? (isWeb && !isModal);

  useEffect(() => {
    setPhotoError(false);
  }, [profile?.foto]);
  const comingSoon = () => Alert.alert('Em breve!', 'Funcionalidade em desenvolvimento.');

  const goTo = (tabName, params) => {
    if (onNavigateToTab) {
      if (isModal) onClose?.();
      onNavigateToTab(tabName, params);
    } else if (navigation) {
      navigation.navigate(tabName, params);
    }
  };

  const goToCadastro = (section) => {
    if (isModal && onOpenCadastro) {
      onClose();
      onOpenCadastro(section);
    } else if (navigation) navigation.navigate('Cadastros', { section });
  };

  const MenuItem = ({ icon, label, subtitle, onPress, badge, rightEl }) => (
    <TouchableOpacity style={[ms.menuItem, { borderBottomColor: colors.border, paddingHorizontal: isCompact ? 12 : 16, paddingVertical: isCompact ? 10 : 14, gap: isCompact ? 10 : 12 }]} onPress={onPress || comingSoon} activeOpacity={0.6}>
      <View style={[ms.menuIconBox, { backgroundColor: 'transparent', width: isCompact ? 30 : 36, height: isCompact ? 30 : 36, borderRadius: isCompact ? 8 : 10 }]}>
        <AppIcon name={icon} size={isCompact ? 18 : 22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[ms.menuLabel, { color: colors.text, fontSize: isCompact ? 13 : 14 }]}>{label}</Text>
        {subtitle && <Text style={[ms.menuSub, { color: colors.textSecondary, fontSize: isCompact ? 10 : 11, marginTop: isCompact ? 1 : 2 }]}>{subtitle}</Text>}
      </View>
      {badge && (
        <View style={[ms.badge, { backgroundColor: colors.primaryRgba(0.2) }]}>
          <Text style={[ms.badgeText, { color: colors.primary }]}>{badge}</Text>
        </View>
      )}
      {rightEl || <AppIcon name="chevron-forward-outline" size={18} color={colors.textSecondary} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {isModal && (
        <View style={[topBarStyles.bar, { backgroundColor: colors.bg }]}>
          <Text style={[topBarStyles.title, { color: colors.text }]}>Menu</Text>
          <TouchableOpacity style={[topBarStyles.menuBtn, { backgroundColor: 'transparent' }]} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[ms.logoHeader, { backgroundColor: colors.bg, borderBottomColor: colors.border, paddingVertical: isCompact ? 14 : 24, paddingTop: isCompact ? 20 : 36 }]}>
          <Image source={logoImage} style={[ms.logoLarge, { width: isCompact ? 64 : 96, height: isCompact ? 64 : 96 }]} resizeMode="contain" />
          {!isCompact && (
            <Text style={[ms.appTitle, { color: '#22c55e', fontSize: isCompact ? 20 : 26, marginTop: isCompact ? 2 : 6 }]}>Tudo Certo</Text>
          )}
        </View>
        <TouchableOpacity style={[ms.profileSection, { backgroundColor: colors.card, borderBottomColor: colors.border, padding: isCompact ? 12 : 20, gap: isCompact ? 10 : 16 }]} onPress={onOpenPerfil || comingSoon} activeOpacity={0.7}>
          <View style={[ms.avatar, { backgroundColor: colors.primary, overflow: 'hidden', width: isCompact ? 42 : 56, height: isCompact ? 42 : 56, borderRadius: isCompact ? 21 : 28 }]}>
            {profile?.foto && !photoError ? (
              <Image
                source={{ uri: profile.foto }}
                style={{ width: isCompact ? 42 : 56, height: isCompact ? 42 : 56, borderRadius: isCompact ? 21 : 28 }}
                resizeMode="cover"
                onError={() => setPhotoError(true)}
              />
            ) : (
              <Ionicons name="person-outline" size={isCompact ? 24 : 32} color="#fff" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ms.profileName, { color: colors.text, fontSize: isCompact ? 15 : 18 }]}>{profile?.nome || 'Meu Perfil'}</Text>
            <Text style={[ms.profileSub, { color: colors.textSecondary, fontSize: isCompact ? 11 : 13, marginTop: isCompact ? 1 : 2 }]}>Gerencie sua conta</Text>
            <TouchableOpacity
              onPress={(e) => { e?.stopPropagation?.(); playTapSound(); onOpenAssinatura?.(); }}
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: isCompact ? 4 : 8, gap: 4 }}
              activeOpacity={0.7}
            >
              <Ionicons name="rocket-outline" size={isCompact ? 12 : 14} color={colors.primary} />
              <Text style={{ fontSize: isCompact ? 11 : 12, fontWeight: '600', color: colors.primary }}>{planLabel || 'Plano Básico'}</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        <Text style={[ms.sectionLabel, { color: colors.textSecondary, paddingHorizontal: isCompact ? 14 : 20, paddingTop: isCompact ? 12 : 20, paddingBottom: isCompact ? 6 : 8, fontSize: isCompact ? 10 : 11 } ]}>NAVEGAÇÃO</Text>
        <GlassCard colors={colors} solid style={[ms.sectionCard, { borderColor: colors.border, borderWidth: 1, marginHorizontal: isCompact ? 10 : 16, marginTop: 4 }]} contentStyle={{ padding: 0 }}>
          <MenuItem icon="home-outline" label="Início" subtitle="Painel principal" onPress={() => goTo('Início')} />
          <MenuItem icon="wallet-outline" label="Dinheiro" subtitle="Fluxo de caixa e faturas" onPress={() => goTo('Dinheiro')} />
          <MenuItem icon="calendar-outline" label="Agenda" subtitle="Eventos e tarefas" onPress={() => goTo('Agenda')} />
        </GlassCard>
        <Text style={[ms.sectionLabel, { color: colors.textSecondary, paddingHorizontal: isCompact ? 14 : 20, paddingTop: isCompact ? 12 : 20, paddingBottom: isCompact ? 6 : 8, fontSize: isCompact ? 10 : 11 } ]}>CONTA</Text>
        <GlassCard colors={colors} solid style={[ms.sectionCard, { borderColor: colors.border, borderWidth: 1, marginHorizontal: isCompact ? 10 : 16, marginTop: 4 }]} contentStyle={{ padding: 0 }}>
          <MenuItem icon="person-outline" label="Perfil" subtitle="Editar dados pessoais" onPress={onOpenPerfil} />
          <MenuItem icon="color-palette-outline" label="Temas" subtitle="Tema escuro e cor principal" onPress={onOpenTemas || comingSoon} />
          <MenuItem icon="card-outline" label="Assinatura" subtitle="Gerencie seu plano" badge={(planId || 'pessoal') === 'pessoal' ? 'Grátis' : null} onPress={onOpenAssinatura} />
        </GlassCard>
        <Text style={[ms.sectionLabel, { color: colors.textSecondary, paddingHorizontal: isCompact ? 14 : 20, paddingTop: isCompact ? 12 : 20, paddingBottom: isCompact ? 6 : 8, fontSize: isCompact ? 10 : 11 } ]}>EMPRESA</Text>
        <GlassCard colors={colors} solid style={[ms.sectionCard, { borderColor: colors.border, borderWidth: 1, marginHorizontal: isCompact ? 10 : 16, marginTop: 4 }]} contentStyle={{ padding: 0 }}>
          <TouchableOpacity
            style={[ms.dropdownHeader, { borderBottomColor: colors.border, paddingHorizontal: isCompact ? 12 : 16, paddingVertical: isCompact ? 10 : 14, gap: isCompact ? 10 : 12 }]}
            onPress={() => { playTapSound(); setEmpresaDropdownOpen(!empresaDropdownOpen); }}
            activeOpacity={0.7}
          >
            <View style={[ms.menuIconBox, { backgroundColor: 'transparent', width: isCompact ? 30 : 36, height: isCompact ? 30 : 36, borderRadius: isCompact ? 8 : 10 }]}>
              <AppIcon name="business-outline" size={isCompact ? 18 : 22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ms.menuLabel, { color: colors.text, fontSize: isCompact ? 13 : 14 }]}>Empresa</Text>
            </View>
            <AppIcon name={empresaDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          {empresaDropdownOpen && (
            <>
              <MenuItem icon="document-text-outline" label="Ordem de serviço" subtitle="Cadastro e gestão de OS" onPress={() => { setEmpresaDropdownOpen(false); onOpenOrdemServico?.(); }} />
              <MenuItem icon="receipt-outline" label="Orçamentos" subtitle="Cotações e propostas comerciais" onPress={() => { setEmpresaDropdownOpen(false); onOpenOrcamentos?.(); }} />
              {isWeb && <MenuItem icon="cart-outline" label="PDV" subtitle="Ponto de venda" onPress={() => { setEmpresaDropdownOpen(false); onOpenPDV?.(); }} />}
              <MenuItem icon="cube-outline" label="Produtos" subtitle="Gerenciar produtos" badge={`${products.length}`} onPress={() => { setEmpresaDropdownOpen(false); goToCadastro('produtos'); }} />
              <MenuItem icon="construct-outline" label="Serviços" subtitle="Gerenciar serviços" badge={`${services.length}`} onPress={() => { setEmpresaDropdownOpen(false); goToCadastro('servicos'); }} />
              <MenuItem icon="logo-whatsapp" label="WhatsApp e CRM" subtitle="Clientes, leads e mensagens" badge={`${clients.length}`} onPress={() => { setEmpresaDropdownOpen(false); onOpenMensagensWhatsApp?.(); }} />
              {showEmpresaFeatures && <MenuItem icon="wallet-outline" label="Vendas a prazo" subtitle="Vendas a prazo e parcelas" onPress={() => { setEmpresaDropdownOpen(false); onOpenAReceber?.(); }} />}
              {showEmpresaFeatures && <MenuItem icon="business-outline" label="Fornecedores" subtitle="Gerenciar fornecedores" badge={`${suppliers?.length ?? 0}`} onPress={() => { setEmpresaDropdownOpen(false); goToCadastro('fornecedores'); }} />}
              <MenuItem icon="stats-chart-outline" label="Relatórios" subtitle="Relatórios da empresa" onPress={() => { setEmpresaDropdownOpen(false); onOpenEmpresa?.(); }} />
            </>
          )}
        </GlassCard>
        <Text style={[ms.sectionLabel, { color: colors.textSecondary, paddingHorizontal: isCompact ? 14 : 20, paddingTop: isCompact ? 12 : 20, paddingBottom: isCompact ? 6 : 8, fontSize: isCompact ? 10 : 11 } ]}>FINANCEIRO</Text>
        <GlassCard colors={colors} solid style={[ms.sectionCard, { borderColor: colors.border, borderWidth: 1, marginHorizontal: isCompact ? 10 : 16, marginTop: 4 }]} contentStyle={{ padding: 0 }}>
          <MenuItem icon="wallet-outline" label="Bancos e Cartões" subtitle="Cadastre bancos, cartões e saldos" onPress={onOpenBancos || comingSoon} />
          <MenuItem icon="cash-outline" label="Meu Orçamento" subtitle="Limite de gastos por categoria" onPress={onOpenOrcamento || comingSoon} />
          <MenuItem icon="chatbubbles-outline" label="Meus gastos" subtitle="Conversa por texto, voz e foto" onPress={onOpenMeusGastos || comingSoon} />
          <MenuItem icon="document-text-outline" label="Boletos" subtitle="Gerenciar boletos" badge={`${boletos.length}`} onPress={() => goToCadastro('boletos')} />
        </GlassCard>
        <Text style={[ms.sectionLabel, { color: colors.textSecondary, paddingHorizontal: isCompact ? 14 : 20, paddingTop: isCompact ? 12 : 20, paddingBottom: isCompact ? 6 : 8, fontSize: isCompact ? 10 : 11 } ]}>PRODUTIVIDADE</Text>
        <GlassCard colors={colors} solid style={[ms.sectionCard, { borderColor: colors.border, borderWidth: 1, marginHorizontal: isCompact ? 10 : 16, marginTop: 4 }]} contentStyle={{ padding: 0 }}>
          <MenuItem icon="document-text-outline" label="Minhas anotações" subtitle="Notas e lembretes" onPress={onOpenAnotacoes || comingSoon} />
          <MenuItem icon="cart-outline" label="Lista de compras" subtitle="Anote o que precisa comprar" onPress={onOpenListaCompras || comingSoon} />
          <MenuItem icon="checkbox-outline" label="Tarefas" subtitle="Gerenciar tarefas" badge={`${checkListItems.length}`} onPress={() => goToCadastro('tarefas')} />
          <MenuItem icon="heart-outline" label="Metas e sonhos" subtitle="Cofrinhos e progresso" onPress={onOpenMetasSonhos || comingSoon} />
        </GlassCard>
        <Text style={[ms.sectionLabel, { color: colors.textSecondary, paddingHorizontal: isCompact ? 14 : 20, paddingTop: isCompact ? 12 : 20, paddingBottom: isCompact ? 6 : 8, fontSize: isCompact ? 10 : 11 } ]}>VISUALIZAÇÃO</Text>
        <GlassCard colors={colors} solid style={[ms.sectionCard, { borderColor: colors.border, borderWidth: 1, marginHorizontal: isCompact ? 10 : 16, marginTop: 4 }]} contentStyle={{ padding: 0 }}>
          <MenuItem icon="bar-chart-outline" label="Gráficos" subtitle="Ver gastos por categoria" onPress={() => goTo('Dinheiro', { tab: 'graficos' })} />
          <MenuItem icon="image-outline" label="Criar imagem Instagram" subtitle="Frase motivacional para compartilhar" onPress={() => onOpenImageGenerator?.()} />
        </GlassCard>
        <Text style={[ms.sectionLabel, { color: colors.textSecondary, paddingHorizontal: isCompact ? 14 : 20, paddingTop: isCompact ? 12 : 20, paddingBottom: isCompact ? 6 : 8, fontSize: isCompact ? 10 : 11 } ]}>SUPORTE</Text>
        <GlassCard colors={colors} solid style={[ms.sectionCard, { borderColor: colors.border, borderWidth: 1, marginHorizontal: isCompact ? 10 : 16, marginTop: 4 }]} contentStyle={{ padding: 0 }}>
          <MenuItem icon="gift-outline" label="Indique um Amigo" subtitle="Ganhe benefícios" onPress={onOpenIndique} />
          <MenuItem icon="document-text-outline" label="Termos de Uso" subtitle="Leia os termos do aplicativo" onPress={onOpenTermos || comingSoon} />
          <MenuItem icon="star-outline" label="Avaliar App" subtitle="Deixe sua avaliação" />
          <MenuItem
            icon="log-out-outline"
            label="Sair da conta"
            subtitle="Deslogar do aplicativo"
            onPress={() => {
              if (typeof window !== 'undefined') {
                const ok = window.confirm('Deseja sair da sua conta?');
                if (ok) {
                  onClose?.();
                  signOut();
                }
                return;
              }
              Alert.alert('Sair', 'Deseja sair da sua conta?', [{ text: 'Cancelar' }, { text: 'Sair', style: 'destructive', onPress: () => { onClose?.(); signOut(); } }]);
            }}
          />
        </GlassCard>
        <Text style={{ textAlign: 'center', fontSize: isCompact ? 10 : 11, color: colors.textSecondary, marginTop: isCompact ? 14 : 20, marginBottom: isCompact ? 50 : 100 }}>Tudo Certo v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
