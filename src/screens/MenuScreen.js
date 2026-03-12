import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppIcon } from '../components/AppIcon';
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
  sectionCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, gap: 12 },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '500' },
  menuSub: { fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  logoHeader: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, paddingTop: 36, borderBottomWidth: 1 },
  logoLarge: { width: 96, height: 96 },
  appTitle: { fontSize: 26, fontWeight: '800', letterSpacing: 0.5, marginTop: 6 },
});

export function MenuScreen({ navigation, onClose, onNavigateToTab, onOpenCadastro, onOpenPerfil, onOpenAssinatura, onOpenIndique, onOpenAReceber, onOpenClientes, onOpenBancos, onOpenOrcamento, onOpenAnotacoes, onOpenMeusGastos, onOpenListaCompras, onOpenMetasSonhos, onOpenMensagensWhatsApp, onOpenImageGenerator, onOpenTemas, onOpenTermos, onOpenCalculadoraFull }) {
  const { clients, products, services, boletos, checkListItems, suppliers } = useFinance();
  const { colors } = useTheme();
  const { showEmpresaFeatures, planLabel, planId } = usePlan();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const [photoError, setPhotoError] = useState(false);
  const isModal = Boolean(onClose);

  useEffect(() => {
    setPhotoError(false);
  }, [profile?.foto]);
  const comingSoon = () => Alert.alert('Em breve!', 'Funcionalidade em desenvolvimento.');

  const goTo = (tabName, params) => {
    if (isModal && onNavigateToTab) {
      onClose();
      onNavigateToTab(tabName, params);
    } else if (navigation) navigation.navigate(tabName, params);
  };

  const goToCadastro = (section) => {
    if (isModal && onOpenCadastro) {
      onClose();
      onOpenCadastro(section);
    } else if (navigation) navigation.navigate('Cadastros', { section });
  };

  const MenuItem = ({ icon, label, subtitle, onPress, badge, rightEl }) => (
    <TouchableOpacity style={[ms.menuItem, { borderBottomColor: colors.border }]} onPress={onPress || comingSoon} activeOpacity={0.6}>
      <View style={[ms.menuIconBox, { backgroundColor: 'transparent' }]}>
        <AppIcon name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[ms.menuLabel, { color: colors.text }]}>{label}</Text>
        {subtitle && <Text style={[ms.menuSub, { color: colors.textSecondary }]}>{subtitle}</Text>}
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
        <View style={[ms.logoHeader, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
          <Image source={logoImage} style={ms.logoLarge} resizeMode="contain" />
          <Text style={[ms.appTitle, { color: '#22c55e' }]}>Tudo Certo</Text>
        </View>
        <TouchableOpacity style={[ms.profileSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]} onPress={onOpenPerfil || comingSoon} activeOpacity={0.7}>
          <View style={[ms.avatar, { backgroundColor: colors.primary, overflow: 'hidden' }]}>
            {profile?.foto && !photoError ? (
              <Image
                source={{ uri: profile.foto }}
                style={{ width: 56, height: 56, borderRadius: 28 }}
                resizeMode="cover"
                onError={() => setPhotoError(true)}
              />
            ) : (
              <Ionicons name="person-outline" size={32} color="#fff" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ms.profileName, { color: colors.text }]}>{profile?.nome || 'Meu Perfil'}</Text>
            <Text style={[ms.profileSub, { color: colors.textSecondary }]}>Gerencie sua conta</Text>
            <TouchableOpacity
              onPress={(e) => { e?.stopPropagation?.(); playTapSound(); onOpenAssinatura?.(); }}
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}
              activeOpacity={0.7}
            >
              <Ionicons name="rocket-outline" size={14} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{planLabel || 'Plano Básico'}</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        <Text style={[ms.sectionLabel, { color: colors.textSecondary }]}>CONTA</Text>
        <View style={[ms.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="person-outline" label="Perfil" subtitle="Editar dados pessoais" onPress={onOpenPerfil} />
          <MenuItem icon="color-palette-outline" label="Temas" subtitle="Tema escuro e cor principal" onPress={onOpenTemas || comingSoon} />
          <MenuItem icon="card-outline" label="Assinatura" subtitle="Gerencie seu plano" badge={(planId || 'pessoal') === 'pessoal' ? 'Grátis' : null} onPress={onOpenAssinatura} />
          <MenuItem icon="gift-outline" label="Indique um Amigo" subtitle="Ganhe benefícios" onPress={onOpenIndique} />
        </View>
        <Text style={[ms.sectionLabel, { color: colors.textSecondary }]}>FINANCEIRO</Text>
        <View style={[ms.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="wallet-outline" label="Bancos e Cartões" subtitle="Cadastre bancos, cartões e saldos" onPress={onOpenBancos || comingSoon} />
          <MenuItem icon="cash-outline" label="Meu Orçamento" subtitle="Limite de gastos por categoria" onPress={onOpenOrcamento || comingSoon} />
          <MenuItem icon="chatbubbles-outline" label="Meus gastos" subtitle="Conversa por texto, voz e foto" onPress={onOpenMeusGastos || comingSoon} />
        </View>
        <Text style={[ms.sectionLabel, { color: colors.textSecondary }]}>PRODUTIVIDADE</Text>
        <View style={[ms.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="document-text-outline" label="Minhas anotações" subtitle="Notas e lembretes" onPress={onOpenAnotacoes || comingSoon} />
          <MenuItem icon="cart-outline" label="Lista de compras" subtitle="Anote o que precisa comprar" onPress={onOpenListaCompras || comingSoon} />
          <MenuItem icon="checkbox-outline" label="Tarefas" subtitle="Gerenciar tarefas" badge={`${checkListItems.length}`} onPress={() => goToCadastro('tarefas')} />
          <MenuItem icon="heart-outline" label="Metas e sonhos" subtitle="Cofrinhos e progresso dos seus objetivos" onPress={onOpenMetasSonhos || comingSoon} />
          <MenuItem icon="calculator-outline" label="Calculadora" subtitle="Calculadora completa estilo iOS" onPress={onOpenCalculadoraFull || comingSoon} />
        </View>
        <Text style={[ms.sectionLabel, { color: colors.textSecondary }]}>VISUALIZAÇÃO</Text>
        <View style={[ms.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="bar-chart-outline" label="Gráficos" subtitle="Ver gastos por categoria" onPress={() => goTo('Dinheiro', { tab: 'graficos' })} />
          {showEmpresaFeatures && <MenuItem icon="wallet-outline" label="Vendas a prazo" subtitle="Vendas a prazo e parcelas" onPress={() => onOpenAReceber?.()} />}
          <MenuItem icon="image-outline" label="Criar imagem Instagram" subtitle="Frase motivacional para compartilhar" onPress={() => onOpenImageGenerator?.()} />
        </View>
        <Text style={[ms.sectionLabel, { color: colors.textSecondary }]}>CADASTROS</Text>
        <View style={[ms.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="logo-whatsapp" label="WhatsApp e CRM" subtitle="Clientes, leads, contatos e mensagens" badge={`${clients.length}`} onPress={onOpenMensagensWhatsApp || comingSoon} />
          <MenuItem icon="cube-outline" label="Produtos" subtitle="Gerenciar produtos" badge={`${products.length}`} onPress={() => goToCadastro('produtos')} />
          <MenuItem icon="construct-outline" label="Serviços" subtitle="Gerenciar serviços" badge={`${services.length}`} onPress={() => goToCadastro('servicos')} />
          <MenuItem icon="document-text-outline" label="Boletos" subtitle="Gerenciar boletos" badge={`${boletos.length}`} onPress={() => goToCadastro('boletos')} />
          {showEmpresaFeatures && <MenuItem icon="business-outline" label="Fornecedores" subtitle="Gerenciar fornecedores" badge={`${suppliers?.length ?? 0}`} onPress={() => goToCadastro('fornecedores')} />}
        </View>
        <Text style={[ms.sectionLabel, { color: colors.textSecondary }]}>SUPORTE</Text>
        <View style={[ms.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="document-text-outline" label="Termos de Uso" subtitle="Leia os termos do aplicativo" onPress={onOpenTermos || comingSoon} />
          <MenuItem icon="star-outline" label="Avaliar App" subtitle="Deixe sua avaliação" />
          <MenuItem icon="log-out-outline" label="Sair da conta" subtitle="Deslogar do aplicativo" onPress={() => Alert.alert('Sair', 'Deseja sair da sua conta?', [{ text: 'Cancelar' }, { text: 'Sair', style: 'destructive', onPress: () => { onClose?.(); signOut(); } }])} />
        </View>
        <Text style={{ textAlign: 'center', fontSize: 11, color: colors.textSecondary, marginTop: 20, marginBottom: 100 }}>Tudo Certo v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
