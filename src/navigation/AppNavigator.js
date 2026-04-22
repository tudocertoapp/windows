import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Modal, SafeAreaView, Platform, Alert, StyleSheet, Dimensions, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, useNavigationState, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppIcon } from '../components/AppIcon';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
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
import { PoliticaPrivacidadeScreen } from '../screens/PoliticaPrivacidadeScreen';
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
import { ColaboradoresScreen } from '../screens/ColaboradoresScreen';
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
import {
  RightSideTabBar,
  WEB_DESKTOP_RAIL_WIDTH,
  WEB_DESKTOP_RAIL_LAYOUT_RESERVE,
  WEB_DESKTOP_RAIL_VIEWPORT_MARGIN,
  WEB_DESKTOP_RAIL_VERTICAL_INSET,
} from '../components/navigation/RightSideTabBar';
import { useIsDesktopLayout, WEB_MOBILE_TAB_BAR_RESERVE } from '../utils/platformLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createAppWebLinking, isWebCadastroPathSlug } from './webNavigationLinking';
import { useWebModalUrlSync } from './useWebModalUrlSync';

const Tab = createBottomTabNavigator();

function readRootTabRouteName(navState) {
  if (!navState?.routes?.length) return null;
  const idx = typeof navState.index === 'number' ? navState.index : 0;
  return navState.routes[idx]?.name ?? null;
}

/** Dentro do NavigationContainer: tab ativa sempre alinhada ao estado (web URL + modais + histórico). */
function WebUrlSyncHost({ getModalSnapshot, getCadastroPathDescriptor, applyModalSnapshot }) {
  const isWeb = Platform.OS === 'web';
  const navigation = useNavigation();
  const onNavigateToTab = useCallback((name) => {
    if (name) navigation.navigate(name);
  }, [navigation]);
  const tabRouteName = useNavigationState((state) => readRootTabRouteName(state) || 'Início');
  useWebModalUrlSync({
    isWeb,
    tabRouteName,
    getModalSnapshot,
    getCadastroPathDescriptor,
    applyModalSnapshot,
    onNavigateToTab,
  });
  return null;
}

/** Altura da faixa da seta (alinhamento vertical com o botão da calculadora). */
const CALC_EDGE_ROW_H = 52;

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
  const isWebDesktop = isWeb && isDesktopLayout;
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
  const [privacidadeModal, setPrivacidadeModal] = useState(false);
  const [bancosModal, setBancosModal] = useState(false);
  const [orcamentoModal, setOrcamentoModal] = useState(false);
  const [anotacoesModal, setAnotacoesModal] = useState(false);
  const [receiptScannerModal, setReceiptScannerModal] = useState(false);
  const [listaComprasModal, setListaComprasModal] = useState(false);
  const [metasSonhosModal, setMetasSonhosModal] = useState(false);
  const [aniversariantesModal, setAniversariantesModal] = useState(false);
  const [empresaModal, setEmpresaModal] = useState(false);
  const [colaboradoresModal, setColaboradoresModal] = useState(false);
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
  const { showEmpresaFeatures } = usePlan();
  /** Web desktop: navegação sempre na lateral (RightSideTabBar). Atalhos F1–F8 do Início ficam só no plano com empresa. */
  const showDesktopRightRail = isWebDesktop;
  const { addProduct } = useFinance();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const navigationRef = useRef(null);
  const prevDesktopTabRouteRef = useRef('Início');
  const [desktopTabRoute, setDesktopTabRoute] = useState('Início');
  const cadastroUrlRef = useRef(null);

  const getCadastroPathDescriptor = useCallback(() => {
    if (!cadastroModal) return null;
    const section = cadastroModal.section || 'clientes';
    if (!isWebCadastroPathSlug(section)) return null;
    if (
      showCalcMenu ||
      calculadoraModal ||
      calculadoraFloating ||
      pdvModal ||
      orcamentosModal ||
      ordemServicoModal ||
      empresaModal ||
      colaboradoresModal ||
      aniversariantesModal ||
      metasSonhosModal ||
      listaComprasModal ||
      receiptScannerModal ||
      anotacoesModal ||
      orcamentoModal ||
      bancosModal ||
      termosModal ||
      privacidadeModal ||
      temasModal ||
      imageModal ||
      assistantModal ||
      aReceberModal ||
      indiqueModal ||
      assinaturaModal ||
      perfilModal
    ) {
      return null;
    }
    return {
      section,
      eid: cadastroModal.editItemId != null ? String(cadastroModal.editItemId) : undefined,
    };
  }, [
    cadastroModal,
    showCalcMenu,
    calculadoraModal,
    calculadoraFloating,
    pdvModal,
    orcamentosModal,
    ordemServicoModal,
    empresaModal,
    colaboradoresModal,
    aniversariantesModal,
    metasSonhosModal,
    listaComprasModal,
    receiptScannerModal,
    anotacoesModal,
    orcamentoModal,
    bancosModal,
    termosModal,
    privacidadeModal,
    temasModal,
    imageModal,
    assistantModal,
    aReceberModal,
    indiqueModal,
    assinaturaModal,
    perfilModal,
  ]);

  cadastroUrlRef.current = getCadastroPathDescriptor();

  useEffect(() => {
    const prev = prevDesktopTabRouteRef.current;
    if (prev && prev !== desktopTabRoute) {
      // Troca de tab deve priorizar a página alvo; fecha overlays de menu.
      setMenuModalOpen(false);
      setMenuOpen(false);
    }
    prevDesktopTabRouteRef.current = desktopTabRoute;
  }, [desktopTabRoute]);

  const linking = useMemo(
    () => createAppWebLinking({ isWeb, showEmpresaFeatures, cadastroUrlRef }),
    [isWeb, showEmpresaFeatures]
  );

  const resetAllWebOverlayModals = useCallback(() => {
    setShowCalcMenu(false);
    setCalculadoraModal(false);
    setCalculadoraFloating(false);
    setPdvModal(false);
    setOrcamentosModal(false);
    setOrdemServicoModal(false);
    setEmpresaModal(false);
    setColaboradoresModal(false);
    setAniversariantesModal(false);
    setMetasSonhosModal(false);
    setListaComprasModal(false);
    setReceiptScannerModal(false);
    setAnotacoesModal(null);
    setOrcamentoModal(false);
    setBancosModal(false);
    setTermosModal(false);
    setPrivacidadeModal(false);
    setTemasModal(false);
    setImageModal(false);
    setImageModalParams({});
    setAssistantModal(false);
    setAReceberModal(false);
    setIndiqueModal(false);
    setAssinaturaModal(false);
    setPerfilModal(false);
    setCadastroModal(null);
    setProductFormVisible(false);
    setAddModalState({ type: null, params: null });
    setMenuModalOpen(false);
    setMenuOpen(false);
  }, []);

  const getModalSnapshot = useCallback(() => {
    if (showCalcMenu) return { m: 'calc_menu' };
    if (calculadoraModal) return { m: 'calc' };
    if (calculadoraFloating) return { m: 'calc_float' };
    if (pdvModal) return { m: 'pdv' };
    if (orcamentosModal) return { m: 'orcamentos' };
    if (ordemServicoModal) return { m: 'os' };
    if (empresaModal) return { m: 'empresa' };
    if (colaboradoresModal) return { m: 'colaboradores' };
    if (aniversariantesModal) return { m: 'aniversariantes' };
    if (metasSonhosModal) return { m: 'metas' };
    if (listaComprasModal) return { m: 'lista' };
    if (receiptScannerModal) return { m: 'scanner' };
    if (anotacoesModal) {
      const o = typeof anotacoesModal === 'object' ? anotacoesModal : {};
      return {
        m: 'anotacoes',
        nid: o.editNoteId ? String(o.editNoteId) : undefined,
        newNote: !!o.create,
      };
    }
    if (orcamentoModal) return { m: 'orcamento' };
    if (bancosModal) return { m: 'bancos' };
    if (termosModal) return { m: 'termos' };
    if (privacidadeModal) return { m: 'privacidade' };
    if (temasModal) return { m: 'temas' };
    if (imageModal) {
      const q = imageModalParams?.quote;
      const qt = imageModalParams?.quoteType;
      return {
        m: 'image',
        qt: qt != null ? String(qt) : undefined,
        q: typeof q === 'string' && q.length > 0 ? q.slice(0, 400) : undefined,
      };
    }
    if (assistantModal) return { m: 'assistant' };
    if (aReceberModal) return { m: 'a_receber' };
    if (indiqueModal) return { m: 'indique' };
    if (assinaturaModal) return { m: 'assinatura' };
    if (perfilModal) return { m: 'perfil' };
    if (cadastroModal) {
      if (getCadastroPathDescriptor()) return null;
      return {
        m: 'cadastro',
        sec: cadastroModal.section ? String(cadastroModal.section) : undefined,
        eid: cadastroModal.editItemId != null ? String(cadastroModal.editItemId) : undefined,
      };
    }
    if (productFormVisible) return { m: 'produto' };
    if (addModalState?.type === 'agenda') return { m: 'agenda' };
    if (addModalState?.type) return { m: 'add', t: String(addModalState.type) };
    if (menuModalOpen) return { m: 'menu' };
    if (menuOpen) return { m: 'fab' };
    return null;
  }, [
    showCalcMenu,
    calculadoraModal,
    calculadoraFloating,
    pdvModal,
    orcamentosModal,
    ordemServicoModal,
    empresaModal,
    colaboradoresModal,
    aniversariantesModal,
    metasSonhosModal,
    listaComprasModal,
    receiptScannerModal,
    anotacoesModal,
    orcamentoModal,
    bancosModal,
    termosModal,
    privacidadeModal,
    temasModal,
    imageModal,
    imageModalParams,
    assistantModal,
    aReceberModal,
    indiqueModal,
    assinaturaModal,
    perfilModal,
    cadastroModal,
    getCadastroPathDescriptor,
    productFormVisible,
    addModalState,
    menuModalOpen,
    menuOpen,
  ]);

  const applyModalSnapshot = useCallback(
    (snap) => {
      resetAllWebOverlayModals();
      if (!snap?.m) return;
      switch (snap.m) {
        case 'calc_menu':
          setShowCalcMenu(true);
          break;
        case 'calc':
          setCalculadoraModal(true);
          break;
        case 'calc_float':
          setCalculadoraFloating(true);
          break;
        case 'pdv':
          setPdvModal(true);
          break;
        case 'orcamentos':
          setOrcamentosModal(true);
          break;
        case 'os':
          setOrdemServicoModal(true);
          break;
        case 'empresa':
          setEmpresaModal(true);
          break;
        case 'colaboradores':
          setColaboradoresModal(true);
          break;
        case 'aniversariantes':
          setAniversariantesModal(true);
          break;
        case 'metas':
          setMetasSonhosModal(true);
          break;
        case 'lista':
          setListaComprasModal(true);
          break;
        case 'scanner':
          setReceiptScannerModal(true);
          break;
        case 'anotacoes':
          if (snap.nid) setAnotacoesModal({ editNoteId: snap.nid });
          else if (snap.newNote) setAnotacoesModal({ create: true });
          else setAnotacoesModal(true);
          break;
        case 'orcamento':
          setOrcamentoModal(true);
          break;
        case 'bancos':
          setBancosModal(true);
          break;
        case 'termos':
          setTermosModal(true);
          break;
        case 'privacidade':
          setPrivacidadeModal(true);
          break;
        case 'temas':
          setTemasModal(true);
          break;
        case 'image':
          setImageModalParams({ quoteType: snap.qt, quote: snap.q });
          setImageModal(true);
          break;
        case 'assistant':
          setAssistantModal(true);
          break;
        case 'a_receber':
          setAReceberModal(true);
          break;
        case 'indique':
          setIndiqueModal(true);
          break;
        case 'assinatura':
          setAssinaturaModal(true);
          break;
        case 'perfil':
          setPerfilModal(true);
          break;
        case 'cadastro':
          setCadastroModal({
            section: snap.sec || 'clientes',
            editItemId: snap.eid || undefined,
          });
          break;
        case 'produto':
          setProductFormVisible(true);
          break;
        case 'agenda':
          setAddModalState({ type: 'agenda', params: null });
          break;
        case 'add':
          setAddModalState({ type: snap.t || 'receita', params: null });
          break;
        case 'menu':
          setMenuModalOpen(true);
          break;
        case 'fab':
          setMenuOpen(true);
          break;
        default:
          break;
      }
    },
    [resetAllWebOverlayModals]
  );

  const isDarkBg = colors.isDarkBg ?? (colors.text === '#ffffff');
  const tabBarGlassBg = () => (
    <View style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: isDarkBg ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.3)' }]}>
      <BlurView intensity={Platform.OS === 'ios' ? 90 : 70} tint={isDarkBg ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkBg ? 'rgba(17,24,39,0.4)' : 'rgba(255,255,255,0.3)' }]} />
    </View>
  );

  const menuActions = useMemo(
    () => ({
      openMenu: () => { setMenuModalOpen(true); },
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
      openPrivacidade: () => { setMenuModalOpen(false); setPrivacidadeModal(true); },
      openAssinatura: () => { setMenuModalOpen(false); setAssinaturaModal(true); },
      openIndique: () => { setMenuModalOpen(false); setIndiqueModal(true); },
      openAReceber: () => { setMenuModalOpen(false); setAReceberModal(true); },
      openClientes: () => {
        setMenuModalOpen(false);
        setTimeout(() => {
          if (showEmpresaFeatures) navigationRef.current?.navigate('WhatsApp');
        }, 200);
      },
      openBancos: () => { setMenuModalOpen(false); setBancosModal(true); },
      openOrcamento: () => { setMenuModalOpen(false); setOrcamentoModal(true); },
      openAnotacoes: (params) => { setMenuModalOpen(false); setAnotacoesModal(params || true); },
      openMeusGastos: () => {
        setMenuModalOpen(false);
        setTimeout(() => navigationRef.current?.navigate('MeusGastos'), 200);
      },
      openReceiptScanner: () => { setMenuModalOpen(false); setReceiptScannerModal(true); },
      openListaCompras: () => { setMenuModalOpen(false); setListaComprasModal(true); },
      openMetasSonhos: () => { setMenuModalOpen(false); setMetasSonhosModal(true); },
      openMensagensWhatsApp: () => {
        setMenuModalOpen(false);
        setTimeout(() => {
          if (showEmpresaFeatures) navigationRef.current?.navigate('WhatsApp');
        }, 200);
      },
      openAniversariantes: () => { setMenuModalOpen(false); setAniversariantesModal(true); },
      openEmpresa: () => { setMenuModalOpen(false); setEmpresaModal(true); },
      openColaboradores: () => { setMenuModalOpen(false); setColaboradoresModal(true); },
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
      openCalculadoraFull: () => {
        // Toggle: segundo clique no atalho fecha a calculadora.
        if (isWebDesktop) {
          if (calculadoraFloating || calculadoraModal) {
            setCalculadoraFloating(false);
            setCalculadoraModal(false);
            return;
          }
          setCalculadoraModal(false);
          setCalculadoraFloating(true);
          return;
        }
        if (calculadoraModal || calculadoraFloating) {
          setCalculadoraModal(false);
          setCalculadoraFloating(false);
          return;
        }
        setCalculadoraFloating(false);
        setCalculadoraModal(true);
      },
    }),
    [isWebDesktop, showEmpresaFeatures, calculadoraFloating, calculadoraModal]
  );

  /** Seta + calculadora: mesma linha, centro vertical da tela (viewport), respeitando safe area e tab bar. */
  const calcEdgeCalcRowTop = useMemo(() => {
    const h = windowHeight > 0 ? windowHeight : Dimensions.get('window').height;
    const bottomReserve = isWebMobile
      ? Math.max(insets.bottom, WEB_MOBILE_TAB_BAR_RESERVE)
      : Math.max(insets.bottom, 100);
    const ideal = (h - CALC_EDGE_ROW_H) / 2;
    const minTop = insets.top + 4;
    const maxTop = h - bottomReserve - CALC_EDGE_ROW_H - 4;
    return Math.max(minTop, Math.min(ideal, maxTop));
  }, [isWebMobile, insets.top, insets.bottom, windowHeight]);

  const closeTopLevelModal = useCallback(() => {
    if (showCalcMenu) { setShowCalcMenu(false); return true; }
    if (calculadoraModal) { setCalculadoraModal(false); return true; }
    if (calculadoraFloating) { setCalculadoraFloating(false); return true; }
    if (pdvModal) { setPdvModal(false); return true; }
    if (orcamentosModal) { setOrcamentosModal(false); return true; }
    if (ordemServicoModal) { setOrdemServicoModal(false); return true; }
    if (empresaModal) { setEmpresaModal(false); return true; }
    if (colaboradoresModal) { setColaboradoresModal(false); return true; }
    if (aniversariantesModal) { setAniversariantesModal(false); return true; }
    if (metasSonhosModal) { setMetasSonhosModal(false); return true; }
    if (listaComprasModal) { setListaComprasModal(false); return true; }
    if (receiptScannerModal) { setReceiptScannerModal(false); return true; }
    if (anotacoesModal) { setAnotacoesModal(false); return true; }
    if (orcamentoModal) { setOrcamentoModal(false); return true; }
    if (bancosModal) { setBancosModal(false); return true; }
    if (termosModal) { setTermosModal(false); return true; }
    if (privacidadeModal) { setPrivacidadeModal(false); return true; }
    if (temasModal) { setTemasModal(false); return true; }
    if (imageModal) { setImageModal(false); return true; }
    if (assistantModal) { setAssistantModal(false); return true; }
    if (aReceberModal) { setAReceberModal(false); return true; }
    if (indiqueModal) { setIndiqueModal(false); return true; }
    if (assinaturaModal) { setAssinaturaModal(false); return true; }
    if (perfilModal) { setPerfilModal(false); return true; }
    if (cadastroModal) { setCadastroModal(null); return true; }
    if (productFormVisible) { setProductFormVisible(false); return true; }
    if (addModalState?.type) { setAddModalState({ type: null, params: null }); return true; }
    if (menuModalOpen) { setMenuModalOpen(false); return true; }
    if (menuOpen) { setMenuOpen(false); return true; }
    return false;
  }, [
    showCalcMenu, calculadoraModal, calculadoraFloating, pdvModal, orcamentosModal, ordemServicoModal,
    empresaModal, colaboradoresModal, aniversariantesModal, metasSonhosModal, listaComprasModal, receiptScannerModal,
    anotacoesModal, orcamentoModal, bancosModal, termosModal, privacidadeModal, temasModal, imageModal, assistantModal,
    aReceberModal, indiqueModal, assinaturaModal, perfilModal, cadastroModal, productFormVisible,
    addModalState, menuModalOpen, menuOpen,
  ]);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return undefined;
    const onEsc = (e) => {
      if (e?.key !== 'Escape') return;
      const target = e?.target;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      if (isTyping) return;
      const localEscEvent = new CustomEvent('tc:escape', { cancelable: true });
      const dispatched = window.dispatchEvent(localEscEvent);
      if (!dispatched) return;
      if (closeTopLevelModal()) return;
      const nav = navigationRef.current;
      if (nav?.canGoBack?.()) nav.goBack();
      else if (window.history.length > 1) window.history.back();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isWeb, closeTopLevelModal]);

  return (
    <MenuContext.Provider value={menuActions}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          <View style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative' }}>
            <NavigationContainer
              ref={navigationRef}
              linking={linking}
              onReady={() => {
                const n = readRootTabRouteName(navigationRef.current?.getRootState?.());
                if (n) setDesktopTabRoute(n);
              }}
              onStateChange={(state) => {
                const n = readRootTabRouteName(state);
                if (n) setDesktopTabRoute(n);
              }}
            >
              <WebUrlSyncHost
                getModalSnapshot={getModalSnapshot}
                getCadastroPathDescriptor={getCadastroPathDescriptor}
                applyModalSnapshot={applyModalSnapshot}
              />
              <View
                style={{
                  flex: 1,
                  minHeight: 0,
                  backgroundColor: colors.bg,
                  ...(isWebDesktop ? { paddingRight: WEB_DESKTOP_RAIL_LAYOUT_RESERVE } : {}),
                }}
              >
              <StatusBar style={isDarkBg ? 'light' : 'dark'} backgroundColor={colors.bg} />
              <Tab.Navigator
                sceneContainerStyle={{ flex: 1, minHeight: 0 }}
                tabBar={
                  isWebDesktop
                    ? () => null
                    : (tabProps) => (
                        <WebMobileTabBarDock
                          {...tabProps}
                          hiddenRouteNames={!isDesktopLayout ? ['WhatsApp', 'CRM', 'Cadastros'] : []}
                          customHandlers={{
                            Adicionar: () => { playTapSound(); setMenuOpen(!menuOpen); },
                          }}
                        />
                      )
                }
                screenOptions={({ route }) => ({
                  headerShown: false,
                  tabBarShowLabel: false,
                  // Web mobile: esconder WhatsApp/CRM/Cadastros da tabbar.
                  ...(isWebMobile && ['WhatsApp', 'CRM', 'Cadastros'].includes(route.name)
                    ? { tabBarButton: () => null }
                    : {}),
                  tabBarStyle: isWebDesktop
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
                          minHeight: 100,
                          elevation: 10000,
                          backgroundColor: 'transparent',
                          borderTopWidth: 0,
                          zIndex: 10000,
                          overflow: 'visible',
                        },
                })}
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
                  component={MeusGastosScreen}
                  options={{
                    tabBarLabel: 'Meus gastos',
                    tabBarIcon: ({ color }) => <AppIcon name="chatbubbles-outline" size={24} color={color} />,
                  }}
                />
                {showEmpresaFeatures ? (
                  <Tab.Screen
                    name="WhatsApp"
                    component={MensagensWhatsAppScreen}
                    options={{
                      tabBarLabel: 'WhatsApp',
                      tabBarIcon: ({ color }) => <Ionicons name="logo-whatsapp" size={24} color={color} />,
                    }}
                  />
                ) : null}
              </Tab.Navigator>
              </View>
            </NavigationContainer>

            {/* Web mobile + nativo: seta e calculadora na mesma linha horizontal, centro vertical da tela */}
            {(isNativeMobile || isWebMobile) && !calculadoraModal && (
              <View
                style={{
                  position: 'absolute',
                  right: 0,
                  top: Math.max(0, calcEdgeCalcRowTop - 40),
                  flexDirection: 'row',
                  alignItems: 'center',
                  zIndex: 2147483646,
                }}
                pointerEvents="box-none"
              >
                {showCalcMenu ? (
                  <View
                    style={{
                      marginRight: 8,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.15,
                      shadowRadius: 12,
                      elevation: 24,
                    }}
                    pointerEvents="box-none"
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
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                      accessibilityLabel="Abrir calculadora"
                    >
                      <Ionicons name="calculator-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <TouchableOpacity
                  onPress={() => { playTapSound(); setShowCalcMenu((v) => !v); }}
                  activeOpacity={0.85}
                  style={{
                    width: 28,
                    height: CALC_EDGE_ROW_H,
                    borderTopLeftRadius: 14,
                    borderBottomLeftRadius: 14,
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  accessibilityLabel={showCalcMenu ? 'Fechar menu' : 'Abrir menu'}
                >
                  <Ionicons name={showCalcMenu ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
            {showDesktopRightRail ? (
              <View
                pointerEvents="box-none"
                style={{
                  zIndex: 2147483645,
                  ...(Platform.OS === 'web'
                    ? {
                        position: 'fixed',
                        top: WEB_DESKTOP_RAIL_VERTICAL_INSET,
                        bottom: WEB_DESKTOP_RAIL_VERTICAL_INSET,
                        right: WEB_DESKTOP_RAIL_VIEWPORT_MARGIN,
                        width: WEB_DESKTOP_RAIL_WIDTH,
                        backgroundColor: 'transparent',
                        alignItems: 'stretch',
                      }
                    : {
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        right: WEB_DESKTOP_RAIL_VIEWPORT_MARGIN,
                        width: WEB_DESKTOP_RAIL_WIDTH,
                        backgroundColor: 'transparent',
                        alignItems: 'stretch',
                      }),
                }}
              >
                <RightSideTabBar
                  mode="side"
                  activeRouteName={desktopTabRoute}
                  menuActive={menuModalOpen}
                  onNavigate={(name) => navigationRef.current?.navigate?.(name)}
                  onAdd={() => { setMenuOpen(!menuOpen); }}
                  onMenu={() => setMenuModalOpen(true)}
                />
              </View>
            ) : null}
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
      {isWebDesktop ? (
        <Modal
          visible={menuModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuModalOpen(false)}
        >
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'stretch',
              ...(Platform.OS === 'web' ? { minHeight: '100vh' } : {}),
            }}
          >
            <View
              style={{
                width: Math.min(
                  266,
                  Math.max(232, Math.round(Dimensions.get('window').width * 0.31))
                ),
                flexShrink: 0,
                backgroundColor: colors.bg,
                maxWidth: '100%',
                ...(Platform.OS === 'web'
                  ? { boxShadow: '4px 0 32px rgba(0,0,0,0.18)', height: '100vh', maxHeight: '100vh' }
                  : { flex: 0 }),
              }}
            >
              <MenuScreen
                onClose={() => setMenuModalOpen(false)}
                onNavigateToTab={menuActions.closeAndNavigate}
                onOpenCadastro={menuActions.openCadastro}
                onOpenPerfil={menuActions.openPerfil}
                onOpenTemas={menuActions.openTemas}
                onOpenTermos={menuActions.openTermos}
                onOpenPrivacidade={menuActions.openPrivacidade}
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
                onOpenEmpresa={menuActions.openEmpresa}
                onOpenColaboradores={menuActions.openColaboradores}
                onOpenOrdemServico={menuActions.openOrdemServico}
                onOpenOrcamentos={menuActions.openOrcamentos}
                onOpenPDV={menuActions.openPDV}
                onOpenImageGenerator={menuActions.openImageGenerator}
                onOpenCalculadoraFull={menuActions.openCalculadoraFull}
                compact={false}
              />
            </View>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
              activeOpacity={1}
              onPress={() => setMenuModalOpen(false)}
              accessibilityLabel="Fechar menu"
            />
          </View>
        </Modal>
      ) : (
        <Modal visible={menuModalOpen} transparent animationType="fade" onRequestClose={() => setMenuModalOpen(false)}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'stretch' }}>
            <SafeAreaView
              style={{
                width: Math.round(Dimensions.get('window').width * 0.75),
                maxWidth: '100%',
                backgroundColor: colors.bg,
              }}
            >
              <MenuScreen
                onClose={() => setMenuModalOpen(false)}
                onNavigateToTab={menuActions.closeAndNavigate}
                onOpenCadastro={menuActions.openCadastro}
                onOpenPerfil={menuActions.openPerfil}
                onOpenTemas={menuActions.openTemas}
                onOpenTermos={menuActions.openTermos}
                onOpenPrivacidade={menuActions.openPrivacidade}
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
                onOpenEmpresa={menuActions.openEmpresa}
                onOpenColaboradores={menuActions.openColaboradores}
                onOpenOrdemServico={menuActions.openOrdemServico}
                onOpenOrcamentos={menuActions.openOrcamentos}
                onOpenPDV={menuActions.openPDV}
                onOpenImageGenerator={menuActions.openImageGenerator}
                onOpenCalculadoraFull={menuActions.openCalculadoraFull}
              />
            </SafeAreaView>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
              activeOpacity={1}
              onPress={() => setMenuModalOpen(false)}
              accessibilityLabel="Fechar menu"
            />
          </View>
        </Modal>
      )}
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
      <Modal visible={privacidadeModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <PoliticaPrivacidadeScreen onClose={() => setPrivacidadeModal(false)} isModal />
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
      <Modal visible={colaboradoresModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <ColaboradoresScreen onClose={() => setColaboradoresModal(false)} isModal />
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
        onExpand={isWebDesktop ? undefined : () => { setCalculadoraFloating(false); setCalculadoraModal(true); }}
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

