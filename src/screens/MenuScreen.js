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
import { useIsDesktopLayout, scaleWebDesktop } from '../utils/platformLayout';

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
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  logoHeader: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, paddingTop: 36, borderBottomWidth: 1 },
  logoLarge: { width: 96, height: 96 },
  appTitle: { fontSize: 26, fontWeight: '800', letterSpacing: 0.5, marginTop: 6 },
  dropdownHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
});

export function MenuScreen({ navigation, onClose, onNavigateToTab, onOpenCadastro, onOpenPerfil, onOpenAssinatura, onOpenIndique, onOpenAReceber, onOpenClientes, onOpenBancos, onOpenOrcamento, onOpenAnotacoes, onOpenMeusGastos, onOpenListaCompras, onOpenMetasSonhos, onOpenMensagensWhatsApp, onOpenImageGenerator, onOpenTemas, onOpenTermos, onOpenCalculadoraFull, onOpenOrdemServico, onOpenOrcamentos, onOpenPDV, onOpenEmpresa, onOpenColaboradores, compact }) {
  const { clients, products, services, boletos, checkListItems, suppliers, collaborators } = useFinance();
  const { colors } = useTheme();
  const { showEmpresaFeatures, planLabel, planId } = usePlan();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const [photoError, setPhotoError] = useState(false);
  const [empresaDropdownOpen, setEmpresaDropdownOpen] = useState(false);
  const [menuContaDropdownOpen, setMenuContaDropdownOpen] = useState(false);
  const isModal = Boolean(onClose);
  const isWeb = typeof window !== 'undefined';
  const isDesktopLayout = useIsDesktopLayout();
  const isWebDesktop = isWeb && isDesktopLayout;
  /** Gaveta menu desktop (modal): mais estreita — textos podem quebrar linha */
  const drawerDesktop = isWebDesktop && isModal;
  const isCompact = compact ?? (isWeb && !isModal);
  const compactFont = (n) => scaleWebDesktop(n, isWebDesktop);
  const webDesktopTight = isWebDesktop && isCompact;
  const cardMargin = drawerDesktop ? 8 : (isCompact ? 10 : 16);
  const sectionPadH = drawerDesktop ? 10 : (isCompact ? 14 : 20);

  useEffect(() => {
    setPhotoError(false);
  }, [profile?.foto]);

  // Web + plano empresa: abrir o dropdown ao carregar o menu (após CONTA, antes de Suporte)
  useEffect(() => {
    if (isWeb && showEmpresaFeatures) setEmpresaDropdownOpen(true);
  }, [isWeb, showEmpresaFeatures]);
  useEffect(() => {
    if (isWebDesktop) setMenuContaDropdownOpen(true);
  }, [isWebDesktop]);
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

  const MenuItem = ({ icon, label, subtitle: _subtitle, onPress, badge, rightEl }) => {
    const iconSz = drawerDesktop ? 20 : (isCompact ? 18 : 22);
    const iconBox = drawerDesktop ? 32 : (isCompact ? 30 : 36);
    const chevronSz = drawerDesktop ? 16 : 18;
    return (
      <TouchableOpacity
        style={[
          ms.menuItem,
          {
            borderBottomColor: colors.border,
            paddingHorizontal: drawerDesktop ? 10 : (isCompact ? 10 : 16),
            paddingVertical: drawerDesktop ? 10 : (isCompact ? 8 : 12),
            gap: drawerDesktop ? 8 : (isCompact ? 8 : 12),
            alignItems: drawerDesktop ? 'flex-start' : 'center',
          },
        ]}
        onPress={onPress || comingSoon}
        activeOpacity={0.6}
      >
        <View style={[ms.menuIconBox, { backgroundColor: 'transparent', width: iconBox, height: iconBox, borderRadius: drawerDesktop ? 9 : (isCompact ? 8 : 10), marginTop: drawerDesktop ? 1 : 0 }]}>
          <AppIcon name={icon} size={iconSz} color={colors.primary} />
        </View>
        <View style={{ flex: 1, minWidth: drawerDesktop ? 0 : undefined }}>
          <Text
            style={[ms.menuLabel, { color: colors.text, fontSize: drawerDesktop ? 13 : (isCompact ? 12 : compactFont(14)) }]}
            {...(drawerDesktop ? {} : { numberOfLines: 1 })}
          >
            {label}
          </Text>
        </View>
        {badge && (
          <View style={[ms.badge, { backgroundColor: colors.primaryRgba(0.2), marginTop: drawerDesktop ? 1 : 0, flexShrink: 0 }]}>
            <Text style={[ms.badgeText, { color: colors.primary }]}>{badge}</Text>
          </View>
        )}
        {rightEl || <AppIcon name="chevron-forward-outline" size={chevronSz} color={colors.textSecondary} style={drawerDesktop ? { marginTop: 2 } : undefined} />}
      </TouchableOpacity>
    );
  };

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
        <View style={[ms.logoHeader, { backgroundColor: colors.bg, borderBottomColor: colors.border, paddingVertical: drawerDesktop ? 12 : (isCompact ? 12 : 24), paddingTop: drawerDesktop ? 16 : (isCompact ? 14 : 36) }]}>
          <Image
            source={logoImage}
            style={[ms.logoLarge, { width: drawerDesktop ? 72 : (isCompact ? 52 : 96), height: drawerDesktop ? 72 : (isCompact ? 52 : 96) }]}
            resizeMode="contain"
          />
          {!isCompact && !drawerDesktop && (
            <Text style={[ms.appTitle, { color: '#22c55e', fontSize: isCompact ? 20 : compactFont(26), marginTop: isCompact ? 2 : 6 }]}>Tudo Certo</Text>
          )}
        </View>
        <TouchableOpacity
          style={[ms.profileSection, { backgroundColor: colors.card, borderBottomColor: colors.border, padding: drawerDesktop ? 12 : (isCompact ? 10 : 20), gap: drawerDesktop ? 10 : (isCompact ? 8 : 16) }]}
          onPress={onOpenPerfil || comingSoon}
          activeOpacity={0.7}
        >
          <View style={[ms.avatar, { backgroundColor: colors.primary, overflow: 'hidden', width: drawerDesktop ? 48 : (isCompact ? 42 : 56), height: drawerDesktop ? 48 : (isCompact ? 42 : 56), borderRadius: drawerDesktop ? 24 : (isCompact ? 21 : 28) }]}>
            {profile?.foto && !photoError ? (
              <Image
                source={{ uri: profile.foto }}
                style={{ width: drawerDesktop ? 48 : (isCompact ? 42 : 56), height: drawerDesktop ? 48 : (isCompact ? 42 : 56), borderRadius: drawerDesktop ? 24 : (isCompact ? 21 : 28) }}
                resizeMode="cover"
                onError={() => setPhotoError(true)}
              />
            ) : (
              <Ionicons name="person-outline" size={drawerDesktop ? 26 : (isCompact ? 24 : 32)} color="#fff" />
            )}
          </View>
          <View style={{ flex: 1, minWidth: drawerDesktop ? 0 : undefined }}>
            <Text style={[ms.profileName, { color: colors.text, fontSize: drawerDesktop ? 15 : (isCompact ? 13 : 18) }]} numberOfLines={drawerDesktop ? 2 : 1}>
              {profile?.nome || 'Meu Perfil'}
            </Text>
            {!webDesktopTight && (
              <Text style={[ms.profileSub, { color: colors.textSecondary, fontSize: isCompact ? 10 : 13, marginTop: 1 }]} numberOfLines={1}>
                Gerencie sua conta
              </Text>
            )}
            <TouchableOpacity
              onPress={(e) => { e?.stopPropagation?.(); playTapSound(); onOpenAssinatura?.(); }}
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: isCompact ? 4 : 8, gap: 4 }}
              activeOpacity={0.7}
            >
              <Ionicons name="rocket-outline" size={isCompact ? 12 : 14} color={colors.primary} />
              <Text style={{ fontSize: isCompact ? 10 : 12, fontWeight: '600', color: colors.primary }} numberOfLines={drawerDesktop ? 2 : 1}>
                {planLabel || 'Plano Básico'}
              </Text>
              <Ionicons name="chevron-forward" size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        {/* Navegação oculta no menu (web mobile e nativo). */}
        {showEmpresaFeatures && (
          <>
            <Text style={[ms.sectionLabel, { color: colors.textSecondary, paddingHorizontal: sectionPadH, paddingTop: isCompact ? 12 : 20, paddingBottom: isCompact ? 6 : 8, fontSize: isCompact ? 10 : 11 } ]}>EMPRESA</Text>
            <GlassCard colors={colors} solid style={[ms.sectionCard, { borderColor: colors.border, borderWidth: 1, marginHorizontal: cardMargin, marginTop: 4 }]} contentStyle={{ padding: 0 }}>
              <TouchableOpacity
                style={[ms.dropdownHeader, { borderBottomColor: colors.border, paddingHorizontal: drawerDesktop ? 10 : (isCompact ? 12 : 16), paddingVertical: drawerDesktop ? 10 : (isCompact ? 10 : 14), gap: drawerDesktop ? 8 : (isCompact ? 10 : 12) }]}
                onPress={() => { playTapSound(); setEmpresaDropdownOpen(!empresaDropdownOpen); }}
                activeOpacity={0.7}
              >
                <View style={[ms.menuIconBox, { backgroundColor: 'transparent', width: drawerDesktop ? 32 : (isCompact ? 30 : 36), height: drawerDesktop ? 32 : (isCompact ? 30 : 36), borderRadius: drawerDesktop ? 9 : (isCompact ? 8 : 10) }]}>
                  <AppIcon name="business-outline" size={drawerDesktop ? 20 : (isCompact ? 18 : 22)} color={colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: drawerDesktop ? 0 : undefined }}>
                  <Text style={[ms.menuLabel, { color: colors.text, fontSize: isCompact ? 13 : 14 }]}>Empresa</Text>
                </View>
                <AppIcon name={empresaDropdownOpen ? 'chevron-up' : 'chevron-down'} size={drawerDesktop ? 16 : 18} color={colors.textSecondary} />
              </TouchableOpacity>
              {empresaDropdownOpen && (
                <>
                  {isWeb && <MenuItem icon="cart-outline" label="Abrir Caixa" subtitle="Ponto de venda e vendas" onPress={() => { setEmpresaDropdownOpen(false); onOpenPDV?.(); }} />}
                  <MenuItem icon="logo-whatsapp" label="WhatsApp e CRM" subtitle="Clientes, leads e mensagens" badge={`${clients.length}`} onPress={() => { setEmpresaDropdownOpen(false); onOpenMensagensWhatsApp?.(); }} />
                  <MenuItem icon="document-text-outline" label="Ordem de serviço" subtitle="Cadastro e gestão de OS" onPress={() => { setEmpresaDropdownOpen(false); onOpenOrdemServico?.(); }} />
                  <MenuItem icon="receipt-outline" label="Orçamentos" subtitle="Cotações e propostas comerciais" onPress={() => { setEmpresaDropdownOpen(false); onOpenOrcamentos?.(); }} />
                  <MenuItem icon="cube-outline" label="Produtos" subtitle="Gerenciar produtos" badge={`${products.length}`} onPress={() => { setEmpresaDropdownOpen(false); goToCadastro('produtos'); }} />
                  <MenuItem icon="construct-outline" label="Serviços" subtitle="Gerenciar serviços" badge={`${services.length}`} onPress={() => { setEmpresaDropdownOpen(false); goToCadastro('servicos'); }} />
                  <MenuItem icon="people-outline" label="Colaboradores" subtitle="Equipe, funções, salário e comissão" badge={`${collaborators?.length ?? 0}`} onPress={() => { setEmpresaDropdownOpen(false); onOpenColaboradores?.(); }} />
                  <MenuItem icon="business-outline" label="Fornecedores" subtitle="Gerenciar fornecedores" badge={`${suppliers?.length ?? 0}`} onPress={() => { setEmpresaDropdownOpen(false); goToCadastro('fornecedores'); }} />
                  <MenuItem icon="wallet-outline" label="Vendas a prazo" subtitle="Vendas a prazo e parcelas" onPress={() => { setEmpresaDropdownOpen(false); onOpenAReceber?.(); }} />
                  <MenuItem icon="stats-chart-outline" label="Relatórios" subtitle="Relatórios da empresa" onPress={() => { setEmpresaDropdownOpen(false); onOpenEmpresa?.(); }} />
                </>
              )}
            </GlassCard>
          </>
        )}
        <Text style={[ms.sectionLabel, { color: colors.textSecondary, paddingHorizontal: sectionPadH, paddingTop: isCompact ? 12 : 20, paddingBottom: isCompact ? 6 : 8, fontSize: isCompact ? 10 : 11 } ]}>CONTA E SUPORTE</Text>
        <GlassCard colors={colors} solid style={[ms.sectionCard, { borderColor: colors.border, borderWidth: 1, marginHorizontal: cardMargin, marginTop: 4 }]} contentStyle={{ padding: 0 }}>
          <TouchableOpacity
            style={[ms.dropdownHeader, { borderBottomColor: colors.border, paddingHorizontal: drawerDesktop ? 10 : (isCompact ? 12 : 16), paddingVertical: drawerDesktop ? 10 : (isCompact ? 10 : 14), gap: drawerDesktop ? 8 : (isCompact ? 10 : 12) }]}
            onPress={() => { playTapSound(); setMenuContaDropdownOpen(!menuContaDropdownOpen); }}
            activeOpacity={0.7}
          >
            <View style={[ms.menuIconBox, { backgroundColor: 'transparent', width: drawerDesktop ? 32 : (isCompact ? 30 : 36), height: drawerDesktop ? 32 : (isCompact ? 30 : 36), borderRadius: drawerDesktop ? 9 : (isCompact ? 8 : 10) }]}>
              <AppIcon name="settings-outline" size={drawerDesktop ? 20 : (isCompact ? 18 : 22)} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: drawerDesktop ? 0 : undefined }}>
              <Text style={[ms.menuLabel, { color: colors.text, fontSize: isCompact ? 13 : 14 }]}>Configurações</Text>
            </View>
            <AppIcon name={menuContaDropdownOpen ? 'chevron-up' : 'chevron-down'} size={drawerDesktop ? 16 : 18} color={colors.textSecondary} />
          </TouchableOpacity>
          {menuContaDropdownOpen && (
            <>
              <MenuItem icon="person-outline" label="Perfil" subtitle="Editar dados pessoais" onPress={onOpenPerfil} />
              <MenuItem icon="wallet-outline" label="Bancos e Cartões" subtitle="Cadastre bancos, cartões e saldos" onPress={onOpenBancos || comingSoon} />
              <MenuItem icon="color-palette-outline" label="Temas" subtitle="Tema escuro e cor principal" onPress={onOpenTemas || comingSoon} />
              <MenuItem icon="card-outline" label="Assinatura" subtitle="Gerencie seu plano" badge={(planId || 'pessoal') === 'pessoal' ? 'Grátis' : null} onPress={onOpenAssinatura} />
              <MenuItem icon="gift-outline" label="Indique um Amigo" subtitle="Ganhe benefícios" onPress={onOpenIndique} />
              <MenuItem icon="document-text-outline" label="Termos de Uso" subtitle="Leia os termos do aplicativo" onPress={onOpenTermos || comingSoon} />
              <MenuItem icon="star-outline" label="Avaliar App" subtitle="Deixe sua avaliação" />
            </>
          )}
        </GlassCard>
        <Text style={[ms.sectionLabel, { color: colors.textSecondary, paddingHorizontal: sectionPadH, paddingTop: isCompact ? 12 : 20, paddingBottom: isCompact ? 6 : 8, fontSize: isCompact ? 10 : 11 } ]}>FINANCEIRO</Text>
        <GlassCard colors={colors} solid style={[ms.sectionCard, { borderColor: colors.border, borderWidth: 1, marginHorizontal: cardMargin, marginTop: 4 }]} contentStyle={{ padding: 0 }}>
          <MenuItem icon="cash-outline" label="Meu Orçamento" subtitle="Limite de gastos por categoria" onPress={onOpenOrcamento || comingSoon} />
          <MenuItem icon="document-text-outline" label="Boletos" subtitle="Gerenciar boletos" badge={`${boletos.length}`} onPress={() => goToCadastro('boletos')} />
        </GlassCard>
        <Text style={[ms.sectionLabel, { color: colors.textSecondary, paddingHorizontal: sectionPadH, paddingTop: isCompact ? 12 : 20, paddingBottom: isCompact ? 6 : 8, fontSize: isCompact ? 10 : 11 } ]}>PRODUTIVIDADE</Text>
        <GlassCard colors={colors} solid style={[ms.sectionCard, { borderColor: colors.border, borderWidth: 1, marginHorizontal: cardMargin, marginTop: 4 }]} contentStyle={{ padding: 0 }}>
          <MenuItem icon="heart-outline" label="Metas e sonhos" subtitle="Cofrinhos e progresso" onPress={onOpenMetasSonhos || comingSoon} />
        </GlassCard>
        <Text style={[ms.sectionLabel, { color: colors.textSecondary, paddingHorizontal: sectionPadH, paddingTop: isCompact ? 12 : 20, paddingBottom: isCompact ? 6 : 8, fontSize: isCompact ? 10 : 11 } ]}>CONTA</Text>
        <GlassCard colors={colors} solid style={[ms.sectionCard, { borderColor: colors.border, borderWidth: 1, marginHorizontal: cardMargin, marginTop: 4 }]} contentStyle={{ padding: 0 }}>
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
