import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, SafeAreaView, Platform, Alert, StyleSheet, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppIcon } from '../components/AppIcon';
import { useTheme } from '../contexts/ThemeContext';
import { useFinance } from '../contexts/FinanceContext';
import { MenuContext } from '../contexts/MenuContext';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AgendaScreen } from '../screens/AgendaScreen';
import { DinheiroScreen } from '../screens/DinheiroScreen';
import { CadastrosScreen } from '../screens/CadastrosScreen';
import { PerfilScreen } from '../screens/PerfilScreen';
import { AssinaturaScreen } from '../screens/AssinaturaScreen';
import { IndiqueScreen } from '../screens/IndiqueScreen';
import { AReceberScreen } from '../screens/AReceberScreen';
import { MotivationalImageScreen } from '../screens/MotivationalImageScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { TemasScreen } from '../screens/TemasScreen';
import { TermosScreen } from '../screens/TermosScreen';
import { BancosECartoesScreen } from '../screens/BancosECartoesScreen';
import { OrcamentoScreen } from '../screens/OrcamentoScreen';
import { AnotacoesScreen } from '../screens/AnotacoesScreen';
import { MeusGastosScreen } from '../screens/MeusGastosScreen';
import { ReceiptScannerScreen } from '../screens/ReceiptScannerScreen';
import { ListaComprasScreen } from '../screens/ListaComprasScreen';
import { MetasESonhosScreen } from '../screens/MetasESonhosScreen';
import { MensagensWhatsAppScreen } from '../screens/MensagensWhatsAppScreen';
import { AniversariantesScreen } from '../screens/AniversariantesScreen';
import { EmpresaRelatorioScreen } from '../screens/empresa/EmpresaRelatorioScreen';
import { OrdemServicoScreen } from '../screens/OrdemServicoScreen';
import { OrcamentosMainScreen } from '../screens/orcamentos/OrcamentosMainScreen';
import { PDVScreen } from '../screens/PDVScreen';
import { CircularMenuComponent } from '../components/CircularMenu';
import { playTapSound } from '../utils/sounds';
import { AddModal } from '../components/AddModal';
import { AgendaFormModal } from '../components/AgendaFormModal';
import { AssistantModal } from '../components/AssistantModal';
import { ProductFormModal } from '../components/ProductFormModal';
import { CalculatorScreen } from '../screens/CalculatorScreen';
import { CalculatorScreenPro } from '../screens/CalculatorScreenPro';
import { FloatingCalculatorOverlay } from '../components/FloatingCalculatorOverlay';
import { FloatingCalculatorFab } from '../components/FloatingCalculatorFab';
import { GlassTabBar } from '../components/navigation/GlassTabBar';
import { RightSideTabBar } from '../components/navigation/RightSideTabBar';
import { useIsDesktopLayout } from '../utils/platformLayout';

const Tab = createBottomTabNavigator();

function PlaceholderScreen() {
  return <View style={{ flex: 1 }} />;
}

/**
 * RN Web: a tab bar customizada fica fora da área útil se depender só do flex do BottomTabView.
 * Fixa na viewport para ficar sempre visível no mobile browser / PWA.
 */
function WebMobileTabBarDock(props) {
  if (Platform.OS !== 'web') return <GlassTabBar {...props} />;
  return (
    <View
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        minHeight: 110,
        zIndex: 2147483646,
        backgroundColor: 'transparent',
        pointerEvents: 'box-none',
      }}
    >
      <GlassTabBar {...props} />
    </View>
  );
}

export function AppNavigator() {
  const isWeb = Platform.OS === 'web';
  const isDesktopLayout = useIsDesktopLayout();
  const isWebMobile = isWeb && !isDesktopLayout;
  const isNativeMobile = !isWeb && !isDesktopLayout;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [addModalState, setAddModalState] = useState({ type: null, params: null });
  const [productFormVisible, setProductFormVisible] = useState(false);
  const [cadastroModal, setCadastroModal] = useState(null);
  const [perfilModal, setPerfilModal] = useState(false);
  const [assinaturaModal, setAssinaturaModal] = useState(false);
  const [indiqueModal, setIndiqueModal] = useState(false);
  const [aReceberModal, setAReceberModal] = useState(false);
  const [assistantModal, setAssistantModal] = useState(false);
  const [assistantAutoStartKey, setAssistantAutoStartKey] = useState(0);
  const [imageModal, setImageModal] = useState(false);
  const [imageModalParams, setImageModalParams] = useState({});
  const [temasModal, setTemasModal] = useState(false);
  const [termosModal, setTermosModal] = useState(false);
  const [bancosModal, setBancosModal] = useState(false);
  const [orcamentoModal, setOrcamentoModal] = useState(false);
  const [anotacoesModal, setAnotacoesModal] = useState(false);
  const [meusGastosModal, setMeusGastosModal] = useState(false);
  const [receiptScannerModal, setReceiptScannerModal] = useState(false);
  const [listaComprasModal, setListaComprasModal] = useState(false);
  const [metasSonhosModal, setMetasSonhosModal] = useState(false);
  const [mensagensWhatsAppModal, setMensagensWhatsAppModal] = useState(false);
  const [aniversariantesModal, setAniversariantesModal] = useState(false);
  const [empresaModal, setEmpresaModal] = useState(false);
  const [ordemServicoModal, setOrdemServicoModal] = useState(false);
  const [orcamentosModal, setOrcamentosModal] = useState(false);
  const [pdvModal, setPdvModal] = useState(false);
  const [calculadoraModal, setCalculadoraModal] = useState(false);
  const [calculadoraFloating, setCalculadoraFloating] = useState(false);
  const [showCalcMenu, setShowCalcMenu] = useState(false);
  const [calculatorExpression, setCalculatorExpression] = useState('');
  const [calculatorResult, setCalculatorResult] = useState(null);
  const [calculatorHistory, setCalculatorHistory] = useState([]);
  const { colors, primaryColor } = useTheme();
  const { addProduct } = useFinance();

  const navigationRef = useRef(null);

  const isDarkBg = colors.isDarkBg ?? (colors.text === '#ffffff');
  const tabBarGlassBg = () => (
    <View style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: isDarkBg ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.3)' }]}>
      <BlurView intensity={Platform.OS === 'ios' ? 90 : 70} tint={isDarkBg ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkBg ? 'rgba(17,24,39,0.4)' : 'rgba(255,255,255,0.3)' }]} />
    </View>
  );

  const menuActions = useMemo(
    () => ({
      openMenu: () => { if (!isDesktopLayout) setMenuModalOpen(true); },
      closeAndNavigate: (tabName, params) => {
        setMenuModalOpen(false);
        setTimeout(() => navigationRef.current?.navigate(tabName, params || {}), 200);
      },
      openCadastro: (section, options) => {
        setMenuModalOpen(false);
        setCadastroModal({ section, editItemId: options?.editItemId });
      },
      openPerfil: () => { setMenuModalOpen(false); setPerfilModal(true); },
      openTemas: () => { setMenuModalOpen(false); setTemasModal(true); },
      openTermos: () => { setMenuModalOpen(false); setTermosModal(true); },
      openAssinatura: () => { setMenuModalOpen(false); setAssinaturaModal(true); },
      openIndique: () => { setMenuModalOpen(false); setIndiqueModal(true); },
      openAReceber: () => { setMenuModalOpen(false); setAReceberModal(true); },
      openClientes: () => { setMenuModalOpen(false); setMensagensWhatsAppModal(true); },
      openBancos: () => { setMenuModalOpen(false); setBancosModal(true); },
      openOrcamento: () => { setMenuModalOpen(false); setOrcamentoModal(true); },
      openAnotacoes: (params) => { setMenuModalOpen(false); setAnotacoesModal(params || true); },
      openMeusGastos: () => { setMenuModalOpen(false); setMeusGastosModal(true); },
      openReceiptScanner: () => { setMenuModalOpen(false); setReceiptScannerModal(true); },
      openListaCompras: () => { setMenuModalOpen(false); setListaComprasModal(true); },
      openMetasSonhos: () => { setMenuModalOpen(false); setMetasSonhosModal(true); },
      openMensagensWhatsApp: () => { setMenuModalOpen(false); setMensagensWhatsAppModal(true); },
      openAniversariantes: () => { setMenuModalOpen(false); setAniversariantesModal(true); },
      openEmpresa: () => { setMenuModalOpen(false); setEmpresaModal(true); },
      openOrdemServico: () => { setMenuModalOpen(false); setOrdemServicoModal(true); },
      openOrcamentos: () => { setMenuModalOpen(false); setOrcamentosModal(true); },
      openPDV: () => { setMenuModalOpen(false); setPdvModal(true); },
      openAddModal: (type, params) => setAddModalState(typeof type === 'object' ? type : { type, params: params || null }),
      openProductForm: () => setProductFormVisible(true),
      openAssistant: () => setAssistantModal(true),
      openImageGenerator: (params) => {
        setMenuModalOpen(false);
        setImageModalParams(params || {});
        setImageModal(true);
      },
      openManageCards: () => {
        setMenuModalOpen(false);
        navigationRef.current?.navigate('Início', { openCardPicker: true });
      },
      openCalculadoraFull: () => { setCalculadoraFloating(false); setCalculadoraModal(true); },
    }),
    [isDesktopLayout]
  );

  return (
    <MenuContext.Provider value={menuActions}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, flexDirection: isDesktopLayout ? 'row' : 'column' }}>
          {isDesktopLayout && (
            <View style={{ width: 204, borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: colors.bg }}>
              <MenuScreen
                compact
                onNavigateToTab={(tabName, params) => navigationRef.current?.navigate(tabName, params || {})}
                onOpenCadastro={menuActions.openCadastro}
                onOpenPerfil={menuActions.openPerfil}
                onOpenTemas={menuActions.openTemas}
                onOpenTermos={menuActions.openTermos}
                onOpenAssinatura={menuActions.openAssinatura}
                onOpenIndique={menuActions.openIndique}
                onOpenAReceber={menuActions.openAReceber}
                onOpenClientes={menuActions.openClientes}
                onOpenBancos={menuActions.openBancos}
                onOpenOrcamento={menuActions.openOrcamento}
                onOpenAnotacoes={menuActions.openAnotacoes}
                onOpenMeusGastos={menuActions.openMeusGastos}
                onOpenListaCompras={menuActions.openListaCompras}
                onOpenMetasSonhos={menuActions.openMetasSonhos}
                onOpenMensagensWhatsApp={menuActions.openMensagensWhatsApp}
                onOpenAniversariantes={menuActions.openAniversariantes}
                onOpenEmpresa={menuActions.openEmpresa}
                onOpenOrdemServico={menuActions.openOrdemServico}
                onOpenOrcamentos={menuActions.openOrcamentos}
                onOpenPDV={menuActions.openPDV}
                onOpenImageGenerator={menuActions.openImageGenerator}
                onOpenCalculadoraFull={menuActions.openCalculadoraFull}
              />
            </View>
          )}
          <View style={{ flex: 1, position: 'relative' }}>
            <NavigationContainer ref={navigationRef}>
              <StatusBar style={isDarkBg ? 'light' : 'dark'} backgroundColor={colors.bg} />
              <Tab.Navigator
                tabBar={
                  isDesktopLayout
                    ? () => null
                    : (tabProps) => (
                        <WebMobileTabBarDock
                          {...tabProps}
                          customHandlers={{
                            Adicionar: () => { playTapSound(); setMenuOpen(!menuOpen); },
                            MeusGastos: () => { playTapSound(); setMeusGastosModal(true); },
                          }}
                        />
                      )
                }
                screenOptions={{
                  headerShown: false,
                  tabBarShowLabel: false,
                  tabBarStyle: isDesktopLayout
                    ? { display: 'none' }
                    : isWeb
                      ? {
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          minHeight: 100,
                          backgroundColor: 'transparent',
                          borderTopWidth: 0,
                          elevation: 0,
                          zIndex: 10000,
                          overflow: 'visible',
                        }
                      : {
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: 0,
                          elevation: 0,
                          backgroundColor: 'transparent',
                          borderTopWidth: 0,
                        },
                }}
              >
                <Tab.Screen name="Início" component={DashboardScreen} options={{ tabBarIcon: ({ color }) => <AppIcon name="home-outline" size={24} color={color} /> }} />
                <Tab.Screen name="Dinheiro" component={DinheiroScreen} options={{ tabBarIcon: ({ color }) => <AppIcon name="wallet-outline" size={24} color={color} /> }} />
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
                <Tab.Screen name="Agenda" component={AgendaScreen} options={{ tabBarIcon: ({ color }) => <AppIcon name="calendar-outline" size={24} color={color} /> }} />
                <Tab.Screen
                  name="MeusGastos"
                  component={PlaceholderScreen}
                  options={{
                    tabBarLabel: 'Meus gastos',
                    tabBarIcon: ({ color }) => <AppIcon name="chatbubbles-outline" size={24} color={color} />,
                  }}
                />
              </Tab.Navigator>
            </NavigationContainer>

            {/* Web desktop: tabbar vertical na direita (mesmos botões do mobile) */}
            {isWeb && isDesktopLayout && (
              <RightSideTabBar
                activeRouteName={navigationRef.current?.getCurrentRoute?.()?.name}
                onNavigate={(name) => navigationRef.current?.navigate?.(name)}
                onAdd={() => { setMenuOpen(!menuOpen); }}
                onMeusGastos={() => { setMeusGastosModal(true); }}
              />
            )}

            {/* Mobile nativo: seta na borda direita para mostrar o FAB */}
            {(isNativeMobile || isWebMobile) && !calculadoraModal && (
              <TouchableOpacity
                onPress={() => { playTapSound(); setShowCalcMenu((v) => !v); }}
                activeOpacity={0.85}
                style={{
                  position: 'absolute',
                  right: 0,
                  // Meio da tela total (inclui cabeçalho)
                  top: Math.max(16, (Dimensions.get('window').height / 2) - 26),
                  width: 28,
                  height: 52,
                  borderTopLeftRadius: 14,
                  borderBottomLeftRadius: 14,
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 2147483646,
                }}
                accessibilityLabel={showCalcMenu ? 'Fechar menu' : 'Abrir menu'}
              >
                <Ionicons name={showCalcMenu ? 'chevron-forward' : 'chevron-back'} size={18} color={colors.primary} />
              </TouchableOpacity>
            )}

            {/* Mobile + Web mobile: menu lateral aparece ao tocar na seta */}
            {(isNativeMobile || isWebMobile) && showCalcMenu && !calculadoraModal && (
              <View
                style={{
                  position: 'absolute',
                  right: 36,
                  top: Math.max(16, (Dimensions.get('window').height / 2) - 36),
                  zIndex: 2147483646,
                }}
                pointerEvents="box-none"
              >
                <View
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 16,
                    padding: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.18,
                    shadowRadius: 18,
                    elevation: 30,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      playTapSound();
                      setShowCalcMenu(false);
                      setCalculadoraFloating(false);
                      setCalculadoraModal(true);
                    }}
                    activeOpacity={0.85}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 14,
                      backgroundColor: colors.primaryRgba?.(0.12) ?? (colors.primary + '1F'),
                      borderWidth: 1,
                      borderColor: colors.primary + '55',
                      minWidth: 160,
                    }}
                    accessibilityLabel="Abrir calculadora"
                  >
                    <Ionicons name="calculator-outline" size={20} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>Calculadora</Text>
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>Abrir calculadora</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      <CircularMenuComponent
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onAddType={(type) => {
          setMenuOpen(false);
          if (type === 'fatura') {
            menuActions.openCadastro?.('boletos');
          } else if (type === 'produto') {
            menuActions.openProductForm?.();
          } else {
            menuActions.openAddModal(type);
          }
        }}
        onAssistant={() => {
          setMenuOpen(false);
          setAssistantAutoStartKey((prev) => prev + 1);
          setAssistantModal(true);
        }}
      />
      <ProductFormModal
        visible={productFormVisible}
        onClose={() => setProductFormVisible(false)}
        onSave={(data) => {
          if (data?._skipAdd) {
            setProductFormVisible(false);
            return;
          }
          addProduct(data);
          setProductFormVisible(false);
        }}
        editingItem={null}
      />
      {addModalState.type === 'agenda' ? (
        <AgendaFormModal
          visible
          editingEvent={addModalState.params?.editingEvent}
          initialDate={addModalState.params?.date}
          initialData={addModalState.params?.initialData}
          onClose={() => setAddModalState({ type: null, params: null })}
          onOpenNewClient={() => setCadastroModal({ section: 'clientes' })}
          onOpenNewService={() => setCadastroModal({ section: 'servicos' })}
        />
      ) : (
        <AddModal type={addModalState.type} params={addModalState.params} onClose={() => setAddModalState({ type: null, params: null })} />
      )}
      <AssistantModal
        visible={assistantModal}
        onClose={() => setAssistantModal(false)}
        autoStartListeningKey={assistantAutoStartKey}
        onOpenAdd={(type, params) => {
          setAssistantModal(false);
          if (type === 'fatura') menuActions.openCadastro?.('boletos');
          else if (type === 'produto') setProductFormVisible(true);
          else setAddModalState({ type, params: params || null });
        }}
      />
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
            onOpenOrcamento={menuActions.openOrcamento}
            onOpenAnotacoes={menuActions.openAnotacoes}
            onOpenMeusGastos={menuActions.openMeusGastos}
            onOpenListaCompras={menuActions.openListaCompras}
            onOpenMetasSonhos={menuActions.openMetasSonhos}
            onOpenMensagensWhatsApp={menuActions.openMensagensWhatsApp}
            onOpenAniversariantes={menuActions.openAniversariantes}
            onOpenEmpresa={menuActions.openEmpresa}
            onOpenOrdemServico={menuActions.openOrdemServico}
            onOpenOrcamentos={menuActions.openOrcamentos}
            onOpenPDV={menuActions.openPDV}
            onOpenImageGenerator={menuActions.openImageGenerator}
            onOpenCalculadoraFull={menuActions.openCalculadoraFull}
          />
        </SafeAreaView>
      </Modal>
      <Modal visible={!!cadastroModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <CadastrosScreen initialSection={cadastroModal?.section} initialEditItemId={cadastroModal?.editItemId} onClose={() => setCadastroModal(null)} isModal />
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
      <Modal visible={orcamentoModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <OrcamentoScreen onClose={() => setOrcamentoModal(false)} isModal />
        </SafeAreaView>
      </Modal>
      <Modal visible={!!anotacoesModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <AnotacoesScreen
            onClose={() => setAnotacoesModal(null)}
            isModal
            initialEditNoteId={typeof anotacoesModal === 'object' ? anotacoesModal?.editNoteId : null}
            initialCreate={typeof anotacoesModal === 'object' && anotacoesModal?.create}
          />
        </SafeAreaView>
      </Modal>
      <Modal visible={metasSonhosModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <MetasESonhosScreen onClose={() => setMetasSonhosModal(false)} isModal />
        </SafeAreaView>
      </Modal>
      <Modal visible={mensagensWhatsAppModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <MensagensWhatsAppScreen onClose={() => setMensagensWhatsAppModal(false)} isModal />
        </SafeAreaView>
      </Modal>
      <Modal visible={aniversariantesModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <AniversariantesScreen onClose={() => setAniversariantesModal(false)} isModal />
        </SafeAreaView>
      </Modal>
      <Modal visible={empresaModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <EmpresaRelatorioScreen onClose={() => setEmpresaModal(false)} />
        </SafeAreaView>
      </Modal>
      <Modal visible={ordemServicoModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <OrdemServicoScreen onClose={() => setOrdemServicoModal(false)} />
        </SafeAreaView>
      </Modal>
      <Modal visible={orcamentosModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <OrcamentosMainScreen onClose={() => setOrcamentosModal(false)} />
        </SafeAreaView>
      </Modal>
      {isWeb && (
        <Modal visible={pdvModal} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <PDVScreen onClose={() => setPdvModal(false)} />
          </SafeAreaView>
        </Modal>
      )}
      <Modal visible={listaComprasModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <ListaComprasScreen onClose={() => setListaComprasModal(false)} isModal />
        </SafeAreaView>
      </Modal>
      <Modal visible={meusGastosModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <MeusGastosScreen onClose={() => setMeusGastosModal(false)} isModal />
        </SafeAreaView>
      </Modal>
      <Modal visible={receiptScannerModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <ReceiptScannerScreen onClose={() => setReceiptScannerModal(false)} isModal />
        </SafeAreaView>
      </Modal>
      <Modal visible={imageModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <MotivationalImageScreen onClose={() => { setImageModal(false); setImageModalParams({}); }} isModal initialQuote={imageModalParams.quote} initialQuoteType={imageModalParams.quoteType} />
        </SafeAreaView>
      </Modal>
      <Modal visible={calculadoraModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <CalculatorScreenPro
            onClose={() => setCalculadoraModal(false)}
            onMinimize={() => { setCalculadoraModal(false); setCalculadoraFloating(true); }}
            isModal
            expression={calculatorExpression}
            result={calculatorResult}
            history={calculatorHistory}
            onExpressionChange={setCalculatorExpression}
            onResultChange={setCalculatorResult}
            onHistoryChange={setCalculatorHistory}
          />
        </SafeAreaView>
      </Modal>
      <FloatingCalculatorOverlay
        visible={calculadoraFloating}
        onClose={() => setCalculadoraFloating(false)}
        onExpand={() => { setCalculadoraFloating(false); setCalculadoraModal(true); }}
        expression={calculatorExpression}
        result={calculatorResult}
        history={calculatorHistory}
        onExpressionChange={setCalculatorExpression}
        onResultChange={setCalculatorResult}
        onHistoryChange={setCalculatorHistory}
      />
      </GestureHandlerRootView>
    </MenuContext.Provider>
  );
}

