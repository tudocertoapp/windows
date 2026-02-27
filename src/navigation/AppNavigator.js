import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, TouchableOpacity, Modal, SafeAreaView, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppIcon } from '../components/AppIcon';
import { useTheme } from '../contexts/ThemeContext';
import { MenuContext } from '../contexts/MenuContext';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AgendaScreen } from '../screens/AgendaScreen';
import { DinheiroScreen } from '../screens/DinheiroScreen';
import { CadastrosScreen } from '../screens/CadastrosScreen';
import { PerfilScreen } from '../screens/PerfilScreen';
import { AssinaturaScreen } from '../screens/AssinaturaScreen';
import { IndiqueScreen } from '../screens/IndiqueScreen';
import { AReceberScreen } from '../screens/AReceberScreen';
import { ClientesScreen } from '../screens/ClientesScreen';
import { MotivationalImageScreen } from '../screens/MotivationalImageScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { TemasScreen } from '../screens/TemasScreen';
import { TermosScreen } from '../screens/TermosScreen';
import { BancosECartoesScreen } from '../screens/BancosECartoesScreen';
import { CircularMenuComponent } from '../components/CircularMenu';
import { playTapSound } from '../utils/sounds';
import { AddModal } from '../components/AddModal';
import { AssistantModal } from '../components/AssistantModal';

const Tab = createBottomTabNavigator();

function PlaceholderScreen() {
  return <View style={{ flex: 1 }} />;
}

export function AppNavigator() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [addModalState, setAddModalState] = useState({ type: null, params: null });
  const [cadastroModal, setCadastroModal] = useState(null);
  const [perfilModal, setPerfilModal] = useState(false);
  const [assinaturaModal, setAssinaturaModal] = useState(false);
  const [indiqueModal, setIndiqueModal] = useState(false);
  const [aReceberModal, setAReceberModal] = useState(false);
  const [clientesModal, setClientesModal] = useState(false);
  const [assistantModal, setAssistantModal] = useState(false);
  const [imageModal, setImageModal] = useState(false);
  const [imageModalParams, setImageModalParams] = useState({});
  const [temasModal, setTemasModal] = useState(false);
  const [termosModal, setTermosModal] = useState(false);
  const [bancosModal, setBancosModal] = useState(false);
  const { colors, primaryColor } = useTheme();
  const insets = useSafeAreaInsets();

  const navigationRef = useRef(null);

  const tabBarBlurBg = () => (
    <View style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: (colors.border || '#e5e7eb') + '99' }]}>
      <BlurView intensity={Platform.OS === 'ios' ? 70 : 50} tint={colors.text === '#f9fafb' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: (colors.card || '#fff') + 'E6' }]} />
    </View>
  );

  const menuActions = useMemo(
    () => ({
      openMenu: () => setMenuModalOpen(true),
      closeAndNavigate: (tabName, params) => {
        setMenuModalOpen(false);
        setTimeout(() => navigationRef.current?.navigate(tabName, params || {}), 200);
      },
      openCadastro: (section) => {
        setMenuModalOpen(false);
        setCadastroModal({ section });
      },
      openPerfil: () => { setMenuModalOpen(false); setPerfilModal(true); },
      openTemas: () => { setMenuModalOpen(false); setTemasModal(true); },
      openTermos: () => { setMenuModalOpen(false); setTermosModal(true); },
      openAssinatura: () => { setMenuModalOpen(false); setAssinaturaModal(true); },
      openIndique: () => { setMenuModalOpen(false); setIndiqueModal(true); },
      openAReceber: () => { setMenuModalOpen(false); setAReceberModal(true); },
      openClientes: () => { setMenuModalOpen(false); setClientesModal(true); },
      openBancos: () => { setMenuModalOpen(false); setBancosModal(true); },
      openAddModal: (type, params) => setAddModalState(typeof type === 'object' ? type : { type, params: params || null }),
      openAssistant: () => setAssistantModal(true),
      openImageGenerator: (params) => {
        setImageModalParams(params || {});
        setImageModal(true);
      },
    }),
    []
  );

  return (
    <MenuContext.Provider value={menuActions}>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style={colors.text === '#f9fafb' ? 'light' : 'dark'} backgroundColor={colors.bg} />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: true,
            tabBarStyle: {
              position: 'absolute',
              bottom: 44,
              left: 24,
              right: 24,
              height: 44 + insets.bottom,
              borderRadius: 24,
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              overflow: 'visible',
              paddingBottom: insets.bottom,
              paddingTop: 6,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 10,
              elevation: 14,
            },
            tabBarBackground: tabBarBlurBg,
            tabBarActiveTintColor: primaryColor,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarLabelStyle: { fontSize: 9, fontWeight: '500', marginTop: 1 },
            tabBarItemStyle: { justifyContent: 'center', alignItems: 'center', height: '100%', marginTop: 10 },
          }}
        >
          <Tab.Screen name="Início" component={DashboardScreen} options={{ tabBarIcon: ({ color }) => <AppIcon name="home-outline" size={24} color={color} /> }} />
          <Tab.Screen name="Agenda" component={AgendaScreen} options={{ tabBarIcon: ({ color }) => <AppIcon name="calendar-outline" size={24} color={color} /> }} />
          <Tab.Screen
            name="Adicionar"
            component={PlaceholderScreen}
            options={{
              tabBarButton: (props) => (
                <TouchableOpacity
                  {...props}
                  style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -62 }, props.style]}
                  onPress={() => { playTapSound(); setMenuOpen(!menuOpen); }}
                  activeOpacity={0.8}
                >
                  <View
                    style={{
                      width: 55,
                      height: 55,
                      borderRadius: 27.5,
                      backgroundColor: primaryColor,
                      justifyContent: 'center',
                      alignItems: 'center',
                      elevation: 8,
                    }}
                  >
                    <Ionicons name="add" size={28} color="#fff" />
                  </View>
                </TouchableOpacity>
              ),
            }}
          />
          <Tab.Screen name="Dinheiro" component={DinheiroScreen} options={{ tabBarIcon: ({ color }) => <AppIcon name="wallet-outline" size={24} color={color} /> }} />
          <Tab.Screen
            name="Menu"
            component={PlaceholderScreen}
            options={{
              tabBarIcon: ({ color }) => <AppIcon name="menu-outline" size={24} color={color} />,
              tabBarButton: (props) => (
                <TouchableOpacity {...props} onPress={() => { playTapSound(); setMenuModalOpen(true); }} activeOpacity={0.8} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
      <CircularMenuComponent
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onAddType={(type) => {
          setMenuOpen(false);
          if (type === 'fatura') {
            menuActions.openCadastro?.('boletos');
          } else {
            menuActions.openAddModal(type);
          }
        }}
        onAssistant={() => setAssistantModal(true)}
      />
      <AddModal type={addModalState.type} params={addModalState.params} onClose={() => setAddModalState({ type: null, params: null })} />
      <AssistantModal visible={assistantModal} onClose={() => setAssistantModal(false)} onOpenAdd={(type, params) => { setAssistantModal(false); setAddModalState({ type, params: params || null }); }} />
      <Modal visible={menuModalOpen} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <MenuScreen
            onClose={() => setMenuModalOpen(false)}
            onNavigateToTab={menuActions.closeAndNavigate}
            onOpenCadastro={menuActions.openCadastro}
            onOpenPerfil={menuActions.openPerfil}
            onOpenTemas={menuActions.openTemas}
            onOpenTermos={menuActions.openTermos}
            onOpenAssinatura={menuActions.openAssinatura}
            onOpenIndique={menuActions.openIndique}
            onOpenAReceber={menuActions.openAReceber}
            onOpenClientes={menuActions.openClientes}
            onOpenBancos={menuActions.openBancos}
            onOpenImageGenerator={menuActions.openImageGenerator}
          />
        </SafeAreaView>
      </Modal>
      <Modal visible={!!cadastroModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <CadastrosScreen initialSection={cadastroModal?.section} onClose={() => setCadastroModal(null)} isModal />
        </SafeAreaView>
      </Modal>
      <Modal visible={perfilModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <PerfilScreen onClose={() => setPerfilModal(false)} isModal />
        </SafeAreaView>
      </Modal>
      <Modal visible={assinaturaModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <AssinaturaScreen onClose={() => setAssinaturaModal(false)} isModal />
        </SafeAreaView>
      </Modal>
      <Modal visible={indiqueModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <IndiqueScreen onClose={() => setIndiqueModal(false)} isModal />
        </SafeAreaView>
      </Modal>
      <Modal visible={aReceberModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <AReceberScreen onClose={() => setAReceberModal(false)} isModal />
        </SafeAreaView>
      </Modal>
      <Modal visible={clientesModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <ClientesScreen onClose={() => setClientesModal(false)} isModal />
        </SafeAreaView>
      </Modal>
      <Modal visible={temasModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <TemasScreen onClose={() => setTemasModal(false)} onOpenAssinatura={() => { setTemasModal(false); setAssinaturaModal(true); }} isModal />
        </SafeAreaView>
      </Modal>
      <Modal visible={termosModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <TermosScreen onClose={() => setTermosModal(false)} isModal />
        </SafeAreaView>
      </Modal>
      <Modal visible={bancosModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <BancosECartoesScreen onClose={() => setBancosModal(false)} isModal />
        </SafeAreaView>
      </Modal>
      <Modal visible={imageModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <MotivationalImageScreen onClose={() => { setImageModal(false); setImageModalParams({}); }} isModal initialQuote={imageModalParams.quote} initialQuoteType={imageModalParams.quoteType} />
        </SafeAreaView>
      </Modal>
    </MenuContext.Provider>
  );
}
