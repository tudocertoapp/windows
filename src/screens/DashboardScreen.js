import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, ScrollView, StyleSheet, Image, ImageBackground, TouchableOpacity, Dimensions, FlatList, LayoutAnimation, UIManager, Platform, Alert, Modal, TextInput, KeyboardAvoidingView, useWindowDimensions, Linking, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFinance } from '../contexts/FinanceContext';
import { useBanks } from '../contexts/BanksContext';
import { useTheme } from '../contexts/ThemeContext';
import { useMenu } from '../contexts/MenuContext';
import { useProfile } from '../contexts/ProfileContext';
import { usePlan } from '../contexts/PlanContext';
import { useKeyboardShortcuts } from '../contexts/KeyboardShortcutsContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotes } from '../contexts/NotesContext';
import { useShoppingList } from '../contexts/ShoppingListContext';
import { useValuesVisibility } from '../contexts/ValuesVisibilityContext';
import { TopBar } from '../components/TopBar';
import { ViewModeToggle, getViewModeToggleScrollStyle } from '../components/ViewModeToggle';
import { GlassCard } from '../components/GlassCard';
import { MeusGastosChat } from '../components/MeusGastosChat';
import { VisionOcrStatusBadge } from '../components/VisionOcrStatusBadge';
import { DraggableCard } from '../components/DraggableCard';
import { CardPickerModal } from '../components/CardPickerModal';
import { InicioDesktopGrid } from '../components/InicioDesktopGrid';
import { clampCardsPerRow, DEFAULT_CARDS_PER_ROW, moveCardByArrow } from '../utils/inicioDesktopLayout';
import { ScrollableCardList } from '../components/ScrollableCardList';
import { CardExpandedModal } from '../components/CardExpandedModal';
import { CardScrollbar, CARD_SCROLLBAR_W } from '../components/CardScrollbar';
import { playTapSound } from '../utils/sounds';
import { confirmDestructive, onDeletePress } from '../utils/confirm';
import { openWhatsApp } from '../utils/whatsapp';
import { formatCurrency } from '../utils/format';
import { promptConcluirAgenda } from '../utils/agendaFaturamento';
import { transactionMatchesViewMode } from '../utils/viewModeFilter';
import { getBoletoDueDateObject, sortBoletosForDisplay, dedupeBoletos } from '../utils/boletoDates';
import { getQuoteOfDay } from '../utils/quotes';
import { Ionicons } from '@expo/vector-icons';
import { AppIcon } from '../components/AppIcon';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SECTIONS, DEFAULT_SECTIONS_WEB, DINHEIRO_ADDABLE_CARDS, DINHEIRO_CARD_TYPES, ALL_INICIO_IDS, CARD_ICON_COLORS, AVAILABLE_CARD_TYPES } from '../constants/dashboardCards';
import {
  captureInicioLayout,
  cloneInicioLayout,
  SAVED_LAYOUT_KEY,
  FAVORITE_LAYOUT_KEY,
  subscribeInicioLayout,
  commitInicioLayoutToAccount,
} from '../constants/inicioLayouts';
import { getLayoutStorageKey, getDefaultForPlatform, useIsDesktopLayout, scaleWebDesktop } from '../utils/platformLayout';
import {
  DESKTOP_RELEASE_PAGE,
  resolveDesktopDownloadUrls,
  triggerDesktopDownload,
} from '../constants/desktopDownload';
import { loadCatalogoRotulosLocal } from '../utils/catalogoPersist';
import { chromeBtnBox } from '../utils/chromeButton';

const logoImage = require('../../assets/logo.png');
const SECTIONS_ORDER_KEY = '@tudocerto_dashboard_order';
const DESKTOP_WEIGHTS_KEY = '@tudocerto_inicio_desktop_weights';
const INICIO_LAYOUT_V2_KEY = '@tudocerto_inicio_layout_v2';
const COMPACT_BUTTONS_KEY = '@tudocerto_inicio_compact_buttons';

const CAROUSEL_IMAGES = {
  financas: require('../../assets/carousel/carousel-financas.png'),
  orcamento: require('../../assets/carousel/carousel-orcamento.png'),
  whatsapp: require('../../assets/carousel/carousel-whatsapp.png'),
  upgrade: require('../../assets/carousel/carousel-upgrade.png'),
  indique: require('../../assets/carousel/carousel-indique.png'),
  agenda: require('../../assets/carousel/carousel-agenda.png'),
  cards: require('../../assets/carousel/carousel-cards.png'),
};

const FRASES_PARABENS = [
  'Feliz aniversário! Desejo um dia especial cheio de alegria! 🎉',
  'Parabéns! Que todos os seus sonhos se realizem! 🎂',
  'Feliz aniversário! Muita saúde, paz e prosperidade! 🌟',
  'Parabéns pelo seu dia! Que seja repleto de momentos especiais! 🎁',
  'Feliz aniversário! Aproveite cada momento com quem ama! 💝',
  'Parabéns! Que este novo ano de vida seja incrível! ✨',
  'Feliz aniversário! Desejo muita felicidade e sucesso! 🥳',
  'Parabéns pelo seu dia! Celebremos a sua existência! 🎈',
  'Feliz aniversário! Que a vida te surpreenda sempre! 🌈',
  'Parabéns! Que este seja o melhor ano da sua vida! 🎊',
];
const { width: SW } = Dimensions.get('window');
const CARD_SUBTITLE_MARGIN_TOP = 2;
/** Alinhado à AgendaScreen: faixa da barra + afastamento dos botões +/- na timeline */
const AGENDA_TIMELINE_SCROLLBAR_W = CARD_SCROLLBAR_W;
const AGENDA_TIMELINE_ZOOM_GAP = 8;
const AGENDA_TIMELINE_ZOOM_RIGHT = AGENDA_TIMELINE_SCROLLBAR_W + AGENDA_TIMELINE_ZOOM_GAP;

function normAgendaText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNoiseAgendaText(s) {
  const t = String(s || '').trim();
  if (!t) return true;
  return /^(s+|n+|x+|\.+|-+|nowrap|ellipsis)$/i.test(t);
}

function getAgendaEventCardInfo(e, { client, service } = {}) {
  const title = (e?.tipo === 'empresa' && client?.name)
    ? String(client.name).trim()
    : (String(e?.title || '').replace(/^Pré-pedido\s*[-–]\s*/i, '').trim() || 'Evento');
  const t0 = String(e?.time || e?.timeStart || '').trim();
  let t1 = String(e?.timeEnd || '').trim();
  if (t0 && !t1) {
    const [h, m] = t0.split(':').map((x) => parseInt(x, 10));
    const total = ((Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0) + 30) % (24 * 60);
    t1 = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  const when = t0 ? `${t0}${t1 ? `-${t1}` : ''}` : '';
  let serviceName = String(service?.name || '').trim();
  const items = Array.isArray(e?.preOrderItems) ? e.preOrderItems : [];
  if (!serviceName && items.length) {
    serviceName = items.map((i) => i?.name).filter(Boolean).join(', ');
  }
  if (isNoiseAgendaText(serviceName) || normAgendaText(serviceName) === normAgendaText(title)) {
    serviceName = items.length
      ? items.map((i) => i?.name).filter((n) => n && normAgendaText(n) !== normAgendaText(title)).join(', ')
      : '';
  }
  const itemsTotal = items.reduce((s, i) => s + ((Number(i?.price) || 0) - (Number(i?.discount) || 0)) * (Number(i?.qty) || 1), 0);
  const value = Number(e?.amount) > 0 ? Number(e.amount) : itemsTotal;
  const detail = value > 0 ? formatCurrency(value) : '';
  return { title, when, phone: '', serviceName, desc: '', detail };
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ds = StyleSheet.create({
  headerLogo: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  logoLarge: { width: 100, height: 100 },
  appTitle: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  monthText: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  balanceCard: { margin: 16, padding: 20, borderRadius: 20 },
  balanceLabel: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  balanceAmount: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 8 },
  balanceRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  balanceBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 },
  boxLabel: { fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  boxValue: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 4 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  catItem: { marginBottom: 14 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { fontSize: 13, fontWeight: '500' },
  catAmount: { fontSize: 13, fontWeight: '600' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, gap: 12 },
  txIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  txDesc: { fontSize: 14, fontWeight: '500' },
  txCat: { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '600' },
  greeting: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  carousel: { marginTop: 8, height: 205, marginHorizontal: 0, paddingVertical: 8, overflow: 'visible' },
  carouselItem: { height: 165, borderRadius: 20, padding: 20, borderWidth: 1 },
  carouselTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  carouselText: { fontSize: 12, lineHeight: 16 },
  quoteCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, borderWidth: 1 },
  quoteText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    fontFamily: Platform.OS === 'web' ? 'Georgia' : 'serif',
  },
  quoteType: { fontSize: 9, marginTop: 8, letterSpacing: 1 },
  tab: { paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabText: { fontSize: 12, fontWeight: '600' },
});

function parseBoletoDate(str) {
  if (!str) return null;
  const parts = String(str).trim().split(/[/\-]/);
  if (parts.length < 3) return null;
  const day = parseInt(parts[0], 10) || 1;
  const month = (parseInt(parts[1], 10) || 1) - 1;
  const year = parseInt(parts[2], 10) || new Date().getFullYear();
  return new Date(year, month, day);
}

function parseDateKey(str) {
  if (!str) return null;
  const parts = String(str).trim().split(/[/\-]/);
  if (parts.length < 3) return null;
  const day = parseInt(parts[0], 10) || 1;
  const month = (parseInt(parts[1], 10) || 1) - 1;
  const year = parseInt(parts[2], 10) || new Date().getFullYear();
  return new Date(year, month, day);
}

function CarouselDesktopDownloadActions({
  colors,
  quickRowTheme,
  compact,
  fontSize = 10,
  btnPadV = 5,
  btnPadH = 6,
  iconSize = 13,
  rowGap = 5,
}) {
  const [downloads, setDownloads] = useState(null);

  useEffect(() => {
    let cancelled = false;
    resolveDesktopDownloadUrls()
      .then((resolved) => {
        if (!cancelled) setDownloads(resolved);
      })
      .catch(() => {
        if (!cancelled) setDownloads(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openDownload = (platform) => (e) => {
    e?.stopPropagation?.();
    playTapSound();
    if (!downloads) return;
    if (!downloads.available?.[platform]) {
      Alert.alert(
        'Download indisponível',
        platform === 'mac'
          ? 'O instalador para Mac ainda não está na release. Use Windows ou abra a página de releases.'
          : platform === 'linux'
            ? 'O instalador para Linux ainda não está na release. Use Windows ou abra a página de releases.'
            : 'Instalador não encontrado. Abra a página de releases.',
        [
          { text: 'Página de releases', onPress: () => Linking.openURL(DESKTOP_RELEASE_PAGE) },
          { text: 'OK', style: 'cancel' },
        ],
      );
      return;
    }
    const entry = downloads[platform];
    const ok = triggerDesktopDownload(entry?.url);
    if (!ok) Linking.openURL(DESKTOP_RELEASE_PAGE);
  };
  const btnBorder = quickRowTheme?.btnBorder ?? colors.primary;
  const btnBg = quickRowTheme?.btnBg ?? 'rgba(248,250,252,0.96)';
  const iconColor = quickRowTheme?.icon ?? colors.primary;
  const textColor = quickRowTheme?.text ?? colors.primary;
  const btnStyle = {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: btnPadV,
    paddingHorizontal: btnPadH,
    borderRadius: 14,
    backgroundColor: btnBg,
    borderWidth: 1,
    borderColor: btnBorder,
  };
  const platforms = [
    { id: 'windows', label: 'Windows', icon: 'logo-windows', a11y: 'Baixar para Windows' },
    { id: 'mac', label: 'Mac', icon: 'logo-apple', a11y: 'Baixar para Mac' },
    { id: 'linux', label: 'Linux', icon: 'logo-tux', a11y: 'Baixar para Linux' },
  ];
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: rowGap, marginTop: compact ? 6 : 8, width: '100%' }}>
      {platforms.map((p) => {
        const unavailable = downloads && downloads.available?.[p.id] === false;
        return (
        <TouchableOpacity
          key={p.id}
          onPress={openDownload(p.id)}
          activeOpacity={0.85}
          style={[btnStyle, unavailable ? { opacity: 0.45 } : null]}
          accessibilityRole="button"
          accessibilityLabel={p.a11y}
        >
          <Ionicons name={p.icon} size={iconSize} color={iconColor} />
          <Text style={{ fontWeight: '700', color: textColor, fontSize }} numberOfLines={1}>
            {p.label}
          </Text>
        </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function DashboardScreen() {
  const isWeb = Platform.OS === 'web';
  const isDesktopLayout = useIsDesktopLayout();
  const useWebLayout = isWeb && isDesktopLayout;
  // No web desktop, o grid externo controla spacing/width. Evita "dobrar" margens e causar desalinhamento/sobreposição.
  const WEB_CARD_MARGIN_H = useWebLayout ? 0 : 16;
  const WEB_CARD_MARGIN_TOP = useWebLayout ? 0 : 16;
  /** Mesma “coluna” visual do grid tarefas+agenda: borda esquerda/direita alinhada em todos os cards full-width. */
  const WEB_DESKTOP_PAGE_PAD = scaleWebDesktop(10, useWebLayout);
  const WEB_DESKTOP_ROW_GAP = scaleWebDesktop(16, useWebLayout);
  const QUICK_ROW_BTN_H = scaleWebDesktop(36, true);
  const QUICK_ROW_FADE_TOP = 64;
  const QUICK_ROW_PAD_BOTTOM = 12;
  const QUICK_ROW_SOLID_AT = (QUICK_ROW_FADE_TOP + QUICK_ROW_BTN_H / 2) / (QUICK_ROW_FADE_TOP + QUICK_ROW_BTN_H + QUICK_ROW_PAD_BOTTOM);
  const WEB_CARD_PADDING = useWebLayout ? scaleWebDesktop(12, useWebLayout) : 20;
  const WEB_HEADER_GAP = useWebLayout ? scaleWebDesktop(5, useWebLayout) : 12;
  const CARD_ACTION_SIZE = useWebLayout ? scaleWebDesktop(26, useWebLayout) : 40;
  const CARD_ACTION_ICON_SIZE = useWebLayout ? scaleWebDesktop(17, useWebLayout) : 24;
  const CARD_EXPAND_ICON_SIZE = useWebLayout ? scaleWebDesktop(16, useWebLayout) : 22;
  // Web desktop: cards compactos (tarefas + agendamentos)
  const TRIO_CARD_HEIGHT = useWebLayout ? scaleWebDesktop(178, useWebLayout) : undefined;
  const HEADER_ICON_BOX_SIZE = useWebLayout ? scaleWebDesktop(40, useWebLayout) : 48;
  const HEADER_ICON_SIZE = useWebLayout ? scaleWebDesktop(22, useWebLayout) : 26;
  const CARD_PREVIEW_MAX_ITEMS = 5;
  const route = useRoute();
  const navigation = useNavigation();
  const { transactions, checkListItems, agendaEvents, boletos, clients, products, services, aReceber, updateCheckListItem, deleteCheckListItem, updateAgendaEvent, deleteAgendaEvent, addCheckListItem, deleteTransaction, updateTransaction, updateBoleto, deleteBoleto } = useFinance();

  const agendaClientFor = useCallback(
    (e) => {
      if (!e?.clientId || !clients?.length) return null;
      return clients.find((c) => String(c.id) === String(e.clientId)) || null;
    },
    [clients],
  );
  const agendaServiceFor = useCallback(
    (e) => {
      if (!e?.serviceId || !services?.length) return null;
      return services.find((s) => String(s.id) === String(e.serviceId)) || null;
    },
    [services],
  );
  const { banks, cards, addToBank, deductFromBank, addToCardBalance, deductFromCardBalance, getBankById } = useBanks();
  const { colors } = useTheme();
  const quickRowTheme = useMemo(() => ({
    btnBg: colors.card,
    btnBorder: colors.border,
    chipBg: colors.bg,
    chipBorder: colors.primary,
    chipText: colors.primary,
    icon: colors.textSecondary,
    text: colors.textSecondary,
  }), [colors.bg, colors.border, colors.card, colors.primary, colors.textSecondary]);
  const quickRowScrim = useMemo(() => {
    const hex = String(colors.bg || '#000000').replace('#', '');
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const r = parseInt(full.slice(0, 2), 16) || 0;
    const g = parseInt(full.slice(2, 4), 16) || 0;
    const b = parseInt(full.slice(4, 6), 16) || 0;
    return {
      transparent: `rgba(${r},${g},${b},0)`,
      fill: `rgba(${r},${g},${b},1)`,
    };
  }, [colors.bg]);
  const { viewMode, setViewMode, canToggleView, showEmpresaFeatures, plan, PLANS } = usePlan();
  const { shortcutsEnabled } = useKeyboardShortcuts();
  const { isGuest, user } = useAuth();
  const { openImageGenerator, openAReceber, openAddModal, openCadastro, openAnotacoes, openOrcamento, openOrcamentos, openAssinatura, openIndique, openManageCards, openCalculadoraFull, openMeusGastos, openListaCompras, openMensagensWhatsApp, openAniversariantes, openEmpresa, openPDV, openCatalogo } = useMenu();
  const [catalogoMenuLabel, setCatalogoMenuLabel] = useState('Meu Catálogo');
  const { notes, deleteNote } = useNotes();
  const { items: shoppingItems, updateItem: updateShoppingItem, deleteItem: deleteShoppingItem } = useShoppingList();
  const { profile, updateProfile } = useProfile();
  const [editMode, setEditMode] = useState(false);
  const [quoteType, setQuoteType] = useState('verso');
  const carouselRef = useRef(null);
  const [carouselIndex, setCarouselIndex] = useState(0); // display index 0..count-1
  const { width: winWidth } = useWindowDimensions();
  const isWebMobile = isWeb && !useWebLayout;
  const cardShadowStyle = isWeb
    ? {}
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
      };
  const fabShadowStyle = isWeb
    ? {}
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
      };
  const carouselViewportWidth = useMemo(() => {
    if (useWebLayout) return Math.min(Math.max((winWidth || SW) * 0.58, 460), 820);
    if (isWebMobile) return Math.max(260, (winWidth || SW) - WEB_CARD_MARGIN_H * 2);
    return winWidth || SW;
  }, [useWebLayout, isWebMobile, winWidth, WEB_CARD_MARGIN_H]);
  const { CARD_WIDTH, CARD_GAP, SNAP_INTERVAL, CAROUSEL_PADDING } = useMemo(() => {
    const w = Math.max(280, carouselViewportWidth || SW);
    const cw = useWebLayout
      ? Math.min(Math.max(w * 0.82, 420), 720)
      : (w * 0.78) + 32;
    const gap = 12;
    const snap = cw + gap;
    const pad = Math.max(0, (w - snap) / 2);
    return { CARD_WIDTH: cw, CARD_GAP: gap, SNAP_INTERVAL: snap, CAROUSEL_PADDING: pad };
  }, [carouselViewportWidth, useWebLayout]);
  const defaultSections = getDefaultForPlatform(DEFAULT_SECTIONS, { web: DEFAULT_SECTIONS_WEB });
  const sectionsStorageKey = getLayoutStorageKey(SECTIONS_ORDER_KEY);
  const desktopWeightsKey = getLayoutStorageKey(DESKTOP_WEIGHTS_KEY);
  const inicioLayoutV2Key = getLayoutStorageKey(INICIO_LAYOUT_V2_KEY);
  const savedLayoutKey = getLayoutStorageKey(SAVED_LAYOUT_KEY);
  const favoriteLayoutKey = getLayoutStorageKey(FAVORITE_LAYOUT_KEY);
  const compactButtonsKey = getLayoutStorageKey(COMPACT_BUTTONS_KEY);
  const [sectionOrder, setSectionOrder] = useState(defaultSections);
  const [desktopWeights, setDesktopWeights] = useState({});
  const [desktopHeights, setDesktopHeights] = useState({});
  const [desktopCols, setDesktopCols] = useState(DEFAULT_CARDS_PER_ROW);
  const [desktopRowCols, setDesktopRowCols] = useState({});
  const [desktopRowSpans, setDesktopRowSpans] = useState({});
  const [desktopSpanSide, setDesktopSpanSide] = useState({});
  const [compactButtons, setCompactButtons] = useState(false);
  const [hasSavedLayout, setHasSavedLayout] = useState(false);
  const [hasFavoriteLayout, setHasFavoriteLayout] = useState(false);
  const layoutHydratedRef = useRef(false);
  const editBaselineRef = useRef(null);
  const appliedCloudLayoutRef = useRef(false);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [balanceFilter, setBalanceFilter] = useState('mes');
  const [balanceFilterDate, setBalanceFilterDate] = useState(() => new Date());
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date(new Date().getFullYear(), 0, 1);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
  const { showValues, toggleValues } = useValuesVisibility();
  const [filtroListaCompras, setFiltroListaCompras] = useState('todos');
  const [showConcluidasProximos, setShowConcluidasProximos] = useState(false);
  const [showConcluidasAgendamentos, setShowConcluidasAgendamentos] = useState(false);
  const [showConcluidasListaCompras, setShowConcluidasListaCompras] = useState(false);
  /** Card Próximas faturas: alternar pendentes (por vencimento) / contas pagas */
  const [showContasPagasProxFaturas, setShowContasPagasProxFaturas] = useState(false);
  const [parabensModalClient, setParabensModalClient] = useState(null);
  const [parabensFrase, setParabensFrase] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  const [agendaCardDate, setAgendaCardDate] = useState(() => new Date());
  // Web desktop: zoom padrão menor para ver mais horas no card
  const [agendaCardZoom, setAgendaCardZoom] = useState(0.85);
  const [agendaCardActionsId, setAgendaCardActionsId] = useState(null);
  const [agendaCardTimelineScrollY, setAgendaCardTimelineScrollY] = useState(0);
  const [agendaCardShowMonthPicker, setAgendaCardShowMonthPicker] = useState(false);
  const [agendaCardPickerYear, setAgendaCardPickerYear] = useState(() => new Date().getFullYear());
  const [agendaCardPickerMonth, setAgendaCardPickerMonth] = useState(() => new Date().getMonth());
  const layoutsRef = useRef({});
  const [floatingId, setFloatingId] = useState(null);
  const now = new Date();
  const quote = getQuoteOfDay(quoteType);
  const { quoteBody, quoteSource } = useMemo(() => {
    const raw = String(quote || '').trim();
    // Versiculos vêm no formato "Referencia - texto". Ex: "Salmo 121:1-2 - ...".
    const sep = raw.indexOf(' - ');
    if (sep > 0) {
      return {
        quoteSource: raw.slice(0, sep).trim(),
        quoteBody: raw.slice(sep + 3).trim(),
      };
    }
    return { quoteBody: raw, quoteSource: '' };
  }, [quote]);

  const handleShareQuote = useCallback(async () => {
    const label = quoteType === 'motivacional' ? 'Frase do dia' : 'Versículo do dia';
    const message = quoteSource
      ? `"${quoteBody}"\n\n— ${quoteSource}\n\nAgenda e finanças em um app. Tudo Certo.`
      : `"${quoteBody}"\n\nAgenda e finanças em um app. Tudo Certo.`;
    try {
      await Share.share({ message, title: `Tudo Certo — ${label}` });
    } catch (_) {
      openImageGenerator?.({ quote, quoteType });
    }
  }, [quoteBody, quoteSource, quoteType, quote, openImageGenerator]);

  useEffect(() => {
    if (!showEmpresaFeatures) return undefined;
    let cancelled = false;
    loadCatalogoRotulosLocal()
      .then((r) => { if (!cancelled) setCatalogoMenuLabel(r.menuLabel); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [showEmpresaFeatures]);

  const webDesktopQuickButtons = useMemo(() => {
    if (!useWebLayout || !showEmpresaFeatures) return [];
    const buttons = [
      { id: 'abrir-caixa', label: 'Abrir caixa', icon: 'cart-outline', onPress: () => openPDV?.(), color: CARD_ICON_COLORS.proximos },
      { id: 'minha-loja', label: catalogoMenuLabel, icon: 'storefront-outline', onPress: () => openCatalogo?.(), color: CARD_ICON_COLORS.meusgastos },
    ];
    buttons.push(
      { id: 'produtos', label: 'Produtos', icon: 'cube-outline', onPress: () => openCadastro?.('produtos'), color: CARD_ICON_COLORS.agendamentos },
      { id: 'servicos', label: 'Serviços', icon: 'construct-outline', onPress: () => openCadastro?.('servicos'), color: CARD_ICON_COLORS.meusgastos },
      { id: 'clientes', label: 'Clientes', icon: 'people-outline', onPress: () => openCadastro?.('clientes'), color: CARD_ICON_COLORS.aniversariantes },
      { id: 'fornecedores', label: 'Fornecedor', icon: 'business-outline', onPress: () => openCadastro?.('fornecedores'), color: CARD_ICON_COLORS.anotacoes },
      { id: 'orcamentos', label: 'Orçamentos', icon: 'document-text-outline', onPress: () => (openOrcamentos?.() || openOrcamento?.()), color: CARD_ICON_COLORS.listacompras },
      { id: 'a-receber', label: 'A receber', icon: 'card-outline', onPress: () => openAReceber?.(), color: CARD_ICON_COLORS.quote },
      { id: 'relatorios', label: 'Relatórios', icon: 'stats-chart-outline', onPress: () => openEmpresa?.(), color: CARD_ICON_COLORS.proximasfaturas },
    );
    return buttons;
  }, [
    useWebLayout,
    showEmpresaFeatures,
    catalogoMenuLabel,
    openAReceber,
    openCadastro,
    openCatalogo,
    openEmpresa,
    openOrcamento,
    openOrcamentos,
    openPDV,
  ]);

  useEffect(() => {
    if (!(isWeb && useWebLayout)) return undefined;
    if (typeof window === 'undefined') return undefined;
    const isTypingTarget = (target) => {
      const tag = target?.tagName?.toLowerCase?.();
      return (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable
      );
    };
    const onKeyDown = (event) => {
      if (!shortcutsEnabled) return;
      if (isTypingTarget(event?.target)) return;
      if (event?.ctrlKey || event?.shiftKey || event?.altKey || event?.metaKey) return;
      const keyRaw = String(event?.key || event?.code || '').toUpperCase();
      const match = keyRaw.match(/^F(\d{1,2})$/);
      if (!match) return;
      const fnNumber = Number(match[1]);
      if (!Number.isFinite(fnNumber)) return;
      if (canToggleView && (fnNumber === 9 || fnNumber === 10)) {
        if (plan === PLANS.empresa && fnNumber === 9) return;
        event.preventDefault();
        playTapSound();
        setViewMode(fnNumber === 9 ? 'pessoal' : 'empresa');
        return;
      }
      if (!showEmpresaFeatures) return;
      if (fnNumber < 1 || fnNumber > webDesktopQuickButtons.length) return;
      event.preventDefault();
      playTapSound();
      webDesktopQuickButtons[fnNumber - 1]?.onPress?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isWeb, useWebLayout, showEmpresaFeatures, canToggleView, plan, PLANS, webDesktopQuickButtons, setViewMode, shortcutsEnabled]);


  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(sectionsStorageKey),
      AsyncStorage.getItem(inicioLayoutV2Key),
      AsyncStorage.getItem(desktopWeightsKey),
      AsyncStorage.getItem(compactButtonsKey),
      AsyncStorage.getItem(savedLayoutKey),
      AsyncStorage.getItem(favoriteLayoutKey),
    ]).then(([raw, v2, weightsRaw, compactRaw, savedRaw, favoriteRaw]) => {
      try {
        if (weightsRaw) {
          const w = JSON.parse(weightsRaw);
          if (w && typeof w === 'object') {
            if (w.weights || w.heights || w.cols) {
              if (w.weights && typeof w.weights === 'object') setDesktopWeights(w.weights);
              if (w.heights && typeof w.heights === 'object') setDesktopHeights(w.heights);
              if (w.cols != null) setDesktopCols(clampCardsPerRow(w.cols));
              if (w.rowCols && typeof w.rowCols === 'object') setDesktopRowCols(w.rowCols);
              if (w.rowSpans && typeof w.rowSpans === 'object') setDesktopRowSpans(w.rowSpans);
              if (w.spanSide && typeof w.spanSide === 'object') setDesktopSpanSide(w.spanSide);
            } else {
              setDesktopWeights(w);
            }
          }
        }
      } catch (_) {}
      setCompactButtons(compactRaw === '1' || compactRaw === 'true');
      setHasSavedLayout(!!savedRaw);
      setHasFavoriteLayout(!!favoriteRaw);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const allowedSections = new Set(ALL_INICIO_IDS);
          let filtered = Array.isArray(parsed)
            ? parsed
                .map((id) => (id === 'contas' ? 'proximasfaturas' : id))
                .filter((id) => id !== 'contas')
                .filter((id) => id !== 'tarefas')
                .filter((id) => allowedSections.has(id === 'tarefas' ? 'proximos' : id))
                .map((id) => (id === 'tarefas' ? 'proximos' : id))
            : defaultSections;
          filtered = [...new Set(filtered)];
          const base = filtered.length > 0 ? filtered : [...defaultSections];
          if (!v2) {
            if (!base.includes('agenda') && defaultSections.includes('agenda')) {
              const i = base.includes('proximos') ? base.indexOf('proximos') + 1 : 0;
              base.splice(i, 0, 'agenda');
            }
            if (base.includes('agenda') && !base.includes('agendamentos')) {
              base.splice(base.indexOf('agenda') + 1, 0, 'agendamentos');
            }
            AsyncStorage.setItem(inicioLayoutV2Key, '1');
          }
          setSectionOrder(base);
        } catch (_) {
          setSectionOrder(defaultSections);
        }
      } else {
        setSectionOrder(defaultSections);
        AsyncStorage.setItem(inicioLayoutV2Key, '1');
      }
      layoutHydratedRef.current = true;
    });
  }, [sectionsStorageKey, defaultSections, inicioLayoutV2Key, desktopWeightsKey, compactButtonsKey, savedLayoutKey, favoriteLayoutKey, useWebLayout]);
  useEffect(() => {
    if (route.params?.openCardPicker) {
      setShowCardPicker(true);
      navigation?.setParams?.({ openCardPicker: undefined });
    }
  }, [route.params?.openCardPicker, navigation]);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onEsc = (ev) => {
      if (agendaCardShowMonthPicker) {
        setAgendaCardShowMonthPicker(false);
        ev.preventDefault();
        return;
      }
      if (parabensModalClient) {
        setParabensModalClient(null);
        ev.preventDefault();
        return;
      }
      if (expandedCard) {
        setExpandedCard(null);
        ev.preventDefault();
        return;
      }
      if (showCardPicker) {
        setShowCardPicker(false);
        ev.preventDefault();
      }
    };
    window.addEventListener('tc:escape', onEsc);
    return () => window.removeEventListener('tc:escape', onEsc);
  }, [agendaCardShowMonthPicker, parabensModalClient, expandedCard, showCardPicker]);
  useEffect(() => {
    if (!layoutHydratedRef.current || editMode) return;
    const toSave = sectionOrder.filter((id) => id !== 'tarefas');
    AsyncStorage.setItem(sectionsStorageKey, JSON.stringify(toSave.length > 0 ? toSave : defaultSections));
  }, [sectionOrder, sectionsStorageKey, defaultSections, editMode]);

  useEffect(() => {
    if (!layoutHydratedRef.current || editMode || !useWebLayout) return;
    AsyncStorage.setItem(desktopWeightsKey, JSON.stringify({
      weights: desktopWeights || {},
      heights: desktopHeights || {},
      cols: clampCardsPerRow(desktopCols),
      rowCols: desktopRowCols || {},
      rowSpans: desktopRowSpans || {},
      spanSide: desktopSpanSide || {},
    }));
  }, [desktopWeights, desktopHeights, desktopCols, desktopRowCols, desktopRowSpans, desktopSpanSide, desktopWeightsKey, useWebLayout, editMode]);

  useEffect(() => {
    if (!layoutHydratedRef.current || editMode) return;
    AsyncStorage.setItem(compactButtonsKey, compactButtons ? '1' : '0').catch(() => {});
  }, [compactButtons, compactButtonsKey, editMode]);

  const applyInicioLayout = useCallback((layout) => {
    if (!layout || typeof layout !== 'object') return;
    if (Array.isArray(layout.order) && layout.order.length) {
      const allowed = new Set(ALL_INICIO_IDS);
      const next = [...new Set(layout.order.filter((id) => allowed.has(id)))];
      if (next.length) setSectionOrder(next);
    }
    setDesktopWeights(layout.weights && typeof layout.weights === 'object' ? layout.weights : {});
    setDesktopHeights(layout.heights && typeof layout.heights === 'object' ? layout.heights : {});
    if (layout.cols != null) setDesktopCols(clampCardsPerRow(layout.cols));
    setDesktopRowCols(layout.rowCols && typeof layout.rowCols === 'object' ? layout.rowCols : {});
    setDesktopRowSpans(layout.rowSpans && typeof layout.rowSpans === 'object' ? layout.rowSpans : {});
    setDesktopSpanSide(layout.spanSide && typeof layout.spanSide === 'object' ? layout.spanSide : {});
    setCompactButtons(!!layout.compactButtons);
  }, []);

  const captureCurrentInicioLayout = useCallback(() => captureInicioLayout({
    order: sectionOrder,
    weights: desktopWeights,
    heights: desktopHeights,
    cols: desktopCols,
    rowCols: desktopRowCols,
    rowSpans: desktopRowSpans,
    spanSide: desktopSpanSide,
    compactButtons,
  }), [sectionOrder, desktopWeights, desktopHeights, desktopCols, desktopRowCols, desktopRowSpans, desktopSpanSide, compactButtons]);

  const saveCurrentInicioLayout = useCallback(async () => {
    const snap = captureCurrentInicioLayout();
    await commitInicioLayoutToAccount(snap, { updateProfile });
    editBaselineRef.current = cloneInicioLayout(snap);
    appliedCloudLayoutRef.current = true;
    setHasSavedLayout(true);
    Alert.alert('Layout salvo', 'A organização do Início foi gravada neste aparelho e na sua conta.');
  }, [captureCurrentInicioLayout, updateProfile]);

  const saveFavoriteInicioLayout = useCallback(async () => {
    const snap = captureCurrentInicioLayout();
    await commitInicioLayoutToAccount(snap, { updateProfile, asFavorite: true });
    setHasFavoriteLayout(true);
    Alert.alert('Favorito', 'Este layout foi guardado como favorito.');
  }, [captureCurrentInicioLayout, updateProfile]);

  const loadSavedInicioLayout = useCallback(async () => {
    const raw = await AsyncStorage.getItem(savedLayoutKey);
    if (!raw) return;
    try {
      applyInicioLayout(JSON.parse(raw));
    } catch (_) {}
  }, [savedLayoutKey, applyInicioLayout]);

  const loadFavoriteInicioLayout = useCallback(async () => {
    let layout = profile?.inicio_layout_favorite;
    try {
      const raw = await AsyncStorage.getItem(favoriteLayoutKey);
      if (raw) layout = JSON.parse(raw);
    } catch (_) {}
    if (layout) applyInicioLayout(layout);
  }, [favoriteLayoutKey, applyInicioLayout, profile?.inicio_layout_favorite]);

  const toggleEditMode = useCallback(() => {
    playTapSound();
    if (editMode) {
      const base = editBaselineRef.current;
      if (base) applyInicioLayout(base);
      setEditMode(false);
      return;
    }
    editBaselineRef.current = captureCurrentInicioLayout();
    setEditMode(true);
  }, [editMode, applyInicioLayout, captureCurrentInicioLayout]);

  useEffect(() => {
    return subscribeInicioLayout((layout, meta) => {
      if (!layout || editMode) return;
      applyInicioLayout(layout);
      if (meta?.committed) {
        appliedCloudLayoutRef.current = true;
        editBaselineRef.current = cloneInicioLayout(layout);
        setHasSavedLayout(true);
      }
      if (meta?.favorite) setHasFavoriteLayout(true);
    });
  }, [applyInicioLayout, editMode]);

  useEffect(() => {
    if (appliedCloudLayoutRef.current || editMode) return;
    const lay = profile?.inicio_layout;
    if (!lay || typeof lay !== 'object') return;
    appliedCloudLayoutRef.current = true;
    applyInicioLayout(lay);
    editBaselineRef.current = cloneInicioLayout(lay);
    setHasSavedLayout(true);
  }, [profile?.inicio_layout, applyInicioLayout, editMode]);

  useEffect(() => {
    if (profile?.inicio_layout_favorite) setHasFavoriteLayout(true);
  }, [profile?.inicio_layout_favorite]);

  const filteredTx = useMemo(() => {
    if (!canToggleView) return transactions;
    return transactions.filter((t) => transactionMatchesViewMode(t, viewMode));
  }, [transactions, viewMode, canToggleView]);

  const parseDateStr = useCallback((str) => {
    if (!str || !String(str).trim()) return null;
    const parts = String(str).trim().split(/[/\-]/);
    if (parts.length < 3) return null;
    const day = parseInt(parts[0], 10) || 1;
    const month = (parseInt(parts[1], 10) || 1) - 1;
    const year = parseInt(parts[2], 10) || new Date().getFullYear();
    return new Date(year, month, day);
  }, []);

  const formatBrShort = useCallback((d) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }, []);

  const normalizeAgendaDateKey = useCallback((str) => {
    if (!str || !String(str).trim()) return '';
    const s = String(str).trim();
    const parts = s.split(/[/\-]/);
    if (parts.length < 3) return '';
    let day; let month; let year;
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return '';
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }, []);

  const isSameDay = useCallback((a, b) => {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }, []);

  const agendaCardWeek = useMemo(() => {
    const base = new Date(agendaCardDate);
    base.setHours(0, 0, 0, 0);
    const day = base.getDay(); // 0..6 (dom..sab)
    const weekStart = new Date(base);
    // igual à Agenda: semana iniciando no domingo
    weekStart.setDate(base.getDate() - day);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [agendaCardDate]);

  const agendaMonthLabel = useMemo(() => {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[agendaCardDate.getMonth()]} ${agendaCardDate.getFullYear()}`;
  }, [agendaCardDate]);

  const agendaCalendarGrid = useMemo(() => {
    const year = agendaCardPickerYear;
    const month = agendaCardPickerMonth;
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDow = first.getDay();
    const daysInMonth = last.getDate();
    const cells = [];
    for (let i = 0; i < startDow; i += 1) cells.push({ date: new Date(year, month, -startDow + i + 1), empty: true });
    for (let d = 1; d <= daysInMonth; d += 1) cells.push({ date: new Date(year, month, d), empty: false });
    while (cells.length % 7 !== 0) cells.push({ date: new Date(year, month, daysInMonth + (cells.length - (startDow + daysInMonth)) + 1), empty: true });
    return cells.slice(0, 42);
  }, [agendaCardPickerYear, agendaCardPickerMonth]);

  useEffect(() => {
    if (agendaCardShowMonthPicker) {
      setAgendaCardPickerYear(agendaCardDate.getFullYear());
      setAgendaCardPickerMonth(agendaCardDate.getMonth());
    }
  }, [agendaCardShowMonthPicker, agendaCardDate]);

  const agendaMonthDays = useMemo(() => {
    const y = agendaCardDate.getFullYear();
    const m = agendaCardDate.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: last }).map((_, i) => new Date(y, m, i + 1));
  }, [agendaCardDate]);

  const agendaDayCounts = useMemo(() => {
    const counts = {};
    (agendaEvents || []).forEach((e) => {
      const key = normalizeAgendaDateKey(e?.date);
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [agendaEvents, normalizeAgendaDateKey]);

  const handleAgendaCardCalendarDaySelect = useCallback((d) => {
    playTapSound();
    setAgendaCardDate(new Date(d));
    setAgendaCardShowMonthPicker(false);
  }, []);

  const agendaCardEvents = useMemo(() => {
    const targetKey = formatBrShort(agendaCardDate);
    const list = (agendaEvents || []).filter((e) => normalizeAgendaDateKey(e?.date) === targetKey);
    const toMinutes = (t) => {
      if (!t) return 0;
      const [h, m] = String(t).split(':').map((x) => parseInt(x, 10));
      return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
    };
    const startOf = (e) => toMinutes(e?.timeStart || e?.time);
    return list.sort((a, b) => startOf(a) - startOf(b));
  }, [agendaEvents, agendaCardDate, formatBrShort, normalizeAgendaDateKey]);

  const agendaCardTimeline = useMemo(() => {
    const toMinutes = (t) => {
      if (!t) return 0;
      const [h, m] = String(t).split(':').map((x) => parseInt(x, 10));
      return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
    };
    const clamp = (n, a, b) => Math.max(a, Math.min(n, b));
    const items = (agendaCardEvents || []).map((e) => {
      const startM = clamp(toMinutes(e?.timeStart || e?.time), 0, 24 * 60);
      const endRaw = e?.timeEnd ? toMinutes(e.timeEnd) : (startM + 30);
      const endM = clamp(Math.max(endRaw, startM + 30), 0, 24 * 60);
      return { e, startM, endM, durM: endM - startM };
    }).sort((a, b) => a.startM - b.startM || a.endM - b.endM);
    const laneEnds = [];
    const withLanes = items.map((item) => {
      let lane = 0;
      while (lane < laneEnds.length && laneEnds[lane] > item.startM) lane += 1;
      if (lane === laneEnds.length) laneEnds.push(item.endM);
      else laneEnds[lane] = item.endM;
      return { ...item, lane };
    });
    return withLanes.map((item) => {
      const overlapping = withLanes.filter((o) => o.startM < item.endM && o.endM > item.startM);
      const lanesUsed = Math.max(1, ...overlapping.map((o) => o.lane + 1));
      return { ...item, lanesUsed };
    });
  }, [agendaCardEvents]);

  const periodTx = useMemo(() => {
    const ref = balanceFilterDate;
    return filteredTx.filter((t) => {
      const d = new Date(t.date);
      d.setHours(0, 0, 0, 0);
      if (balanceFilter === 'periodo') {
        const start = parseDateStr(periodStart);
        const end = parseDateStr(periodEnd);
        if (!start || !end) return true;
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      }
      if (balanceFilter === 'dia') {
        return d.getDate() === ref.getDate() && d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
      }
      if (balanceFilter === 'mes') {
        return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
      }
      return d.getFullYear() === ref.getFullYear();
    });
  }, [filteredTx, balanceFilter, balanceFilterDate, periodStart, periodEnd, parseDateStr]);

  const monthTx = periodTx;

  const income = useMemo(() => monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0), [monthTx]);
  const expense = useMemo(() => monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [monthTx]);
  const balance = income - expense;

  const balanceFilterLabel = balanceFilter === 'periodo'
    ? `${periodStart} a ${periodEnd}`
    : balanceFilter === 'dia'
      ? balanceFilterDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      : balanceFilter === 'mes'
        ? balanceFilterDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        : balanceFilterDate.getFullYear().toString();

  const adjustBalanceFilterDate = (delta) => {
    const d = new Date(balanceFilterDate);
    if (balanceFilter === 'dia') d.setDate(d.getDate() + delta);
    else if (balanceFilter === 'mes') d.setMonth(d.getMonth() + delta);
    else d.setFullYear(d.getFullYear() + delta);
    setBalanceFilterDate(d);
  };

  /** Faturas para o card Início: pendentes por vencimento; pagas por data desc. */
  const proximasFaturasLists = useMemo(() => {
    let list = sortBoletosForDisplay(dedupeBoletos(boletos || []));
    if (canToggleView) list = list.filter((b) => (b.tipo || 'pessoal') === viewMode);
    const unpaid = list
      .filter((b) => !b.paid)
      .map((b) => ({ ...b, _due: getBoletoDueDateObject(b) }))
      .sort((a, b) => {
        const ta = a._due ? a._due.getTime() : 9e15;
        const tb = b._due ? b._due.getTime() : 9e15;
        return ta - tb;
      });
    const paid = list
      .filter((b) => b.paid)
      .sort((a, b) => {
        const da = parseBoletoDate(a.dueDate) || new Date(0);
        const db = parseBoletoDate(b.dueDate) || new Date(0);
        return db - da;
      });
    return { unpaid, paid, all: list };
  }, [boletos, canToggleView, viewMode]);

  const fmt = formatCurrency;
  const mask = (v) => (showValues ? v : '••••••');

  const catBreakdown = useMemo(() => {
    const m = {};
    monthTx.filter((t) => t.type === 'expense').forEach((t) => (m[t.category] = (m[t.category] || 0) + t.amount));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [monthTx]);

  const carouselItems = useMemo(() => {
    const isEmpresa = viewMode === 'empresa' && showEmpresaFeatures;
    const base = [
      ...(Platform.OS === 'web'
        ? [{
            id: 'desktop',
            title: 'Baixe o Tudo Certo',
            text: 'Instale no Windows, Mac ou Linux: PDV, agenda e finanças com atalhos de teclado.',
            icon: 'desktop-outline',
            color: colors.primary,
            onPress: 'desktopDownload',
            image: CAROUSEL_IMAGES.upgrade,
          }]
        : []),
      { id: '1', title: 'Gerencie suas finanças', text: 'Receitas, despesas e controle total em um só lugar.', icon: 'wallet-outline', color: '#10b981', onPress: 'dinheiro', image: CAROUSEL_IMAGES.financas },
      { id: '2', title: 'Limite seu orçamento', text: 'Mantenha sua vida organizada.', icon: 'cash-outline', color: '#dc2626', onPress: 'orcamento', image: CAROUSEL_IMAGES.orcamento },
      ...(isEmpresa ? [{ id: 'whatsapp', title: 'Envie mensagem para seus clientes', text: 'Use o WhatsApp para conversar, enviar lembretes e templates aos seus clientes.', icon: 'logo-whatsapp', color: '#25D366', onPress: 'whatsapp', image: CAROUSEL_IMAGES.whatsapp }] : []),
      { id: '3', title: 'Faça upgrade do seu plano', text: 'Plano Empresa: CRM, produtos compostos e muito mais.', icon: 'rocket-outline', color: '#8b5cf6', onPress: 'assinatura', image: CAROUSEL_IMAGES.upgrade },
      { id: '4', title: 'Indique um amigo e ganhe', text: 'Convide amigos e ganhe benefícios exclusivos.', icon: 'people-outline', color: '#f59e0b', onPress: 'indique', image: CAROUSEL_IMAGES.indique },
      { id: '5', title: 'Agenda', text: 'Agende seus clientes e eventos.', icon: 'calendar-outline', color: '#06b6d4', onPress: 'agenda', image: CAROUSEL_IMAGES.agenda },
      ...(!useWebLayout
        ? [{ id: '6', title: 'Cards personalizáveis', text: 'Toque no ícone de grade ao lado para gerenciar os cards do Início.', icon: 'grid-outline', color: '#ec4899', onPress: 'cards', image: CAROUSEL_IMAGES.cards }]
        : []),
    ];
    return base;
  }, [viewMode, showEmpresaFeatures, colors.primary, useWebLayout]);

  const carouselItemsExtended = useMemo(() => {
    const n = carouselItems.length;
    if (n <= 1) return carouselItems;
    return [
      { ...carouselItems[n - 1], id: 'clone-last', _clone: true },
      ...carouselItems,
      { ...carouselItems[0], id: 'clone-first', _clone: true },
    ];
  }, [carouselItems]);

  const handleCarouselPress = useCallback((item) => {
    playTapSound();
    switch (item.onPress) {
      case 'dinheiro': navigation?.navigate?.('Dinheiro'); break;
      case 'orcamento': openOrcamento?.(); break;
      case 'assinatura': openAssinatura?.(); break;
      case 'indique': openIndique?.(); break;
      case 'agenda': navigation?.navigate?.('Agenda'); break;
      case 'cards': setShowCardPicker(true); break;
      case 'whatsapp': openMensagensWhatsApp?.(); break;
      case 'desktopDownload':
        break;
      default: break;
    }
  }, [navigation, openOrcamento, openAssinatura, openIndique, openMensagensWhatsApp]);

  // Web mobile: clones + initialScrollIndex quebram o FlatList no RN Web (área preta).
  const useCarouselClones = !isWeb && !useWebLayout && !isWebMobile && carouselItems.length > 1;

  const carouselSnapOffsets = useMemo(
    () => (useCarouselClones ? carouselItemsExtended : carouselItems).map((_, i) => i * SNAP_INTERVAL),
    [useCarouselClones, carouselItemsExtended, carouselItems, SNAP_INTERVAL],
  );

  /** Desktop web e web mobile: card único. Só nativo usa FlatList com snap. */
  const applyCarouselScroll = useCallback(
    (displayIndex, animated = true) => {
      const idx = useCarouselClones ? displayIndex + 1 : displayIndex;
      const offset = idx * SNAP_INTERVAL;
      const run = () => {
        carouselRef.current?.scrollToOffset?.({ offset, animated });
      };
      if (isWeb) {
        requestAnimationFrame(() => requestAnimationFrame(run));
      } else {
        run();
      }
    },
    [useCarouselClones, isWeb, SNAP_INTERVAL],
  );

  const jumpToCarouselIndex = useCallback((nextIndex) => {
    const count = carouselItems.length;
    if (count <= 0) return;
    const target = Math.max(0, Math.min(nextIndex, count - 1));
    setCarouselIndex(target);
    applyCarouselScroll(target, true);
  }, [carouselItems.length, applyCarouselScroll]);

  const carouselCount = carouselItems.length;

  const onCarouselScrollSettled = useCallback(
    (e) => {
      const offsetX = e?.nativeEvent?.contentOffset?.x ?? 0;
      const rawIndex = Math.round(offsetX / Math.max(1, SNAP_INTERVAL));
      if (carouselCount <= 1) {
        setCarouselIndex(0);
        return;
      }
      if (!useCarouselClones) {
        const clamped = Math.max(0, Math.min(rawIndex, carouselCount - 1));
        setCarouselIndex(clamped);
      } else if (rawIndex <= 0) {
        setCarouselIndex(carouselCount - 1);
        carouselRef.current?.scrollToOffset?.({ offset: carouselCount * SNAP_INTERVAL, animated: false });
      } else if (rawIndex >= carouselCount + 1) {
        setCarouselIndex(0);
        carouselRef.current?.scrollToOffset?.({ offset: SNAP_INTERVAL, animated: false });
      } else {
        setCarouselIndex(rawIndex - 1);
      }
    },
    [carouselCount, useCarouselClones, SNAP_INTERVAL],
  );

  const [webProductivityTab, setWebProductivityTab] = useState('anotacoes');
  const [showConcluidasProdCompras, setShowConcluidasProdCompras] = useState(false);

  useEffect(() => {
    const count = carouselItems.length;
    if (count <= 1) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => {
        const nextDisplay = (prev + 1) % count;
        if (!isWebMobile && !useWebLayout) applyCarouselScroll(nextDisplay, true);
        return nextDisplay;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [SNAP_INTERVAL, carouselItems.length, useCarouselClones, applyCarouselScroll, isWebMobile, useWebLayout]);

  const handleLayoutMeasured = (id, y, height) => {
    layoutsRef.current[id] = { y, height };
  };

  const handleCardPress = useCallback((targetId) => {
    if (!floatingId) return;
    if (targetId === floatingId) {
      setFloatingId(null);
      return;
    }
    const idx = sectionOrder.indexOf(floatingId);
    const otherIdx = sectionOrder.indexOf(targetId);
    if (idx >= 0 && otherIdx >= 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const next = [...sectionOrder];
      [next[idx], next[otherIdx]] = [next[otherIdx], next[idx]];
      setSectionOrder(next);
    }
    setFloatingId(null);
  }, [floatingId, sectionOrder]);

  const parseTaskDate = useCallback((dateStr) => {
    if (!dateStr) return null;
    const parts = String(dateStr).trim().split(/[/\-]/);
    if (parts.length < 3) return null;
    let day, month, year;
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10) || new Date().getFullYear();
      month = (parseInt(parts[1], 10) || 1) - 1;
      day = parseInt(parts[2], 10) || 1;
    } else {
      day = parseInt(parts[0], 10) || 1;
      month = (parseInt(parts[1], 10) || 1) - 1;
      year = parseInt(parts[2], 10) || new Date().getFullYear();
    }
    return new Date(year, month, day);
  }, []);

  const proximasTarefas = useMemo(() => {
    const prOrd = (p) => ({ urgente: 4, alta: 3, media: 2, baixa: 1 }[p] || 2);
    const isCheckedTask = (task) => {
      const status = String(task?.status || '').trim().toLowerCase();
      if (status === 'concluido' || status === 'concluído' || status === 'done') return true;
      if (status === 'pendente' || status === 'todo' || status === 'a_fazer') return false;
      const raw = task?.checked;
      if (typeof raw === 'boolean') return raw;
      if (typeof raw === 'number') return raw === 1;
      if (typeof raw === 'string') {
        const v = raw.trim().toLowerCase();
        if (['true', '1', 'sim', 'yes'].includes(v)) return true;
        if (['false', '0', 'nao', 'não', 'no', ''].includes(v)) return false;
      }
      return Boolean(raw);
    };
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const pendentes = checkListItems
      .filter((t) => !isCheckedTask(t))
      .sort((a, b) => {
        const oa = a.sortOrder ?? 999;
        const ob = b.sortOrder ?? 999;
        if (oa !== ob) return oa - ob;
        const da = parseTaskDate(a.date) || new Date(0);
        const db = parseTaskDate(b.date) || new Date(0);
        if (da.getTime() !== db.getTime()) return da - db;
        return prOrd(b.priority) - prOrd(a.priority);
      });
    const concluidas = checkListItems.filter((t) => isCheckedTask(t)).sort((a, b) => {
      const da = parseTaskDate(a.date) || new Date(0);
      const db = parseTaskDate(b.date) || new Date(0);
      return db - da;
    });
    const agendasFuturas = agendaEvents
      .filter((e) => {
        const d = parseTaskDate(e.date);
        return d && d >= hoje && e.status !== 'concluido';
      })
      .sort((a, b) => {
        const da = parseTaskDate(a.date) || new Date(9999);
        const db = parseTaskDate(b.date) || new Date(9999);
        return da - db;
      })
      .slice(0, 3);
    const agendasConcluidas = agendaEvents
      .filter((e) => e.status === 'concluido')
      .sort((a, b) => {
        const da = parseTaskDate(a.date) || new Date(0);
        const db = parseTaskDate(b.date) || new Date(0);
        return db - da;
      })
      .slice(0, 5);
    return { tarefas: pendentes, concluidas, agendas: agendasFuturas, agendasConcluidas };
  }, [checkListItems, agendaEvents, parseTaskDate]);

  const proximosRecebimentos = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const em7Dias = new Date(hoje);
    em7Dias.setDate(em7Dias.getDate() + 7);
    return (aReceber || [])
      .filter((r) => r.status !== 'pago' && r.dueDate)
      .map((r) => ({ ...r, dueDateObj: parseDateKey(r.dueDate) }))
      .filter((r) => r.dueDateObj && r.dueDateObj >= hoje && r.dueDateObj <= em7Dias)
      .sort((a, b) => (a.dueDateObj || 0) - (b.dueDateObj || 0))
      .slice(0, 5)
      .map((r) => {
        const diff = Math.ceil((r.dueDateObj - hoje) / (1000 * 60 * 60 * 24));
        return { ...r, diasParaVencer: diff };
      });
  }, [aReceber]);

  const cardIconColor = colors.cardIconColor;
  const cardActionButtonStyle = chromeBtnBox(colors, {
    ghost: true,
    width: CARD_ACTION_SIZE,
    height: CARD_ACTION_SIZE,
    borderRadius: CARD_ACTION_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  });
  const cardHeaderActionsStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: useWebLayout ? 6 : 8,
    alignSelf: 'flex-start',
  };
  const listItemActionsStyle = { flexDirection: 'row', alignItems: 'center', flexShrink: 0 };
  const listItemTextClamp = { width: '100%', flexShrink: 1 };
  const renderAgendaEventInfo = (info, { titleSize = 15, metaSize = 11, titleWeight = '600' } = {}) => (
    <View style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>
      <Text style={[{ fontSize: titleSize, fontWeight: titleWeight, color: colors.text }, listItemTextClamp]} numberOfLines={1} ellipsizeMode="tail">{info.title}</Text>
      {info.when ? <Text style={[{ fontSize: metaSize, color: colors.textSecondary, marginTop: 2 }, listItemTextClamp]} numberOfLines={1} ellipsizeMode="tail">{info.when}</Text> : null}
      {info.serviceName ? <Text style={[{ fontSize: metaSize, color: colors.primary, marginTop: 2 }, listItemTextClamp]} numberOfLines={1} ellipsizeMode="tail">{info.serviceName}</Text> : null}
      {info.detail ? <Text style={[{ fontSize: metaSize, color: colors.textSecondary, marginTop: 2 }, listItemTextClamp]} numberOfLines={1} ellipsizeMode="tail">{info.detail}</Text> : null}
    </View>
  );

  const taskCardBase = (icon, _iconColor, title, subtitle, items, renderItem, emptyText, extraHeaderContent, onVerMais, headerRightActions, extraFooterContent) => (
    <TouchableOpacity
      key={title}
      onPress={() => navigation?.navigate?.('Agenda')}
      activeOpacity={0.9}
      // No web desktop o layout (grid/colunas) já controla espaçamento.
      // Margens externas aqui fazem o card "vazar" do container com altura fixa e parecer cortado.
      style={{
        marginHorizontal: useWebLayout ? 0 : WEB_CARD_MARGIN_H,
        marginTop: useWebLayout ? 0 : WEB_CARD_MARGIN_TOP,
        ...(useWebLayout ? { flex: 1, minHeight: 0, height: '100%' } : null),
      }}
    >
      <GlassCard
        colors={colors}
        solid
        style={[
          ds.card,
          {
            padding: WEB_CARD_PADDING,
            minHeight: TRIO_CARD_HEIGHT,
            ...(useWebLayout ? { minHeight: 0, height: '100%' } : null),
          },
        ]}
        contentStyle={{ padding: WEB_CARD_PADDING, ...(useWebLayout ? { flex: 1, minHeight: 0 } : null) }}
      >
        {useWebLayout ? (
          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <View style={{ width: HEADER_ICON_BOX_SIZE, height: HEADER_ICON_BOX_SIZE, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                  <AppIcon name={icon} size={HEADER_ICON_SIZE} color={cardIconColor} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                  {title}
                </Text>
              </View>
              {headerRightActions ?? <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />}
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: WEB_HEADER_GAP, marginBottom: 16 }}>
            <View style={{ width: HEADER_ICON_BOX_SIZE, height: HEADER_ICON_BOX_SIZE, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
              <AppIcon name={icon} size={HEADER_ICON_SIZE} color={cardIconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{title}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>{subtitle}</Text>
            </View>
            {headerRightActions ?? <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />}
          </View>
        )}
        {extraHeaderContent}
        <View style={{ flex: 1, minHeight: 0 }}>
          <ScrollableCardList
            items={items}
            colors={colors}
            emptyText={emptyText}
            onVerMais={onVerMais}
            fixedVisibleHeight={useWebLayout ? 'fill' : false}
            centerEmpty={useWebLayout}
            renderItem={(item) => renderItem(item)}
          />
        </View>
        {extraFooterContent ? <View style={{ flexShrink: 0 }}>{extraFooterContent}</View> : null}
      </GlassCard>
    </TouchableOpacity>
  );

  /** Web desktop: altura mínima do carrossel (duas colunas: metade da linha). */
  const webDesktopCarouselBlockH = useWebLayout ? Math.round(scaleWebDesktop(300, true)) : null;
  /** Mantido por compatibilidade de escala visual dos cards superiores. */
  const webDesktopCarouselTrioMinH = useWebLayout ? Math.round(scaleWebDesktop(178, true)) : null;
  /** Rodapé: gap acima dos botões; altura fixa para alinhar colunas frase/carrossel. */
  const webDesktopPairFooterMinH = useWebLayout
    ? Math.max(0, Math.round(scaleWebDesktop(28, true)) - 2)
    : null;
  const webDesktopQuoteCarouselRowH = useWebLayout && webDesktopCarouselTrioMinH != null && webDesktopPairFooterMinH != null
    ? webDesktopCarouselTrioMinH + WEB_DESKTOP_ROW_GAP + webDesktopPairFooterMinH
    : null;
  const webCarouselFooterStyle = useWebLayout
    ? {
        marginTop: WEB_DESKTOP_ROW_GAP,
        minHeight: webDesktopPairFooterMinH,
        paddingBottom: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: WEB_DESKTOP_ROW_GAP,
        alignSelf: 'stretch',
      }
    : null;
  const renderWebCarouselDots = useCallback(() => {
    if (carouselItems.length <= 1) return null;
    return carouselItems.map((_, i) => (
      <TouchableOpacity
        key={i}
        onPress={(e) => {
          e?.stopPropagation?.();
          playTapSound();
          jumpToCarouselIndex(i);
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ paddingVertical: 2, paddingHorizontal: 2 }}
      >
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor:
              i === carouselIndex ? (carouselItems[i]?.color || colors.primary) : colors.textSecondary + '55',
          }}
        />
      </TouchableOpacity>
    ));
  }, [carouselItems, carouselIndex, colors, jumpToCarouselIndex, playTapSound]);
  /** Desktop: frase + carrossel + aniversariantes na mesma linha (1/3 cada). */
  const desktopHomeCarouselQuoteAniv = useWebLayout
    && sectionOrder.includes('quote')
    && sectionOrder.includes('carousel')
    && sectionOrder.includes('aniversariantes');

  /** Carrossel: ícone e título iguais em todos os slides (referência: Baixe o Tudo Certo). */
  const useCarouselHeroLayout = useWebLayout || isWebMobile;
  const carouselHeroIconBox = useWebLayout ? scaleWebDesktop(52, true) : 52;
  const carouselHeroIconSize = useWebLayout ? scaleWebDesktop(26, true) : 26;
  const carouselHeroTitleSize = useWebLayout ? scaleWebDesktop(16, true) : 16;
  const carouselHeroTitleLineH = useWebLayout ? scaleWebDesktop(20, true) : 20;
  const carouselHeroTextSize = useWebLayout ? scaleWebDesktop(12, true) : 12;
  const carouselHeroTextLineH = useWebLayout ? scaleWebDesktop(16, true) : 16;
  const carouselHeroIconMb = useWebLayout ? scaleWebDesktop(8, true) : 8;

  /** Altura mínima da linha agenda (combo esquerda + agenda) = mesma fórmula do GRID_H no layout. */
  const WEB_AGENDA_ROW_MIN_H =
    useWebLayout && TRIO_CARD_HEIGHT != null ? TRIO_CARD_HEIGHT * 2 + WEB_DESKTOP_ROW_GAP : undefined;

  const sectionMap = {
    proximos: (
      <View
        key="proximos"
        style={{ marginHorizontal: useWebLayout ? 0 : WEB_CARD_MARGIN_H, marginTop: useWebLayout ? 0 : WEB_CARD_MARGIN_TOP }}
      >
        <GlassCard
          colors={colors}
          solid
          style={[
            ds.card,
            {
              padding: WEB_CARD_PADDING,
              minHeight: TRIO_CARD_HEIGHT,
              ...(useWebLayout ? { minHeight: 0, height: '100%' } : null),
            },
          ]}
          contentStyle={{ padding: WEB_CARD_PADDING, ...(useWebLayout ? { flex: 1, minHeight: 0 } : null) }}
        >
          {useWebLayout ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => navigation?.navigate?.('Agenda')}>
              <View style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ width: HEADER_ICON_BOX_SIZE, height: HEADER_ICON_BOX_SIZE, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                    <AppIcon name="checkmark-done-outline" size={HEADER_ICON_SIZE} color={cardIconColor} />
                  </View>
                  <View style={cardHeaderActionsStyle}>
                    <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setShowConcluidasProximos(!showConcluidasProximos); }} style={cardActionButtonStyle}>
                      <AppIcon name={showConcluidasProximos ? 'list-outline' : 'checkmark-done-outline'} size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAddModal?.('tarefa', null); }} style={cardActionButtonStyle}>
                      <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setExpandedCard('proximos'); }} style={cardActionButtonStyle}>
                      <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                  {showConcluidasProximos ? 'Tarefas concluídas' : 'Próximas tarefas'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity activeOpacity={0.9} onPress={() => navigation?.navigate?.('Agenda')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: WEB_HEADER_GAP, marginBottom: 12 }}>
                <View style={{ width: HEADER_ICON_BOX_SIZE, height: HEADER_ICON_BOX_SIZE, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                  <AppIcon name="checkmark-done-outline" size={HEADER_ICON_SIZE} color={cardIconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                    {showConcluidasProximos ? 'Tarefas concluídas' : 'Próximas tarefas'}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>
                    {showConcluidasProximos
                      ? (proximasTarefas.concluidas.length === 0 ? 'Nenhuma' : `${proximasTarefas.concluidas.length} concluída${proximasTarefas.concluidas.length !== 1 ? 's' : ''}`)
                      : (proximasTarefas.tarefas.length === 0 ? 'Nada pendente' : `${proximasTarefas.tarefas.length} pendente${proximasTarefas.tarefas.length !== 1 ? 's' : ''}`)}
                  </Text>
                </View>
                <View style={cardHeaderActionsStyle}>
                  <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setShowConcluidasProximos(!showConcluidasProximos); }} style={cardActionButtonStyle}>
                    <AppIcon name={showConcluidasProximos ? 'list-outline' : 'checkmark-done-outline'} size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAddModal?.('tarefa', null); }} style={cardActionButtonStyle}>
                    <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setExpandedCard('proximos'); }} style={cardActionButtonStyle}>
                    <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1, minHeight: 0 }}>
            <ScrollableCardList
              items={showConcluidasProximos ? proximasTarefas.concluidas : proximasTarefas.tarefas}
              colors={colors}
              accentColor={colors.primary}
              scrollStartsAt={3}
              scrollStripSide="right"
              emptyText={showConcluidasProximos ? 'Nenhuma tarefa concluída' : 'Nenhuma tarefa pendente'}
              onVerMais={() => { playTapSound(); setExpandedCard('proximos'); }}
              fixedVisibleHeight={useWebLayout ? 'fill' : false}
              centerEmpty={useWebLayout}
              renderItem={(t) => (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6, paddingLeft: 22, borderLeftWidth: 3, borderLeftColor: CARD_ICON_COLORS.proximos + '40', marginLeft: 4, minWidth: 0 }}>
                <View style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>
                  <Text style={[{ fontSize: 15, color: colors.text, textDecorationLine: showConcluidasProximos ? 'line-through' : 'none' }, listItemTextClamp]} numberOfLines={1} ellipsizeMode="tail">{t.title || t.name || t.description || 'Tarefa sem título'}</Text>
                  {(t.date || t.timeStart) && (
                    <Text style={[{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }, listItemTextClamp]} numberOfLines={1} ellipsizeMode="tail">
                      {[t.date, t.timeStart && t.timeEnd ? `${t.timeStart}-${t.timeEnd}` : null].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                <View style={listItemActionsStyle}>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openCadastro?.('tarefas', { editItemId: t.id }); }} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="pencil" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
                {showConcluidasProximos ? (
                  <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); updateCheckListItem(t.id, { checked: false }); }} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="arrow-undo" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); updateCheckListItem(t.id, { checked: true }); }} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="checkmark-done" size={22} color="#10b981" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={(e) => {
                  playTapSound();
                  onDeletePress('Excluir', 'Quer realmente excluir esta tarefa?', deleteCheckListItem, t.id)(e);
                }} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={22} color="#ef4444" />
                </TouchableOpacity>
                </View>
              </View>
              )}
            />
          </View>
        </GlassCard>
      </View>
    ),
    agendamentos: taskCardBase(
      'calendar-outline',
      '#0ea5e9',
      showConcluidasAgendamentos ? ((showEmpresaFeatures && viewMode === 'empresa') ? 'Atendimentos concluídos' : 'Eventos concluídos') : ((showEmpresaFeatures && viewMode === 'empresa') ? 'Próximos atendimentos' : 'Próximos eventos'),
      showConcluidasAgendamentos
        ? (proximasTarefas.agendasConcluidas.length === 0 ? 'Nenhum' : `${proximasTarefas.agendasConcluidas.length} concluído${proximasTarefas.agendasConcluidas.length !== 1 ? 's' : ''}`)
        : (proximasTarefas.agendas.length === 0
          ? ((showEmpresaFeatures && viewMode === 'empresa') ? 'Seus atendimentos agendados' : 'Seus eventos agendados nos próximos dias')
          : `${proximasTarefas.agendas.length} ${(showEmpresaFeatures && viewMode === 'empresa') ? 'atendimento' : 'evento'}${proximasTarefas.agendas.length !== 1 ? 's' : ''} nos próximos dias`),
      showConcluidasAgendamentos ? proximasTarefas.agendasConcluidas : proximasTarefas.agendas,
      (e) => {
        const info = getAgendaEventCardInfo(e, { client: agendaClientFor(e), service: agendaServiceFor(e) });
        return (
        <View key={e.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6, paddingLeft: 26, borderLeftWidth: 3, borderLeftColor: CARD_ICON_COLORS.agendamentos + '40', marginLeft: 4, marginBottom: 4, minWidth: 0 }}>
          {renderAgendaEventInfo(info)}
          <View style={listItemActionsStyle}>
          <TouchableOpacity onPress={(ev) => { ev?.stopPropagation?.(); playTapSound(); openAddModal?.('agenda', { editingEvent: e }); }} style={{ padding: 6 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="pencil" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={(ev) => {
              ev?.stopPropagation?.();
              playTapSound();
              promptConcluirAgenda(e, {
                showEmpresaFeatures,
                isConcluido: e.status === 'concluido',
                openAddModal,
                updateAgendaEvent,
              });
            }}
            style={{ padding: 6 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="checkmark-done" size={18} color="#10b981" />
          </TouchableOpacity>
          <TouchableOpacity onPress={(ev) => {
            playTapSound();
            onDeletePress('Excluir', 'Quer realmente excluir este evento?', deleteAgendaEvent, e.id)(ev);
          }} style={{ padding: 6 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
          </View>
        </View>
        );
      },
      showConcluidasAgendamentos ? ((showEmpresaFeatures && viewMode === 'empresa') ? 'Nenhum atendimento concluído' : 'Nenhum evento concluído') : ((showEmpresaFeatures && viewMode === 'empresa') ? 'Nenhum atendimento agendado' : 'Nenhum evento agendado'),
      null,
      () => { playTapSound(); setExpandedCard('agendamentos'); },
      (
        <View style={cardHeaderActionsStyle}>
          <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setShowConcluidasAgendamentos(!showConcluidasAgendamentos); }} style={cardActionButtonStyle}>
            <AppIcon name={showConcluidasAgendamentos ? 'list-outline' : 'checkmark-done-outline'} size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAddModal?.('agenda', null); }} style={cardActionButtonStyle}>
            <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setExpandedCard('agendamentos'); }} style={cardActionButtonStyle}>
            <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ),
      null
    ),
    // Web desktop: coluna direita do trio (Próximas tarefas). Agenda e Próximos eventos ficam na mesma linha do desktop.
    leftAgendaCombo: !useWebLayout ? null : (
      <View
        key="leftAgendaCombo"
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          height: '100%',
          width: '100%',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        <View
          style={{
            flex: 1,
            flexBasis: 0,
            minWidth: 0,
            minHeight: 0,
            height: '100%',
          }}
        >
          <GlassCard
            colors={colors}
            solid
            style={[ds.card, { padding: WEB_CARD_PADDING, flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }]}
            contentStyle={{ padding: WEB_CARD_PADDING, flex: 1, minHeight: 0 }}
          >
            <View style={{ flex: 1, minHeight: 0 }}>
              <View style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <View style={{ width: HEADER_ICON_BOX_SIZE, height: HEADER_ICON_BOX_SIZE, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                      <AppIcon name="checkmark-done-outline" size={HEADER_ICON_SIZE} color={cardIconColor} />
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {showConcluidasProximos ? 'Tarefas concluídas' : 'Próximas tarefas'}
                    </Text>
                  </View>
                  <View style={cardHeaderActionsStyle}>
                    <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setShowConcluidasProximos(!showConcluidasProximos); }} style={cardActionButtonStyle}>
                      <AppIcon name={showConcluidasProximos ? 'list-outline' : 'checkmark-done-outline'} size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAddModal?.('tarefa', null); }} style={cardActionButtonStyle}>
                      <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setExpandedCard('proximos'); }} style={cardActionButtonStyle}>
                      <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View style={{ flex: 1, minHeight: 0 }}>
                <ScrollableCardList
                  items={showConcluidasProximos ? proximasTarefas.concluidas : proximasTarefas.tarefas}
                  colors={colors}
                  accentColor={colors.primary}
                  scrollStartsAt={3}
                  scrollStripSide="right"
                  centerEmpty
                  emptyText={showConcluidasProximos ? 'Nenhuma tarefa concluída' : 'Nenhuma tarefa pendente'}
                  fixedVisibleHeight="fill"
                  renderItem={(t) => (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingVertical: 6, paddingLeft: 12, borderLeftWidth: 3, borderLeftColor: CARD_ICON_COLORS.proximos + '40', marginLeft: 2, minWidth: 0 }}>
                      <View style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>
                        <Text style={[{ fontSize: 14, color: colors.text, textDecorationLine: showConcluidasProximos ? 'line-through' : 'none' }, listItemTextClamp]} numberOfLines={1} ellipsizeMode="tail">{t.title || t.name || t.description || 'Tarefa sem título'}</Text>
                        {(t.date || t.timeStart) && (
                          <Text style={[{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }, listItemTextClamp]} numberOfLines={1} ellipsizeMode="tail">
                            {[t.date, t.timeStart && t.timeEnd ? `${t.timeStart}-${t.timeEnd}` : null].filter(Boolean).join(' · ')}
                          </Text>
                        )}
                      </View>
                      <View style={listItemActionsStyle}>
                      <TouchableOpacity
                        onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openCadastro?.('tarefas', { editItemId: t.id }); }}
                        style={{ padding: 6 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="pencil" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                      {showConcluidasProximos ? (
                        <TouchableOpacity
                          onPress={(e) => { e?.stopPropagation?.(); playTapSound(); updateCheckListItem(t.id, { checked: false }); }}
                          style={{ padding: 6 }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="arrow-undo" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={(e) => { e?.stopPropagation?.(); playTapSound(); updateCheckListItem(t.id, { checked: true }); }}
                          style={{ padding: 6 }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="checkmark-done" size={18} color="#10b981" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={(e) => {
                          playTapSound();
                          onDeletePress('Excluir', 'Quer realmente excluir esta tarefa?', deleteCheckListItem, t.id)(e);
                        }}
                        style={{ padding: 6 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              </View>
            </View>
          </GlassCard>
        </View>
      </View>
    ),
    agenda: !useWebLayout ? null : (
      <View key="agenda" style={{ marginHorizontal: 0, marginTop: 0, flex: 1, minHeight: 0, width: '100%' }}>
        <GlassCard
          colors={colors}
          solid
          style={[ds.card, { padding: WEB_CARD_PADDING, flex: 1, minHeight: 0 }]}
          contentStyle={{ padding: WEB_CARD_PADDING, flex: 1, minHeight: 0 }}
        >
          <View style={{ marginBottom: 2 }}>
            <View style={{ position: 'relative', minHeight: CARD_ACTION_SIZE, justifyContent: 'center', marginBottom: 2 }}>
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0, maxWidth: '45%' }}>
                <View style={{ width: HEADER_ICON_BOX_SIZE, height: HEADER_ICON_BOX_SIZE, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                  <AppIcon name="calendar-outline" size={HEADER_ICON_SIZE} color={cardIconColor} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                  Agenda
                </Text>
              </View>
              <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', minWidth: 0, maxWidth: '40%' }}>
                <TouchableOpacity
                  onPress={() => { playTapSound(); setAgendaCardShowMonthPicker(true); }}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingVertical: 3,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border + '80',
                    backgroundColor: colors.card,
                    maxWidth: '100%',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }} numberOfLines={1}>{agendaMonthLabel}</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={[cardHeaderActionsStyle, { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'flex-end', flexShrink: 0 }]}>
                <TouchableOpacity
                  onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setAgendaCardDate(new Date()); }}
                  style={[
                    cardActionButtonStyle,
                    {
                      width: undefined,
                      minWidth: CARD_ACTION_SIZE,
                      paddingHorizontal: 2,
                      borderWidth: 0,
                      backgroundColor: 'transparent',
                      shadowOpacity: 0,
                      elevation: 0,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>Hoje</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAddModal?.('agenda', { initialDate: formatBrShort(agendaCardDate) }); }} style={cardActionButtonStyle}>
                  <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); navigation?.navigate?.('Agenda'); }} style={cardActionButtonStyle}>
                  <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={{ marginBottom: 2, overflow: 'visible', paddingRight: 8, paddingLeft: 8 }}>
            {(() => {
              // Mesmo padrão visual da AgendaScreen desktop: letra em cima e círculo no dia selecionado.
              const days = agendaCardWeek;
              const WD = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minWidth: '100%' }}>
                  <TouchableOpacity
                    onPress={() => { playTapSound(); const d = new Date(agendaCardDate); d.setDate(d.getDate() - 7); setAgendaCardDate(d); }}
                    style={{ width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', marginRight: 8 }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', gap: 2, flex: 1, justifyContent: 'space-between' }}>
                    {days.map((d) => {
                      const selected = isSameDay(d, agendaCardDate);
                      const dayLabel = WD[d.getDay()];
                      const num = d.getDate();
                      const dayKey = formatBrShort(d);
                      const count = agendaDayCounts[dayKey] || 0;
                      const hasAgenda = count > 0;
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      const dayNumColor = selected ? '#fff' : (isWeekend ? (colors.textSecondary + '99') : colors.text);
                      const dayLetterColor = isWeekend ? (colors.textSecondary + '99') : colors.textSecondary;
                      return (
                        <View key={d.toISOString()} style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: dayLetterColor, marginBottom: 2 }}>{dayLabel}</Text>
                          <TouchableOpacity
                            onPress={() => { playTapSound(); setAgendaCardDate(d); }}
                            style={{
                              width: 34,
                              height: 40,
                              borderRadius: 12,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'transparent',
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                              {selected ? (
                                <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: 16, backgroundColor: colors.primary }} />
                              ) : null}
                              <Text style={{ fontSize: 14, fontWeight: '700', color: dayNumColor }}>{num}</Text>
                              <Text style={{ fontSize: 9, fontWeight: '700', marginTop: 1, color: selected ? 'rgba(255,255,255,0.95)' : (hasAgenda ? colors.primary : colors.textSecondary) }}>
                                {count}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    onPress={() => { playTapSound(); const d = new Date(agendaCardDate); d.setDate(d.getDate() + 7); setAgendaCardDate(d); }}
                    style={{ width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', marginLeft: 8 }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>

          <Modal visible={agendaCardShowMonthPicker} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
              <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setAgendaCardShowMonthPicker(false)} />
              <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, gap: 16, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12 }}>
                  <TouchableOpacity onPress={() => { playTapSound(); setAgendaCardPickerYear((y) => y - 1); }} style={{ padding: 6 }}>
                    <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{agendaCardPickerYear}</Text>
                  <TouchableOpacity onPress={() => { playTapSound(); setAgendaCardPickerYear((y) => y + 1); }} style={{ padding: 6 }}>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8, gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => {
                      playTapSound();
                      setAgendaCardPickerMonth((m) => (m <= 0 ? 11 : m - 1));
                      if (agendaCardPickerMonth <= 0) setAgendaCardPickerYear((y) => y - 1);
                    }}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, minWidth: 120, textAlign: 'center' }}>
                    {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][agendaCardPickerMonth]}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      playTapSound();
                      setAgendaCardPickerMonth((m) => (m >= 11 ? 0 : m + 1));
                      if (agendaCardPickerMonth >= 11) setAgendaCardPickerYear((y) => y + 1);
                    }}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                  {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((wd) => (
                    <View key={wd} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>{wd}</Text>
                    </View>
                  ))}
                </View>

                {[0, 1, 2, 3, 4, 5].map((row) => (
                  <View key={row} style={{ flexDirection: 'row' }}>
                    {agendaCalendarGrid.slice(row * 7, row * 7 + 7).map((cell, idx) => {
                      const sel = !cell.empty && isSameDay(cell.date, agendaCardDate);
                      const isCurMonth = !cell.empty && cell.date.getMonth() === agendaCardPickerMonth;
                      const today = new Date();
                      const isTodayCell = !cell.empty && isSameDay(cell.date, today);
                      return (
                        <TouchableOpacity
                          key={`${row}-${idx}`}
                          style={{
                            flex: 1,
                            height: 42,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginVertical: 2,
                            borderRadius: 12,
                            opacity: cell.empty ? 0.25 : isCurMonth ? 1 : 0.5,
                            backgroundColor: sel ? (colors.primary + '26') : 'transparent',
                            borderWidth: isTodayCell ? 2 : 0,
                            borderColor: isTodayCell ? (sel ? '#fff' : colors.primary) : 'transparent',
                          }}
                          activeOpacity={0.75}
                          onPress={() => !cell.empty && handleAgendaCardCalendarDaySelect(cell.date)}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '700', color: sel ? colors.primary : colors.text }}>
                            {cell.date.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}

                <TouchableOpacity
                  onPress={() => { playTapSound(); setAgendaCardShowMonthPicker(false); }}
                  style={{ marginTop: 12, paddingVertical: 14, borderRadius: 12, alignItems: 'center', ...chromeBtnBox(colors) }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary }}>Fechar</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          </Modal>

          {(() => {
            // Compacto no web desktop: horas menores para ver mais do dia
            const HOUR_HEIGHT_CARD = (useWebLayout ? 44 : 56) * agendaCardZoom;
            const MINUTES_PER_HOUR = 60;
            const timelineHeight = 24 * HOUR_HEIGHT_CARD;
            const timelineViewportHeight = useWebLayout ? 240 : 380;
            const maxTimelineScroll = Math.max(0, timelineHeight - timelineViewportHeight);
            const showTimelineStrip = maxTimelineScroll > 0;
            const timelineThumbHeight = showTimelineStrip
              ? Math.max(20, (timelineViewportHeight / timelineHeight) * timelineViewportHeight)
              : timelineViewportHeight;
            const timelineThumbMaxTop = timelineViewportHeight - timelineThumbHeight;
            const timelineThumbTop = showTimelineStrip
              ? Math.max(0, Math.min((agendaCardTimelineScrollY / maxTimelineScroll) * timelineThumbMaxTop, timelineThumbMaxTop))
              : 0;
            const timelineZoomRight = showTimelineStrip ? AGENDA_TIMELINE_ZOOM_RIGHT : 12;
            const accent = CARD_ICON_COLORS.agenda || colors.primary;
            const nowObj = new Date();
            const showNowLine = isSameDay(nowObj, agendaCardDate);
            const nowMinutes = nowObj.getHours() * 60 + nowObj.getMinutes();
            const nowTop = (nowMinutes / MINUTES_PER_HOUR) * HOUR_HEIGHT_CARD;
            return (
              <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border + '80', overflow: 'hidden', backgroundColor: colors.bg }}>
                <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}>
                  {/* Agenda (timeline) */}
                  <View style={{ position: 'relative' }}>
                  <ScrollView
                    // Deixa a timeline flexível; o grid controla a altura externa do card.
                    style={{
                      height: timelineViewportHeight,
                      paddingRight: showTimelineStrip ? Math.max(14, AGENDA_TIMELINE_ZOOM_RIGHT + 4) : 0,
                      ...(Platform.OS === 'web' ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : null),
                    }}
                    contentContainerStyle={{ paddingRight: 6 }}
                    showsVerticalScrollIndicator={false}
                    onScroll={(ev) => setAgendaCardTimelineScrollY(ev?.nativeEvent?.contentOffset?.y || 0)}
                    scrollEventThrottle={16}
                    {...(Platform.OS === 'web' ? { className: 'tc-card-scroll' } : null)}
                  >
                    <View style={{ flexDirection: 'row' }}>
                      <View style={{ width: 46, paddingTop: 2 }}>
                        {Array.from({ length: 24 }).map((_, h) => (
                          <View key={h} style={{ height: HOUR_HEIGHT_CARD, justifyContent: 'flex-start' }}>
                            <Text style={{ fontSize: useWebLayout ? 9 : 10, color: colors.textSecondary, fontWeight: '600' }}>{String(h).padStart(2, '0')}:00</Text>
                          </View>
                        ))}
                      </View>
                      <View style={{ flex: 1, position: 'relative' }}>
                        {Array.from({ length: 24 }).map((_, h) => (
                          <View
                            key={h}
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: h * HOUR_HEIGHT_CARD + 10,
                              height: 1,
                              backgroundColor: colors.border + '55',
                            }}
                            pointerEvents="none"
                          />
                        ))}
                        <View style={{ height: timelineHeight, position: 'relative' }}>
                          {showNowLine && (
                            <View
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: Math.max(0, Math.min(nowTop, timelineHeight - 1)),
                                height: 2,
                                backgroundColor: '#ef4444',
                                borderRadius: 2,
                                opacity: 0.85,
                              }}
                              pointerEvents="none"
                            />
                          )}

                          {agendaCardTimeline.length === 0 ? (
                            <View style={{ paddingVertical: 14, paddingHorizontal: 12 }}>
                              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Nenhum evento para este dia</Text>
                            </View>
                          ) : null}

                          {agendaCardTimeline.map(({ e, startM, durM, lane, lanesUsed }) => {
                            const info = getAgendaEventCardInfo(e, { client: agendaClientFor(e), service: agendaServiceFor(e) });
                            const top = (startM / MINUTES_PER_HOUR) * HOUR_HEIGHT_CARD;
                            const rawH = (durM / MINUTES_PER_HOUR) * HOUR_HEIGHT_CARD;
                            const extraLines = [info.when, info.phone, info.serviceName, info.desc, info.detail].filter(Boolean).length;
                            const contentMin = 22 + extraLines * 16;
                            const height = Math.max(rawH, contentMin, 56);
                            const cols = Math.max(1, lanesUsed || 1);
                            const colPct = 100 / cols;
                            const blockHeight = height;
                            const isActionsOpen = agendaCardActionsId === e.id;
                            const actionBtnStyle = {
                              width: 26,
                              height: 26,
                              borderRadius: 13,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: colors.bg + 'EE',
                              borderWidth: 1,
                              borderColor: colors.border + '90',
                            };
                            return (
                              <View
                                key={e.id}
                                style={{
                                  position: 'absolute',
                                  left: `${(lane || 0) * colPct}%`,
                                  width: `${colPct}%`,
                                  top,
                                  height: blockHeight,
                                  paddingRight: cols > 1 ? 4 : 0,
                                  zIndex: isActionsOpen ? 80 : 10 + (lane || 0),
                                }}
                              >
                                <TouchableOpacity
                                  activeOpacity={0.9}
                                  onPress={() => { playTapSound(); setAgendaCardActionsId(null); openAddModal?.('agenda', { editingEvent: e }); }}
                                  style={{
                                    flex: 1,
                                    minWidth: 0,
                                    height: blockHeight,
                                    paddingVertical: 6,
                                    paddingLeft: 10,
                                    paddingRight: 32,
                                    borderRadius: 14,
                                    backgroundColor: accent + '1F',
                                    borderWidth: 1,
                                    borderColor: accent + '66',
                                    borderLeftWidth: 4,
                                    borderLeftColor: accent,
                                    overflow: 'visible',
                                  }}
                                >
                                  {renderAgendaEventInfo(info, { titleSize: 12, metaSize: 10, titleWeight: '800' })}
                                </TouchableOpacity>
                                <View
                                  style={{ position: 'absolute', top: 4, right: cols > 1 ? 6 : 4, alignItems: 'center', zIndex: 90 }}
                                  pointerEvents="box-none"
                                >
                                  <TouchableOpacity
                                    onPress={(ev) => {
                                      ev?.stopPropagation?.();
                                      playTapSound();
                                      setAgendaCardActionsId((prev) => (prev === e.id ? null : e.id));
                                    }}
                                    style={actionBtnStyle}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  >
                                    <Ionicons name="pencil" size={14} color={colors.textSecondary} />
                                  </TouchableOpacity>
                                  {isActionsOpen ? (
                                    <View style={{ marginTop: 4, alignItems: 'center', gap: 4 }}>
                                      <TouchableOpacity
                                        onPress={(ev) => {
                                          ev?.stopPropagation?.();
                                          playTapSound();
                                          setAgendaCardActionsId(null);
                                          openAddModal?.('agenda', { editingEvent: e });
                                        }}
                                        style={actionBtnStyle}
                                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                      >
                                        <Ionicons name="create-outline" size={14} color={colors.textSecondary} />
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        onPress={(ev) => {
                                          ev?.stopPropagation?.();
                                          playTapSound();
                                          setAgendaCardActionsId(null);
                                          promptConcluirAgenda(e, {
                                            showEmpresaFeatures,
                                            isConcluido: e.status === 'concluido',
                                            openAddModal,
                                            updateAgendaEvent,
                                          });
                                        }}
                                        style={actionBtnStyle}
                                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                      >
                                        <Ionicons name="checkmark-done" size={14} color="#10b981" />
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        onPress={(ev) => {
                                          ev?.stopPropagation?.();
                                          playTapSound();
                                          setAgendaCardActionsId(null);
                                          onDeletePress('Excluir', 'Quer realmente excluir este evento?', deleteAgendaEvent, e.id)();
                                        }}
                                        style={actionBtnStyle}
                                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                      >
                                        <Ionicons name="trash-outline" size={14} color="#ef4444" />
                                      </TouchableOpacity>
                                    </View>
                                  ) : null}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  </ScrollView>
                  {showTimelineStrip && (
                    <CardScrollbar
                      visible
                      height={timelineViewportHeight}
                      thumbTop={timelineThumbTop}
                      thumbHeight={timelineThumbHeight}
                      colors={colors}
                      accentColor={colors.primary || accent}
                    />
                  )}
                  {/* zoom dentro da timeline (mesmo insete da página Agenda desktop) */}
                  <View style={{ position: 'absolute', top: 10, right: timelineZoomRight, flexDirection: 'row', gap: 8 }} pointerEvents="box-none">
                    <TouchableOpacity
                      onPress={() => { playTapSound(); setAgendaCardZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2)))); }}
                      style={cardActionButtonStyle}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="remove" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { playTapSound(); setAgendaCardZoom((z) => Math.min(2.0, Number((z + 0.1).toFixed(2)))); }}
                      style={cardActionButtonStyle}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="add" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  </View>
                </View>
              </View>
            );
          })()}
        </GlassCard>
      </View>
    ),
    carousel: (
      <View
        key="carousel"
        style={[
          ds.carousel,
          (useWebLayout || isWebMobile) && {
            width: '100%',
            ...(useWebLayout ? { alignItems: 'stretch' } : { alignItems: 'center' }),
          },
          useWebLayout && {
            marginTop: 0,
            paddingVertical: 0,
            height: '100%',
            minHeight: 0,
            flex: 1,
            overflow: 'hidden',
          },
        ]}
      >
        {(useWebLayout || isWebMobile) ? (
          (() => {
            const item = carouselItems[Math.max(0, Math.min(carouselIndex, Math.max(0, carouselItems.length - 1)))] || carouselItems[0];
            if (!item) return null;
            const carouselSlideW = useWebLayout ? '100%' : CARD_WIDTH;
            const slideH = useWebLayout ? scaleWebDesktop(208, true) : 165;
            /** Desktop: o card preenche a célula da grade (mesma altura dos vizinhos). */
            const carouselCardFixedH = useWebLayout
              ? null
              : (useCarouselHeroLayout ? 165 : null);
            const carouselFillStyle = useWebLayout
              ? { width: '100%', flex: 1, height: '100%', minHeight: 0 }
              : carouselCardFixedH
                ? { width: '100%', height: carouselCardFixedH, minHeight: carouselCardFixedH, maxHeight: carouselCardFixedH }
                : null;
            const carouselCardRadius = scaleWebDesktop(20, useWebLayout);
            const carouselImageStyle = useWebLayout
              ? Platform.OS === 'web'
                ? {
                    borderRadius: scaleWebDesktop(20, true),
                    opacity: 0.9,
                    width: '100%',
                    height: '100%',
                    /* Ajuste de foco para enquadrar melhor o conteúdo útil no card sem cortes agressivos. */
                    objectPosition: 'center 52%',
                  }
                : {
                    borderRadius: scaleWebDesktop(20, true),
                    opacity: 0.9,
                    width: '100%',
                    height: '120%',
                    transform: [{ translateY: scaleWebDesktop(18, true) }],
                  }
              : { borderRadius: 20, opacity: 0.8 };
            const iconTop = 20;
            const iconLeft = 20;
            const iconBox = carouselHeroIconBox;
            const isDesktopDownloadCard = item.onPress === 'desktopDownload';
            const CarouselCardWrapper = isDesktopDownloadCard ? View : TouchableOpacity;
            const carouselCardWrapperProps = isDesktopDownloadCard
              ? {}
              : { onPress: () => handleCarouselPress(item), activeOpacity: 0.9 };
            return (
              <View
                style={{
                  position: 'relative',
                  width: '100%',
                  ...(useWebLayout
                    ? { flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }
                    : useCarouselHeroLayout
                      ? {
                          alignSelf: 'stretch',
                          flexDirection: 'column',
                        }
                      : { alignItems: 'center' }),
                }}
              >
                <View
                  style={
                    useWebLayout
                      ? {
                          ...carouselFillStyle,
                          borderRadius: carouselCardRadius,
                          overflow: 'hidden',
                          borderWidth: 1,
                          borderColor: (item.color || colors.primary) + '80',
                          ...cardShadowStyle,
                        }
                      : useCarouselHeroLayout
                      ? {
                          width: '100%',
                          height: carouselCardFixedH,
                          minHeight: carouselCardFixedH,
                          maxHeight: carouselCardFixedH,
                          borderRadius: carouselCardRadius,
                          overflow: 'hidden',
                          borderWidth: 1,
                          borderColor: (item.color || colors.primary) + '80',
                          ...cardShadowStyle,
                        }
                      : { width: '100%', alignItems: 'center' }
                  }
                >
                  <CarouselCardWrapper
                    {...carouselCardWrapperProps}
                    style={
                      useWebLayout
                        ? carouselFillStyle
                        : useCarouselHeroLayout
                        ? { width: '100%', height: carouselCardFixedH, minHeight: carouselCardFixedH, maxHeight: carouselCardFixedH }
                        : { alignSelf: 'center' }
                    }
                  >
                    <ImageBackground
                      source={item.image}
                      style={[
                        !useCarouselHeroLayout ? ds.carouselItem : null,
                        useWebLayout
                          ? {
                              width: '100%',
                              flex: 1,
                              height: '100%',
                              minHeight: 0,
                              padding: 0,
                              overflow: 'hidden',
                            }
                          : useCarouselHeroLayout
                          ? {
                              width: '100%',
                              height: carouselCardFixedH,
                              minHeight: carouselCardFixedH,
                              maxHeight: carouselCardFixedH,
                              padding: 0,
                              overflow: 'hidden',
                            }
                          : {
                              width: carouselSlideW,
                              height: slideH,
                              padding: 0,
                              borderColor: (item.color || colors.primary) + '80',
                              overflow: 'hidden',
                              ...cardShadowStyle,
                            },
                      ]}
                      imageStyle={carouselImageStyle}
                      resizeMode="cover"
                    >
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: scaleWebDesktop(20, useWebLayout), backgroundColor: ((item.color || colors.primary) + '25'), pointerEvents: 'none', zIndex: 1 }} />
                    {!useCarouselHeroLayout ? (
                      <View style={{ position: 'absolute', top: iconTop, left: iconLeft, width: iconBox, height: iconBox, borderRadius: iconBox / 2, backgroundColor: (item.color || colors.primary) + 'E6', justifyContent: 'center', alignItems: 'center', zIndex: 2 }}>
                        <AppIcon name={item.icon} size={carouselHeroIconSize} color="#fff" />
                      </View>
                    ) : null}
                    <LinearGradient
                      colors={
                        useCarouselHeroLayout
                          ? ['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.38)']
                          : ['transparent', 'transparent', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.78)']
                      }
                      locations={useCarouselHeroLayout ? [0, 0.55, 1] : [0, 0.4, 0.75, 1]}
                      style={{
                        flex: 1,
                        width: '100%',
                        height: '100%',
                        borderRadius: scaleWebDesktop(20, useWebLayout),
                        padding: useCarouselHeroLayout ? scaleWebDesktop(20, useWebLayout) : 20,
                        paddingBottom: useWebLayout
                          ? scaleWebDesktop(28, true)
                          : useCarouselHeroLayout
                            ? scaleWebDesktop(16, useWebLayout)
                            : 20,
                        justifyContent: useCarouselHeroLayout ? 'center' : 'flex-end',
                        alignItems: useCarouselHeroLayout ? 'center' : 'stretch',
                        overflow: useCarouselHeroLayout ? 'hidden' : 'visible',
                      }}
                    >
                      {useCarouselHeroLayout ? (
                        <View style={{ alignItems: 'center', width: '100%', maxWidth: '100%' }}>
                          <View
                            style={{
                              width: iconBox,
                              height: iconBox,
                              borderRadius: iconBox / 2,
                              backgroundColor: (item.color || colors.primary) + 'E6',
                              justifyContent: 'center',
                              alignItems: 'center',
                              marginBottom: carouselHeroIconMb,
                            }}
                          >
                            <AppIcon name={item.icon} size={carouselHeroIconSize} color="#fff" />
                          </View>
                          <View style={{ alignItems: 'center', width: '100%', gap: scaleWebDesktop(3, useWebLayout) }}>
                            <Text
                              style={[
                                ds.carouselTitle,
                                {
                                  color: '#fff',
                                  fontSize: carouselHeroTitleSize,
                                  lineHeight: carouselHeroTitleLineH,
                                  textAlign: 'center',
                                  width: '100%',
                                  marginBottom: 0,
                                },
                              ]}
                              numberOfLines={2}
                            >
                              {item.title}
                            </Text>
                            <Text
                              style={[
                                ds.carouselText,
                                {
                                  color: '#fff',
                                  fontSize: carouselHeroTextSize,
                                  lineHeight: carouselHeroTextLineH,
                                  textAlign: 'center',
                                  width: '100%',
                                },
                              ]}
                              numberOfLines={3}
                            >
                              {item.text}
                            </Text>
                            {isDesktopDownloadCard ? (
                              <CarouselDesktopDownloadActions
                                colors={colors}
                                quickRowTheme={quickRowTheme}
                                fontSize={scaleWebDesktop(9, true)}
                                btnPadV={scaleWebDesktop(4, true)}
                                btnPadH={scaleWebDesktop(5, true)}
                                iconSize={scaleWebDesktop(12, true)}
                                rowGap={scaleWebDesktop(4, true)}
                              />
                            ) : null}
                          </View>
                        </View>
                      ) : (
                        <>
                          <Text style={[ds.carouselTitle, { color: '#fff' }]}>{item.title}</Text>
                          <Text style={[ds.carouselText, { color: '#fff' }]}>{item.text}</Text>
                          {isDesktopDownloadCard ? (
                            <CarouselDesktopDownloadActions
                              colors={colors}
                              quickRowTheme={quickRowTheme}
                              compact
                              fontSize={12}
                              btnPadV={6}
                              btnPadH={7}
                              iconSize={14}
                              rowGap={6}
                            />
                          ) : null}
                        </>
                      )}
                    </LinearGradient>
                    {!useWebLayout ? (
                      <>
                        <View style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                        <View style={{ position: 'absolute', bottom: -30, left: -30, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                      </>
                    ) : null}
                  </ImageBackground>
                </CarouselCardWrapper>
                {useWebLayout && carouselItems.length > 1 ? (
                  <View
                    pointerEvents="box-none"
                    style={{
                      position: 'absolute',
                      left: 8,
                      right: 8,
                      bottom: 8,
                      zIndex: 6,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: WEB_DESKTOP_ROW_GAP,
                    }}
                  >
                    {renderWebCarouselDots()}
                  </View>
                ) : null}
                </View>
                {!useWebLayout ? (
                  <View pointerEvents="box-none" style={webCarouselFooterStyle}>
                    {carouselItems.length > 1 ? renderWebCarouselDots() : null}
                  </View>
                ) : null}

                {/* setas/bordas clicáveis */}
                {carouselItems.length > 1 && (
                  <View
                    style={
                      useWebLayout
                        ? {
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            width: '100%',
                          }
                        : {
                            position: 'absolute',
                            top: 0,
                            height: 165,
                            alignSelf: 'center',
                            width: CARD_WIDTH,
                            left: '50%',
                            transform: [{ translateX: -CARD_WIDTH / 2 }],
                          }
                    }
                    pointerEvents="box-none"
                  >
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Anterior"
                      onPress={() => { playTapSound(); jumpToCarouselIndex((carouselIndex - 1 + carouselItems.length) % carouselItems.length); }}
                      activeOpacity={0.85}
                      style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 44, justifyContent: 'center', alignItems: 'flex-start' }}
                    >
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
                        <Ionicons name="chevron-back" size={20} color="#fff" />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Próximo"
                      onPress={() => { playTapSound(); jumpToCarouselIndex((carouselIndex + 1) % carouselItems.length); }}
                      activeOpacity={0.85}
                      style={{ position: 'absolute', right: 10, top: 0, bottom: 0, width: 44, justifyContent: 'center', alignItems: 'flex-end' }}
                    >
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
                        <Ionicons name="chevron-forward" size={20} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })()
        ) : (
          <View style={{ width: '100%', alignItems: 'center' }}>
          <FlatList
            ref={carouselRef}
            data={useCarouselClones ? carouselItemsExtended : carouselItems}
            horizontal
            pagingEnabled={false}
            style={{ overflow: 'visible', width: '100%', alignSelf: 'center' }}
            snapToInterval={SNAP_INTERVAL}
            snapToAlignment="center"
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: CAROUSEL_PADDING }}
            key={`carousel-${Math.round(carouselViewportWidth)}-${useCarouselClones ? 'clones' : 'plain'}`}
            // No web, initialScrollIndex + clones podem causar tela preta.
            initialScrollIndex={(!isWeb && useCarouselClones) ? 1 : 0}
            snapToOffsets={carouselSnapOffsets}
            onMomentumScrollEnd={onCarouselScrollSettled}
            getItemLayout={(_, index) => ({ length: SNAP_INTERVAL, offset: index * SNAP_INTERVAL, index })}
            renderItem={({ item }) => {
              const isDesktopDownloadCard = item.onPress === 'desktopDownload';
              const cardContent = (
                <ImageBackground
                  source={item.image}
                  style={[
                    ds.carouselItem,
                    {
                      width: CARD_WIDTH,
                      height: 165,
                      padding: 0,
                      borderColor: (item.color || colors.primary) + '80',
                      overflow: 'hidden',
                      ...cardShadowStyle,
                    },
                  ]}
                  imageStyle={{ borderRadius: 20, opacity: 0.8 }}
                  resizeMode="cover"
                >
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20, backgroundColor: ((item.color || colors.primary) + '25'), pointerEvents: 'none', zIndex: 1 }} />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.38)']}
                    locations={[0, 0.55, 1]}
                    style={{ flex: 1, width: '100%', height: '100%', borderRadius: 20, padding: 20, paddingBottom: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}
                  >
                    <View style={{ alignItems: 'center', width: '100%', maxWidth: '100%' }}>
                      <View
                        style={{
                          width: carouselHeroIconBox,
                          height: carouselHeroIconBox,
                          borderRadius: carouselHeroIconBox / 2,
                          backgroundColor: (item.color || colors.primary) + 'E6',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginBottom: carouselHeroIconMb,
                        }}
                      >
                        <AppIcon name={item.icon} size={carouselHeroIconSize} color="#fff" />
                      </View>
                      <View style={{ alignItems: 'center', width: '100%', gap: 3 }}>
                        <Text
                          style={[ds.carouselTitle, { color: '#fff', fontSize: carouselHeroTitleSize, lineHeight: carouselHeroTitleLineH, textAlign: 'center', width: '100%', marginBottom: 0 }]}
                          numberOfLines={2}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[ds.carouselText, { color: '#fff', fontSize: carouselHeroTextSize, lineHeight: carouselHeroTextLineH, textAlign: 'center', width: '100%' }]}
                          numberOfLines={3}
                        >
                          {item.text}
                        </Text>
                        {isDesktopDownloadCard ? (
                          <CarouselDesktopDownloadActions
                            colors={colors}
                            quickRowTheme={quickRowTheme}
                            compact
                            fontSize={10}
                            btnPadV={5}
                            btnPadH={6}
                            iconSize={12}
                            rowGap={5}
                          />
                        ) : null}
                      </View>
                    </View>
                  </LinearGradient>
                  <View style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                  <View style={{ position: 'absolute', bottom: -30, left: -30, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                </ImageBackground>
              );
              return item.onPress && !isDesktopDownloadCard ? (
                <TouchableOpacity key={item.id} onPress={() => handleCarouselPress(item)} activeOpacity={0.9} style={{ width: SNAP_INTERVAL, alignItems: 'center', justifyContent: 'center' }}>
                  {cardContent}
                </TouchableOpacity>
              ) : (
                <View key={item.id} style={{ width: SNAP_INTERVAL, alignItems: 'center', justifyContent: 'center' }}>{cardContent}</View>
              );
            }}
          />

          {/* Zonas clicáveis nas bordas (web desktop + web mobile + nativo) */}
          {carouselItems.length > 1 && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                height: 165,
                alignSelf: 'center',
                width: CARD_WIDTH,
                left: '50%',
                transform: [{ translateX: -CARD_WIDTH / 2 }],
              }}
              pointerEvents="box-none"
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Anterior"
                onPress={() => { playTapSound(); jumpToCarouselIndex((carouselIndex - 1 + carouselItems.length) % carouselItems.length); }}
                activeOpacity={0.85}
                style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 44, justifyContent: 'center', alignItems: 'flex-start' }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Próximo"
                onPress={() => { playTapSound(); jumpToCarouselIndex((carouselIndex + 1) % carouselItems.length); }}
                activeOpacity={0.85}
                style={{ position: 'absolute', right: 10, top: 0, bottom: 0, width: 44, justifyContent: 'center', alignItems: 'flex-end' }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
        )}
        {!useWebLayout && carouselItems.length > 1 ? (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              marginTop: 12,
            }}
          >
            {carouselItems.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => { playTapSound(); jumpToCarouselIndex(i); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ paddingVertical: 4, paddingHorizontal: 2 }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === carouselIndex ? (carouselItems[i]?.color || colors.primary) : colors.textSecondary + '60' }} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    ),
    quote: (
      useWebLayout ? (
        <View key="quote" style={{ width: '100%', alignSelf: 'stretch', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
          <TouchableOpacity
            onPress={() => openImageGenerator?.({ quote, quoteType })}
            activeOpacity={0.8}
            style={{ flex: 1, minHeight: 0, height: '100%', width: '100%' }}
          >
            <GlassCard
              colors={colors}
              solid
              style={[
                ds.card,
                {
                  padding: desktopHomeCarouselQuoteAniv ? scaleWebDesktop(7, true) : scaleWebDesktop(10, true),
                  height: '100%',
                  flex: 1,
                  minHeight: 0,
                  width: '100%',
                  borderRadius: scaleWebDesktop(20, true),
                  overflow: 'hidden',
                },
              ]}
              contentStyle={{
                padding: desktopHomeCarouselQuoteAniv ? scaleWebDesktop(7, true) : scaleWebDesktop(10, true),
                height: '100%',
                flex: 1,
                minHeight: 0,
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  flex: 1,
                  minHeight: 0,
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  overflow: 'hidden',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: WEB_HEADER_GAP, marginBottom: desktopHomeCarouselQuoteAniv ? scaleWebDesktop(4, true) : scaleWebDesktop(6, true), paddingTop: scaleWebDesktop(2, true) }}>
                  <View style={{ width: HEADER_ICON_BOX_SIZE, height: HEADER_ICON_BOX_SIZE, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                    <AppIcon name={quoteType === 'motivacional' ? 'chatbubble-outline' : 'book-outline'} size={HEADER_ICON_SIZE} color={cardIconColor} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                      {quoteType === 'motivacional' ? 'Frase do dia' : 'Versículo do dia'}
                    </Text>
                  </View>
                </View>
                <View style={{ flex: 1, minHeight: 0, justifyContent: 'center' }}>
                  <Text
                    style={[ds.quoteText, { color: colors.text, fontSize: 13, fontWeight: '400', textAlign: 'center', width: '100%', lineHeight: 20 }]}
                    numberOfLines={4}
                  >
                    "{quoteBody}"
                  </Text>
                  {quoteSource ? (
                    <Text
                      style={{
                        marginTop: scaleWebDesktop(1, true),
                        fontSize: scaleWebDesktop(9, true),
                        fontWeight: '500',
                        color: colors.textSecondary,
                        textAlign: 'center',
                        width: '100%',
                      }}
                      numberOfLines={1}
                    >
                      {quoteSource}
                    </Text>
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 6, paddingBottom: 2 }}>
                  <TouchableOpacity
                    onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setQuoteType(quoteType === 'motivacional' ? 'verso' : 'motivacional'); }}
                    activeOpacity={0.85}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: scaleWebDesktop(5, true),
                      paddingVertical: scaleWebDesktop(4, true),
                      paddingHorizontal: scaleWebDesktop(8, true),
                      borderRadius: 999,
                      ...chromeBtnBox(colors),
                    }}
                  >
                    <Ionicons
                      name={quoteType === 'motivacional' ? 'book-outline' : 'chatbubble-outline'}
                      size={scaleWebDesktop(14, true)}
                      color={colors.textSecondary}
                    />
                    <Text style={{ fontSize: scaleWebDesktop(11, true), fontWeight: '700', color: colors.textSecondary }}>
                      {quoteType === 'motivacional' ? 'Versículo' : 'Frase'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => { e?.stopPropagation?.(); playTapSound(); handleShareQuote(); }}
                    activeOpacity={0.85}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: scaleWebDesktop(5, true),
                      paddingVertical: scaleWebDesktop(4, true),
                      paddingHorizontal: scaleWebDesktop(8, true),
                      borderRadius: 999,
                      ...chromeBtnBox(colors),
                    }}
                  >
                    <Ionicons name="share-social-outline" size={scaleWebDesktop(14, true)} color={colors.textSecondary} />
                    <Text style={{ fontSize: scaleWebDesktop(11, true), fontWeight: '700', color: colors.textSecondary }}>
                      Compartilhar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        </View>
      ) : (
      <TouchableOpacity
        key="quote"
        onPress={() => openImageGenerator?.({ quote, quoteType })}
        activeOpacity={0.8}
        style={{
          marginHorizontal: WEB_CARD_MARGIN_H,
          marginTop: WEB_CARD_MARGIN_TOP,
        }}
      >
        <GlassCard
          colors={colors}
          solid
          style={[
            ds.card,
            {
              padding: WEB_CARD_PADDING,
              minHeight: scaleWebDesktop(112, true),
            },
          ]}
          contentStyle={{ padding: WEB_CARD_PADDING }}
        >
          <View style={{ flexDirection: 'column' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: WEB_HEADER_GAP, marginBottom: 12 }}>
            <View style={{ width: HEADER_ICON_BOX_SIZE, height: HEADER_ICON_BOX_SIZE, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
              <AppIcon name={quoteType === 'motivacional' ? 'chatbubble-outline' : 'book-outline'} size={HEADER_ICON_SIZE} color={cardIconColor} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                {quoteType === 'motivacional' ? 'Frase do dia' : 'Versículo do dia'}
              </Text>
            </View>
            <View style={cardHeaderActionsStyle}>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); playTapSound(); setQuoteType(quoteType === 'motivacional' ? 'verso' : 'motivacional'); }}
                style={cardActionButtonStyle}
              >
                <Ionicons name={quoteType === 'motivacional' ? 'book-outline' : 'chatbubble-outline'} size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); playTapSound(); openImageGenerator?.({ quote, quoteType }); }}
                style={cardActionButtonStyle}
              >
                <Ionicons name="share-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            </View>
            <View style={{ justifyContent: 'center' }}>
              <Text
                style={[ds.quoteText, { color: colors.text, fontSize: ds.quoteText.fontSize, fontWeight: ds.quoteText.fontWeight, textAlign: 'left', lineHeight: ds.quoteText.lineHeight }]}
                numberOfLines={3}
              >
                "{quoteBody}"
              </Text>
              {quoteSource ? (
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 10,
                    fontWeight: '500',
                    color: colors.textSecondary,
                    textAlign: 'left',
                  }}
                  numberOfLines={1}
                >
                  {quoteSource}
                </Text>
              ) : null}
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
      )
    ),
    aniversariantes: (() => {
      const parseBirthDate = (str) => {
        if (!str || !String(str).trim()) return null;
        const parts = String(str).trim().split(/[/\-]/);
        if (parts.length < 2) return null;
        const day = parseInt(parts[0], 10) || 1;
        const month = (parseInt(parts[1], 10) || 1) - 1;
        const year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear();
        return new Date(year, month, day);
      };
      const h = new Date();
      const day = h.getDay();
      const diff = h.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(h);
      mon.setDate(diff);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      const tipoFiltroAniv = (showEmpresaFeatures && viewMode === 'empresa') ? 'empresa' : 'pessoal';
      const aniversariantesSemanaRaw = (clients || []).filter((c) => {
        if ((c.tipo || 'empresa') !== tipoFiltroAniv) return false;
        const bd = c.birthDate || c.dataNascimento;
        if (!bd) return false;
        const d = parseBirthDate(bd) || new Date(bd);
        if (isNaN(d.getTime())) return false;
        const bdThisYear = new Date(h.getFullYear(), d.getMonth(), d.getDate());
        return bdThisYear >= mon && bdThisYear <= sun;
      });
      const aniversariantesSemana = [...aniversariantesSemanaRaw].sort((a, b) => {
        const da = parseBirthDate(a.birthDate || a.dataNascimento);
        const db = parseBirthDate(b.birthDate || b.dataNascimento);
        if (!da || !db) return 0;
        const aThisYear = new Date(h.getFullYear(), da.getMonth(), da.getDate()).getTime();
        const bThisYear = new Date(h.getFullYear(), db.getMonth(), db.getDate()).getTime();
        return aThisYear - bThisYear;
      });
      const aniversariantesPreview = aniversariantesSemana.slice(0, 3);
      const getDiaLabel = (str) => {
        const d = parseBirthDate(str);
        if (!d) return null;
        const hoje = new Date();
        const bd = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
        const diff = Math.floor((bd - hoje) / (24 * 60 * 60 * 1000));
        if (diff === 0) return 'hoje';
        if (diff === 1) return 'amanhã';
        return null;
      };
      const formatBirthShort = (str) => {
        if (!str || !String(str).trim()) return '';
        const parts = String(str).trim().split(/[/\-]/);
        if (parts.length < 2) return str;
        const d = parts[0]?.padStart(2, '0') || '00';
        const m = parts[1]?.padStart(2, '0') || '00';
        return `${d}/${m}`;
      };
      const isEmpresa = showEmpresaFeatures && viewMode === 'empresa';
      return (
        <View
          key="aniversariantes"
          style={{
            marginHorizontal: WEB_CARD_MARGIN_H,
            marginTop: desktopHomeCarouselQuoteAniv ? 0 : WEB_CARD_MARGIN_TOP,
            ...(useWebLayout
              ? { width: '100%', alignSelf: 'stretch', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }
              : null),
          }}
        >
          <GlassCard
            colors={colors}
            solid
            style={[
              ds.card,
              desktopHomeCarouselQuoteAniv || useWebLayout
                ? {
                    padding: scaleWebDesktop(7, true),
                    height: '100%',
                    flex: 1,
                    minHeight: 0,
                    width: '100%',
                    borderRadius: scaleWebDesktop(20, true),
                    overflow: 'hidden',
                  }
                : {
                    padding: WEB_CARD_PADDING,
                    minHeight: TRIO_CARD_HEIGHT,
                  },
            ]}
            contentStyle={
              desktopHomeCarouselQuoteAniv || useWebLayout
                ? {
                    padding: scaleWebDesktop(7, true),
                    height: '100%',
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden',
                    flexDirection: 'column',
                  }
                : {
                    padding: WEB_CARD_PADDING,
                  }
            }
          >
            {desktopHomeCarouselQuoteAniv ? (
              <View style={{ flex: 1, minHeight: 0, flexDirection: 'column' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: WEB_HEADER_GAP, marginBottom: useWebLayout ? scaleWebDesktop(4, true) : 12 }}>
                  <TouchableOpacity onPress={() => { playTapSound(); openAniversariantes?.(); }} activeOpacity={0.9} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: useWebLayout ? 8 : 12 }}>
                    <View style={{ width: HEADER_ICON_BOX_SIZE, height: HEADER_ICON_BOX_SIZE, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="gift-outline" size={HEADER_ICON_SIZE} color={cardIconColor} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: useWebLayout ? 14 : 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>Aniversariantes da semana</Text>
                      <Text style={{ fontSize: useWebLayout ? 11 : 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }} numberOfLines={1}>
                        {aniversariantesSemana.length > 0
                          ? (isEmpresa ? `${aniversariantesSemana.length} cliente${aniversariantesSemana.length !== 1 ? 's' : ''} (empresa)` : `${aniversariantesSemana.length} família e amigos (pessoal)`)
                          : (isEmpresa ? 'Cadastre data de nascimento dos clientes' : 'Cadastre data de nascimento')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, minHeight: 0 }}>
                  {useWebLayout ? (
                    aniversariantesPreview.length > 0 ? (
                      <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 8, width: '100%' }}>
                        {aniversariantesPreview.map((c) => {
                          const bd = c.birthDate || c.dataNascimento;
                          const diaLabel = getDiaLabel(bd);
                          const dataStr = formatBirthShort(bd) + (diaLabel ? ` · ${diaLabel}` : '');
                          return (
                            <View
                              key={c.id}
                              style={{
                                flex: 1,
                                minWidth: 0,
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 10,
                                paddingHorizontal: 8,
                                paddingVertical: 6,
                                backgroundColor: colors.bg,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }} numberOfLines={1}>{c.name}</Text>
                                <Text style={{ fontSize: 10, color: colors.textSecondary }} numberOfLines={1}>{dataStr}</Text>
                              </View>
                              {c.phone?.trim() ? (
                                <TouchableOpacity
                                  onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setParabensModalClient(c); setParabensFrase(FRASES_PARABENS[0] || ''); }}
                                  style={{ padding: 4, backgroundColor: 'transparent', borderRadius: 8 }}
                                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                >
                                  <Ionicons name="logo-whatsapp" size={16} color={colors.textSecondary} />
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={{ flex: 1, minHeight: 0, justifyContent: 'center' }}>
                        <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center' }}>
                          Mande uma mensagem de parabéns pelo WhatsApp
                        </Text>
                      </View>
                    )
                  ) : (
                    <ScrollableCardList
                      items={aniversariantesSemana}
                      colors={colors}
                      accentColor={colors.primary}
                      emptyText="Mande uma mensagem de parabéns pelo WhatsApp"
                      onVerMais={() => { playTapSound(); openAniversariantes?.(); }}
                      fixedVisibleHeight="fill"
                      centerEmpty={useWebLayout}
                      renderItem={(c) => {
                        const bd = c.birthDate || c.dataNascimento;
                        const diaLabel = getDiaLabel(bd);
                        const dataStr = formatBirthShort(bd) + (diaLabel ? ` · ${diaLabel}` : '');
                        return (
                          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingLeft: 4 }}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>{c.name}</Text>
                              <Text style={{ fontSize: 10, color: colors.textSecondary }} numberOfLines={1}>{dataStr}{c.phone ? ` · ${c.phone}` : ''}</Text>
                            </View>
                            {c.phone?.trim() ? (
                              <TouchableOpacity
                                onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setParabensModalClient(c); setParabensFrase(FRASES_PARABENS[0] || ''); }}
                                style={{ padding: 6, backgroundColor: 'transparent', borderRadius: 10 }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Ionicons name="logo-whatsapp" size={20} color={colors.textSecondary} />
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        );
                      }}
                    />
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 6, paddingBottom: 2 }}>
                  <TouchableOpacity
                    onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openCadastro?.('clientes'); }}
                    activeOpacity={0.85}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: scaleWebDesktop(5, true),
                      paddingVertical: scaleWebDesktop(4, true),
                      paddingHorizontal: scaleWebDesktop(8, true),
                      borderRadius: 999,
                      ...chromeBtnBox(colors),
                    }}
                  >
                    <Ionicons name="add" size={scaleWebDesktop(14, true)} color={colors.textSecondary} />
                    <Text style={{ fontSize: scaleWebDesktop(11, true), fontWeight: '700', color: colors.textSecondary }}>Cliente</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAniversariantes?.(); }}
                    activeOpacity={0.85}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: scaleWebDesktop(5, true),
                      paddingVertical: scaleWebDesktop(4, true),
                      paddingHorizontal: scaleWebDesktop(8, true),
                      borderRadius: 999,
                      ...chromeBtnBox(colors),
                    }}
                  >
                    <AppIcon name="expand-outline" size={scaleWebDesktop(14, true)} color={colors.textSecondary} />
                    <Text style={{ fontSize: scaleWebDesktop(11, true), fontWeight: '700', color: colors.textSecondary }}>Ver todos</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: WEB_HEADER_GAP, marginBottom: useWebLayout ? 10 : 12 }}>
                  <TouchableOpacity onPress={() => { playTapSound(); openAniversariantes?.(); }} activeOpacity={0.9} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: useWebLayout ? 8 : 12 }}>
                    <View style={{ width: HEADER_ICON_BOX_SIZE, height: HEADER_ICON_BOX_SIZE, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="gift-outline" size={HEADER_ICON_SIZE} color={cardIconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: useWebLayout ? 14 : 16, fontWeight: '700', color: colors.text }}>Aniversariantes da semana</Text>
                      <Text style={{ fontSize: useWebLayout ? 11 : 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>
                        {aniversariantesSemana.length > 0
                          ? (isEmpresa ? `${aniversariantesSemana.length} cliente${aniversariantesSemana.length !== 1 ? 's' : ''} (empresa)` : `${aniversariantesSemana.length} família e amigos (pessoal)`)
                          : (isEmpresa ? 'Cadastre data de nascimento dos clientes' : 'Cadastre data de nascimento')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <View style={cardHeaderActionsStyle}>
                    <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openCadastro?.('clientes'); }} style={cardActionButtonStyle}>
                      <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAniversariantes?.(); }} style={cardActionButtonStyle}>
                      <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
                {useWebLayout ? (
                  aniversariantesPreview.length > 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 8, width: '100%' }}>
                      {aniversariantesPreview.map((c) => {
                        const bd = c.birthDate || c.dataNascimento;
                        const diaLabel = getDiaLabel(bd);
                        const dataStr = formatBirthShort(bd) + (diaLabel ? ` · ${diaLabel}` : '');
                        return (
                          <View
                            key={c.id}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              borderWidth: 1,
                              borderColor: colors.border,
                              borderRadius: 10,
                              paddingHorizontal: 8,
                              paddingVertical: 6,
                              backgroundColor: colors.bg,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }} numberOfLines={1}>{c.name}</Text>
                              <Text style={{ fontSize: 10, color: colors.textSecondary }} numberOfLines={1}>{dataStr}</Text>
                            </View>
                            {c.phone?.trim() ? (
                              <TouchableOpacity
                                onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setParabensModalClient(c); setParabensFrase(FRASES_PARABENS[0] || ''); }}
                                style={{ padding: 4, backgroundColor: 'transparent', borderRadius: 8 }}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              >
                                <Ionicons name="logo-whatsapp" size={16} color={colors.textSecondary} />
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center', paddingVertical: 8 }}>
                      Mande uma mensagem de parabéns pelo WhatsApp
                    </Text>
                  )
                ) : (
                  <ScrollableCardList
                    items={aniversariantesSemana}
                    colors={colors}
                    accentColor={colors.primary}
                    emptyText="Mande uma mensagem de parabéns pelo WhatsApp"
                    onVerMais={() => { playTapSound(); openAniversariantes?.(); }}
                    fixedVisibleHeight={useWebLayout}
                    centerEmpty={useWebLayout}
                    renderItem={(c) => {
                      const bd = c.birthDate || c.dataNascimento;
                      const diaLabel = getDiaLabel(bd);
                      const dataStr = formatBirthShort(bd) + (diaLabel ? ` · ${diaLabel}` : '');
                      return (
                        <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 4 }}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{c.name}</Text>
                            <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>{dataStr}{c.phone ? ` · ${c.phone}` : ''}</Text>
                          </View>
                          {c.phone?.trim() ? (
                            <TouchableOpacity
                              onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setParabensModalClient(c); setParabensFrase(FRASES_PARABENS[0] || ''); }}
                              style={{ padding: 8, backgroundColor: 'transparent', borderRadius: 10 }}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="logo-whatsapp" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      );
                    }}
                  />
                )}
              </>
            )}
          </GlassCard>
        </View>
      );
    })(),
    meusgastos: (
      <View
        key="meusgastos"
        style={{
          marginHorizontal: WEB_CARD_MARGIN_H,
          marginTop: WEB_CARD_MARGIN_TOP,
          ...(useWebLayout ? { flex: 1, minHeight: 0, minWidth: 0, height: '100%', width: '100%', overflow: 'hidden' } : null),
        }}
      >
        <GlassCard
          colors={colors}
          solid
          style={[ds.card, { overflow: 'hidden' }, useWebLayout ? { flex: 1, minHeight: 0, height: '100%' } : null]}
          contentStyle={{ padding: 0, flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, flexShrink: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                <AppIcon name="chatbubbles-outline" size={26} color={cardIconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Dock</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>Seu assessor Dock: texto, voz e foto da notinha</Text>
                <VisionOcrStatusBadge colors={colors} compact />
              </View>
              <View style={cardHeaderActionsStyle}>
                <TouchableOpacity
                  onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openMeusGastos?.(); }}
                  style={cardActionButtonStyle}
                  activeOpacity={0.9}
                >
                  <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={useWebLayout ? { flex: 1, minHeight: 0, overflow: 'hidden' } : { height: 330, marginTop: 6 }}>
            <MeusGastosChat embedded />
          </View>
        </GlassCard>
      </View>
    ),
    anotacoes: (
      <TouchableOpacity
        key="anotacoes"
        onPress={() => { playTapSound(); openAnotacoes?.(); }}
        activeOpacity={0.9}
        style={{
          marginHorizontal: WEB_CARD_MARGIN_H,
          marginTop: WEB_CARD_MARGIN_TOP,
          ...(useWebLayout ? { flex: 1, minHeight: 0, width: '100%', alignSelf: 'stretch' } : null),
        }}
      >
        <GlassCard
          colors={colors}
          solid
          style={[ds.card, { padding: WEB_CARD_PADDING }, useWebLayout ? { flex: 1, minHeight: 0 } : null]}
          contentStyle={{
            padding: WEB_CARD_PADDING,
            ...(useWebLayout ? { flex: 1, minHeight: 0, flexDirection: 'column' } : null),
          }}
        >
          {useWebLayout ? (
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <View style={{ width: HEADER_ICON_BOX_SIZE, height: HEADER_ICON_BOX_SIZE, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                    <AppIcon name="document-text-outline" size={HEADER_ICON_SIZE} color={cardIconColor} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                    Minhas anotações
                  </Text>
                </View>
                <View style={cardHeaderActionsStyle}>
                  <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAnotacoes?.({ create: true }); }} style={cardActionButtonStyle}>
                    <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAnotacoes?.(); }} style={cardActionButtonStyle}>
                    <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }} numberOfLines={1}>
                {notes.length === 0 ? 'Suas notas e lembretes' : `${notes.length} ${notes.length === 1 ? 'anotação' : 'anotações'}`}
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                <AppIcon name="document-text-outline" size={26} color={cardIconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Minhas anotações</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>
                  {notes.length === 0 ? 'Suas notas e lembretes' : `${notes.length} ${notes.length === 1 ? 'anotação' : 'anotações'}`}
                </Text>
              </View>
              <View style={cardHeaderActionsStyle}>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAnotacoes?.({ create: true }); }} style={cardActionButtonStyle}>
                  <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAnotacoes?.(); }} style={cardActionButtonStyle}>
                  <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          <View style={useWebLayout ? { flex: 1, minHeight: 0 } : undefined}>
            <ScrollableCardList
              items={notes}
              maxPreviewItems={CARD_PREVIEW_MAX_ITEMS}
              colors={colors}
              accentColor={colors.primary}
              emptyText="Nenhuma anotação ainda"
              onVerMais={() => { playTapSound(); setExpandedCard('anotacoes'); }}
              centerEmpty={useWebLayout}
              fixedVisibleHeight={useWebLayout ? 'fill' : false}
              renderItem={(n) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 22, borderLeftWidth: 3, borderLeftColor: CARD_ICON_COLORS.anotacoes + '40', marginLeft: 4 }}>
                  <Text style={{ fontSize: 15, color: colors.text, flex: 1 }} numberOfLines={1}>{n.title || 'Sem título'}</Text>
                  <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAnotacoes?.({ editNoteId: n.id }); }} style={{ padding: 6 }}>
                    <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => {
                      playTapSound();
                      onDeletePress('Excluir', 'Quer excluir esta anotação?', deleteNote, n.id)(e);
                    }}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </GlassCard>
      </TouchableOpacity>
    ),
    listacompras: (() => {
      const filtered = filtroListaCompras === 'todos' ? shoppingItems : shoppingItems.filter((i) => (i.tipo || 'pessoal') === filtroListaCompras);
      const filteredPendentes = filtered.filter((i) => !i.checked);
      const filteredConcluidas = filtered.filter((i) => i.checked);
      const displayItems = showConcluidasListaCompras ? filteredConcluidas : filteredPendentes;
      const toggleItem = (e, i) => {
        e?.stopPropagation?.();
        playTapSound();
        updateShoppingItem(i.id, { checked: !i.checked });
      };
      return (
        <TouchableOpacity
          key="listacompras"
          onPress={() => { playTapSound(); openListaCompras?.(); }}
          activeOpacity={0.9}
          style={{
            marginHorizontal: WEB_CARD_MARGIN_H,
            marginTop: WEB_CARD_MARGIN_TOP,
            ...(useWebLayout ? { flex: 1, minHeight: 0, width: '100%', alignSelf: 'stretch' } : null),
          }}
        >
          <GlassCard
            colors={colors}
            solid
            style={[ds.card, { padding: WEB_CARD_PADDING }, useWebLayout ? { flex: 1, minHeight: 0 } : null]}
            contentStyle={{
              padding: WEB_CARD_PADDING,
              ...(useWebLayout ? { flex: 1, minHeight: 0, flexDirection: 'column' } : null),
            }}
          >
            {useWebLayout ? (
              <View style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <View style={{ width: HEADER_ICON_BOX_SIZE, height: HEADER_ICON_BOX_SIZE, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                      <AppIcon name="cart-outline" size={HEADER_ICON_SIZE} color={cardIconColor} />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {showConcluidasListaCompras ? 'Compras concluídas' : 'Lista de compras'}
                    </Text>
                  </View>
                  <View style={cardHeaderActionsStyle}>
                    <TouchableOpacity
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        playTapSound();
                        setShowConcluidasListaCompras(!showConcluidasListaCompras);
                      }}
                      style={cardActionButtonStyle}
                    >
                      <AppIcon name={showConcluidasListaCompras ? 'list-outline' : 'checkmark-done-outline'} size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openListaCompras?.(); }} style={cardActionButtonStyle}>
                      <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openListaCompras?.(); }} style={cardActionButtonStyle}>
                      <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }} numberOfLines={1}>
                  {showConcluidasListaCompras
                    ? (filteredConcluidas.length === 0 ? 'Nenhuma compra concluída' : `${filteredConcluidas.length} concluída${filteredConcluidas.length !== 1 ? 's' : ''}`)
                    : (filteredPendentes.length === 0 ? 'Anote o que precisa comprar' : `${filteredPendentes.length} pendente${filteredPendentes.length !== 1 ? 's' : ''}`)}
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                  <AppIcon name="cart-outline" size={26} color={cardIconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                    {showConcluidasListaCompras ? 'Compras concluídas' : 'Lista de compras'}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>
                    {showConcluidasListaCompras
                      ? (filteredConcluidas.length === 0 ? 'Nenhuma compra concluída' : `${filteredConcluidas.length} concluída${filteredConcluidas.length !== 1 ? 's' : ''}`)
                      : (filteredPendentes.length === 0 ? 'Anote o que precisa comprar' : `${filteredPendentes.length} pendente${filteredPendentes.length !== 1 ? 's' : ''}`)}
                  </Text>
                </View>
                <View style={cardHeaderActionsStyle}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      playTapSound();
                      setShowConcluidasListaCompras(!showConcluidasListaCompras);
                    }}
                    style={cardActionButtonStyle}
                  >
                    <AppIcon name={showConcluidasListaCompras ? 'list-outline' : 'checkmark-done-outline'} size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openListaCompras?.(); }} style={cardActionButtonStyle}>
                    <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openListaCompras?.(); }} style={cardActionButtonStyle}>
                    <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View style={{ width: '100%', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' }}>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setFiltroListaCompras('todos'); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, ...chromeBtnBox(colors, { active: filtroListaCompras === 'todos' }) }}>
                  <Ionicons name="list" size={14} color={filtroListaCompras === 'todos' ? colors.primary : colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: filtroListaCompras === 'todos' ? colors.primary : colors.textSecondary, fontWeight: '600' }}>Todos</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setFiltroListaCompras('pessoal'); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, ...chromeBtnBox(colors, { active: filtroListaCompras === 'pessoal' }) }}>
                  <Ionicons name="person-outline" size={14} color={filtroListaCompras === 'pessoal' ? colors.primary : colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: filtroListaCompras === 'pessoal' ? colors.primary : colors.textSecondary, fontWeight: '600' }}>Pessoal</Text>
                </TouchableOpacity>
                {showEmpresaFeatures && (
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setFiltroListaCompras('empresa'); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, ...chromeBtnBox(colors, { active: filtroListaCompras === 'empresa' }) }}>
                  <Ionicons name="business-outline" size={14} color={filtroListaCompras === 'empresa' ? colors.primary : colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: filtroListaCompras === 'empresa' ? colors.primary : colors.textSecondary, fontWeight: '600' }}>Empresa</Text>
                </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={useWebLayout ? { flex: 1, minHeight: 0 } : undefined}>
              <ScrollableCardList
                items={displayItems}
                maxPreviewItems={CARD_PREVIEW_MAX_ITEMS}
                colors={colors}
                accentColor={colors.primary}
                emptyText={showConcluidasListaCompras ? 'Nenhuma compra concluída' : 'Nenhum item na lista'}
                onVerMais={() => { playTapSound(); setExpandedCard('listacompras'); }}
                itemMarginBottom={8}
                centerEmpty={useWebLayout}
                fixedVisibleHeight={useWebLayout ? 'fill' : false}
                renderItem={(i) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                    <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: i.checked ? colors.primary : colors.border, backgroundColor: i.checked ? colors.primary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                      {i.checked && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <Text style={{ fontSize: 15, color: colors.text, flex: 1, textDecorationLine: i.checked ? 'line-through' : 'none' }} numberOfLines={1}>{i.title}</Text>
                    <TouchableOpacity
                      onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openListaCompras?.(); }}
                      style={{ padding: 6 }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => { e?.stopPropagation?.(); playTapSound(); updateShoppingItem(i.id, { checked: !i.checked }); }}
                      style={{ padding: 6 }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name={i.checked ? 'arrow-undo' : 'checkmark-done'} size={16} color={i.checked ? colors.textSecondary : '#10b981'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => {
                        playTapSound();
                        onDeletePress('Excluir', 'Quer excluir este item da lista?', deleteShoppingItem, i.id)(e);
                      }}
                      style={{ padding: 6 }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
              />
            </View>
          </GlassCard>
        </TouchableOpacity>
      );
    })(),
    produtividade: (
      <View key="produtividade" style={{ marginHorizontal: WEB_CARD_MARGIN_H, marginTop: WEB_CARD_MARGIN_TOP }}>
        <GlassCard colors={colors} solid style={[ds.card, { padding: WEB_CARD_PADDING }]} contentStyle={{ padding: WEB_CARD_PADDING }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity
              onPress={() => { playTapSound(); setWebProductivityTab('anotacoes'); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, ...chromeBtnBox(colors, { active: webProductivityTab === 'anotacoes' }) }}
            >
              <Ionicons name="document-text-outline" size={14} color={webProductivityTab === 'anotacoes' ? colors.primary : colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: webProductivityTab === 'anotacoes' ? colors.primary : colors.textSecondary }}>Minhas anotações</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { playTapSound(); setWebProductivityTab('compras'); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, ...chromeBtnBox(colors, { active: webProductivityTab === 'compras' }) }}
            >
              <Ionicons name="cart-outline" size={14} color={webProductivityTab === 'compras' ? colors.primary : colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: webProductivityTab === 'compras' ? colors.primary : colors.textSecondary }}>Minhas compras</Text>
            </TouchableOpacity>
            <View style={{ marginLeft: 'auto', ...cardHeaderActionsStyle }}>
              <TouchableOpacity
                onPress={() => { playTapSound(); webProductivityTab === 'anotacoes' ? openAnotacoes?.() : openListaCompras?.(); }}
                style={cardActionButtonStyle}
              >
                <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { playTapSound(); webProductivityTab === 'anotacoes' ? openAnotacoes?.() : openListaCompras?.(); }}
                style={cardActionButtonStyle}
              >
                <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          {webProductivityTab === 'anotacoes' ? (
            <ScrollableCardList
              items={notes}
              maxPreviewItems={CARD_PREVIEW_MAX_ITEMS}
              colors={colors}
              accentColor={colors.primary}
              emptyText="Nenhuma anotação ainda"
              onVerMais={() => { playTapSound(); openAnotacoes?.(); }}
              centerEmpty={useWebLayout}
              renderItem={(n) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 22, borderLeftWidth: 3, borderLeftColor: CARD_ICON_COLORS.anotacoes + '40', marginLeft: 4 }}>
                  <Text style={{ fontSize: 15, color: colors.text, flex: 1 }} numberOfLines={1}>{n.title || 'Sem título'}</Text>
                </View>
              )}
            />
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => { playTapSound(); setShowConcluidasProdCompras(!showConcluidasProdCompras); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, ...chromeBtnBox(colors) }}
                >
                  <AppIcon name={showConcluidasProdCompras ? 'list-outline' : 'checkmark-done-outline'} size={16} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' }}>
                    {showConcluidasProdCompras ? 'Ver pendentes' : 'Ver compras concluídas'}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollableCardList
                items={
                  showConcluidasProdCompras
                    ? (shoppingItems || []).filter((i) => i.checked)
                    : (shoppingItems || []).filter((i) => !i.checked)
                }
                maxPreviewItems={CARD_PREVIEW_MAX_ITEMS}
                colors={colors}
                accentColor={colors.primary}
                emptyText={showConcluidasProdCompras ? 'Nenhuma compra concluída' : 'Nenhum item na lista'}
                onVerMais={() => { playTapSound(); openListaCompras?.(); }}
                centerEmpty={useWebLayout}
                renderItem={(i) => (
                  <TouchableOpacity
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      playTapSound();
                      updateShoppingItem(i.id, { checked: !i.checked });
                    }}
                    activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: i.checked ? colors.primary : colors.border,
                        backgroundColor: i.checked ? colors.primary : 'transparent',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {i.checked ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                    </View>
                    <Text
                      style={{
                        fontSize: 15,
                        color: colors.text,
                        flex: 1,
                        textDecorationLine: i.checked ? 'line-through' : 'none',
                      }}
                      numberOfLines={1}
                    >
                      {i.title}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </>
          )}
        </GlassCard>
      </View>
    ),
    proximasfaturas: (() => {
      const { unpaid, paid } = proximasFaturasLists;
      const displayItems = showContasPagasProxFaturas ? paid : unpaid;
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const renderRow = (b) => {
        const due = parseBoletoDate(b.dueDate);
        const vencida = !b.paid && due && due < hoje;
        const title = (b.name || '').trim() || 'Fatura';
        return (
          <View
            key={b.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 6,
              paddingLeft: 18,
              borderLeftWidth: 3,
              borderLeftColor: `${CARD_ICON_COLORS.proximasfaturas}40`,
              marginLeft: 4,
              marginBottom: 4,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={1}>{title}</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                {fmt(Number(b.amount) || 0)} · Venc. {b.dueDate || '—'}
              </Text>
              {vencida ? (
                <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: '800', marginTop: 2 }}>Vencida</Text>
              ) : null}
              {b.paid ? (
                <Text style={{ fontSize: 10, color: '#10b981', fontWeight: '700', marginTop: 2 }}>Paga</Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={(e) => {
                e?.stopPropagation?.();
                playTapSound();
                setExpandedCard(null);
                openCadastro?.('boletos', { editItemId: b.id });
              }}
              style={{ padding: 6 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Editar"
            >
              <Ionicons name="pencil" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {b.paid && showContasPagasProxFaturas ? (
              <TouchableOpacity
                onPress={(e) => {
                  e?.stopPropagation?.();
                  playTapSound();
                  updateBoleto(b.id, { paid: false });
                }}
                style={{ padding: 6 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Marcar como pendente"
              >
                <Ionicons name="arrow-undo" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : !b.paid ? (
              <TouchableOpacity
                onPress={(e) => {
                  e?.stopPropagation?.();
                  playTapSound();
                  updateBoleto(b.id, { paid: true });
                }}
                style={{ padding: 6 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Marcar como paga"
              >
                <Ionicons name="checkmark-done" size={18} color="#10b981" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={(e) => {
                e?.stopPropagation?.();
                playTapSound();
                (async () => {
                  const ok = await confirmDestructive('Excluir fatura', 'Excluir este registro?');
                  if (ok) await deleteBoleto(b.id);
                })();
              }}
              style={{ padding: 6 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Excluir"
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        );
      };
      return (
        <TouchableOpacity
          key="proximasfaturas"
          onPress={() => { playTapSound(); openCadastro?.('boletos'); }}
          activeOpacity={0.9}
          style={{
            marginHorizontal: WEB_CARD_MARGIN_H,
            marginTop: WEB_CARD_MARGIN_TOP,
            ...(useWebLayout ? { flex: 1, minHeight: 0, width: '100%', alignSelf: 'stretch' } : null),
          }}
        >
          <GlassCard
            colors={colors}
            solid
            style={[ds.card, { padding: WEB_CARD_PADDING }, useWebLayout ? { flex: 1, minHeight: 0 } : null]}
            contentStyle={{
              padding: WEB_CARD_PADDING,
              ...(useWebLayout ? { flex: 1, minHeight: 0, flexDirection: 'column' } : null),
            }}
          >
            {useWebLayout ? (
              <View style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <View style={{ width: HEADER_ICON_BOX_SIZE, height: HEADER_ICON_BOX_SIZE, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="receipt-outline" size={HEADER_ICON_SIZE} color={CARD_ICON_COLORS.proximasfaturas} />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {showContasPagasProxFaturas ? 'Contas pagas' : 'Próximas faturas'}
                    </Text>
                  </View>
                  <View style={cardHeaderActionsStyle}>
                    <TouchableOpacity
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        playTapSound();
                        setShowContasPagasProxFaturas(!showContasPagasProxFaturas);
                      }}
                      style={cardActionButtonStyle}
                      accessibilityLabel={showContasPagasProxFaturas ? 'Ver pendentes' : 'Ver contas pagas'}
                    >
                      <AppIcon
                        name={showContasPagasProxFaturas ? 'list-outline' : 'checkmark-done-outline'}
                        size={CARD_ACTION_ICON_SIZE}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        playTapSound();
                        openCadastro?.('boletos');
                      }}
                      style={cardActionButtonStyle}
                    >
                      <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        playTapSound();
                        setExpandedCard('proximasfaturas');
                      }}
                      style={cardActionButtonStyle}
                    >
                      <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }} numberOfLines={2}>
                  {showContasPagasProxFaturas
                    ? (paid.length === 0 ? 'Nenhuma fatura paga no período' : `${paid.length} fatura${paid.length !== 1 ? 's' : ''} paga${paid.length !== 1 ? 's' : ''}`)
                    : (unpaid.length === 0
                      ? 'Nenhuma fatura pendente'
                      : (() => {
                          const nv = unpaid.filter((x) => x._due && x._due < hoje).length;
                          return nv > 0
                            ? `${unpaid.length} pendente${unpaid.length !== 1 ? 's' : ''} · ${nv} vencida${nv !== 1 ? 's' : ''}`
                            : `${unpaid.length} pendente${unpaid.length !== 1 ? 's' : ''} · por vencimento`;
                        })())}
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="receipt-outline" size={26} color={CARD_ICON_COLORS.proximasfaturas} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                    {showContasPagasProxFaturas ? 'Contas pagas' : 'Próximas faturas'}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }} numberOfLines={2}>
                    {showContasPagasProxFaturas
                      ? (paid.length === 0 ? 'Nenhuma fatura paga' : `${paid.length} paga${paid.length !== 1 ? 's' : ''}`)
                      : (unpaid.length === 0 ? 'Cadastre suas contas a pagar' : `${unpaid.length} pendente${unpaid.length !== 1 ? 's' : ''}`)}
                  </Text>
                </View>
                <View style={cardHeaderActionsStyle}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      playTapSound();
                      setShowContasPagasProxFaturas(!showContasPagasProxFaturas);
                    }}
                    style={cardActionButtonStyle}
                  >
                    <AppIcon name={showContasPagasProxFaturas ? 'list-outline' : 'checkmark-done-outline'} size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openCadastro?.('boletos'); }} style={cardActionButtonStyle}>
                    <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setExpandedCard('proximasfaturas'); }} style={cardActionButtonStyle}>
                    <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View style={useWebLayout ? { flex: 1, minHeight: 0 } : undefined}>
              <ScrollableCardList
                items={displayItems}
                maxPreviewItems={CARD_PREVIEW_MAX_ITEMS}
                colors={colors}
                accentColor={CARD_ICON_COLORS.proximasfaturas}
                emptyText={showContasPagasProxFaturas ? 'Nenhuma fatura paga' : 'Nenhuma fatura pendente'}
                onVerMais={() => { playTapSound(); setExpandedCard('proximasfaturas'); }}
                itemMarginBottom={8}
                centerEmpty={useWebLayout}
                fixedVisibleHeight={useWebLayout ? 'fill' : false}
                renderItem={(b) => renderRow(b)}
              />
            </View>
          </GlassCard>
        </TouchableOpacity>
      );
    })(),
  };

  const editChrome = !editMode ? null : (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        <TouchableOpacity
          onPress={() => { playTapSound(); saveCurrentInicioLayout(); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryRgba?.(0.12) ?? `${colors.primary}22` }}
        >
          <AppIcon name="save-outline" size={18} color={colors.primary} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>Salvar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { playTapSound(); saveFavoriteInicioLayout(); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}
        >
          <AppIcon name="star-outline" size={18} color={colors.text} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Favorito</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { playTapSound(); setShowCardPicker(true); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}
        >
          <AppIcon name="albums-outline" size={18} color={colors.text} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Layouts prontos</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
        Se sair da edição sem salvar, o Início volta ao último layout gravado.
      </Text>
      <TouchableOpacity
        style={{ padding: 16, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
        onPress={() => setShowCardPicker(true)}
      >
        <AppIcon name="add-circle-outline" size={26} color={colors.textSecondary} />
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>Acrescentar ou restaurar cards</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <TopBar
        title="Início"
        colors={colors}
        useLogoImage
        editMode={editMode}
        onOrganize={toggleEditMode}
        headerDate={now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
        deferFinancePrompt
        inlineToggle={
          useWebLayout && canToggleView ? (
            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} colors={colors} inline desktopHeaderSplit />
          ) : null
        }
        onManageCards={() => setShowCardPicker(true)}
        onCalculadora={useWebLayout ? openCalculadoraFull : undefined}
        onChat={useWebLayout ? openMeusGastos : undefined}
        onWhatsApp={showEmpresaFeatures ? openMensagensWhatsApp : undefined}
      />
      {!(useWebLayout && canToggleView) && canToggleView && <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} colors={colors} />}
      {isGuest && (
        <View style={{ marginHorizontal: useWebLayout ? WEB_DESKTOP_PAGE_PAD : 16, marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: colors.primaryRgba(0.2), borderWidth: 1, borderColor: colors.primary + '60', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>Modo visitante: os dados não são salvos. Faça login para persistir.</Text>
        </View>
      )}
      <ScrollView
        nativeID="dock-scroll-main"
        showsVerticalScrollIndicator={false}
        scrollEnabled
        nestedScrollEnabled={isWebMobile}
        style={getViewModeToggleScrollStyle(canToggleView, useWebLayout)}
        {...(Platform.OS === 'web' ? { dataSet: { dockScroll: 'main' } } : null)}
      >
        {useWebLayout ? (
          <View
            style={{
              paddingHorizontal: WEB_DESKTOP_PAGE_PAD,
              paddingTop: scaleWebDesktop(2, true),
              gap: WEB_DESKTOP_ROW_GAP,
            }}
          >
            {compactButtons ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {sectionOrder.map((id) => {
                  const meta = AVAILABLE_CARD_TYPES.find((c) => c.id === id) || { label: id, icon: 'apps-outline' };
                  const color = CARD_ICON_COLORS[id] || colors.primary;
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => { playTapSound(); setExpandedCard(id); }}
                      activeOpacity={0.88}
                      style={{
                        width: 128,
                        minHeight: 104,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: 10,
                      }}
                    >
                      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
                        <AppIcon name={meta.icon} size={24} color={color} />
                      </View>
                      <Text numberOfLines={2} style={{ fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center' }}>{meta.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
            <InicioDesktopGrid
              order={sectionOrder}
              gap={WEB_DESKTOP_ROW_GAP}
              heroMinHeight={webDesktopQuoteCarouselRowH}
              agendaMinHeight={WEB_AGENDA_ROW_MIN_H}
              defaultRowHeight={TRIO_CARD_HEIGHT || 220}
              weights={desktopWeights}
              heights={desktopHeights}
              onWeightsChange={setDesktopWeights}
              onHeightsChange={setDesktopHeights}
              editMode={editMode}
              colors={colors}
              cardsPerRow={desktopCols}
              onCardsPerRowChange={setDesktopCols}
              rowCols={desktopRowCols}
              rowSpans={desktopRowSpans}
              spanSide={desktopSpanSide}
              onRowColsChange={setDesktopRowCols}
              onRowSpansChange={(id, n) => setDesktopRowSpans((prev) => ({ ...(prev || {}), [id]: n }))}
              onSpanSideChange={(id, side) => setDesktopSpanSide((prev) => ({ ...(prev || {}), [id]: side }))}
              renderCard={(id) => {
                if (id === 'proximos') return sectionMap.leftAgendaCombo || sectionMap.proximos;
                return sectionMap[id] || null;
              }}
              onHide={(id) => setSectionOrder((prev) => prev.filter((x) => x !== id))}
              onMove={(id, dir) => {
                setSectionOrder((prev) =>
                  moveCardByArrow(prev, dir, id, desktopCols, {
                    rowCols: desktopRowCols,
                    rowSpans: desktopRowSpans,
                    spanSide: desktopSpanSide,
                  })
                );
              }}
              dragProps={{
                onLayoutMeasured: handleLayoutMeasured,
                onFloatStart: setFloatingId,
                onCardPress: handleCardPress,
                floatingId,
              }}
            />
            )}
            {editChrome}
          </View>
        ) : compactButtons ? (
          <View style={{ marginHorizontal: 16, marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {sectionOrder.map((id) => {
              const meta = AVAILABLE_CARD_TYPES.find((c) => c.id === id) || { label: id, icon: 'apps-outline' };
              const color = CARD_ICON_COLORS[id] || colors.primary;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => { playTapSound(); setExpandedCard(id); }}
                  style={{
                    width: '30%',
                    minWidth: 96,
                    minHeight: 92,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 8,
                    gap: 6,
                  }}
                >
                  <AppIcon name={meta.icon} size={22} color={color} />
                  <Text numberOfLines={2} style={{ fontSize: 11, fontWeight: '700', color: colors.text, textAlign: 'center' }}>{meta.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          sectionOrder.map((sid) => {
            const content = sectionMap[sid];
            if (!content) return null;
            return (
              <DraggableCard
                key={sid}
                id={sid}
                editMode={editMode}
                onLayoutMeasured={handleLayoutMeasured}
                onFloatStart={setFloatingId}
                onCardPress={handleCardPress}
                isFloating={floatingId === sid}
              >
                {content}
              </DraggableCard>
            );
          })
        )}
        {editMode && !useWebLayout && (
          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            {editChrome}
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 12 }}>Segure 3s para flutuar, role a tela e toque em outro card para trocar</Text>
          </View>
        )}
        <View style={{ height: useWebLayout && showEmpresaFeatures ? 196 : (isWebMobile ? 140 : 100) }} />
      </ScrollView>
      {useWebLayout && showEmpresaFeatures && webDesktopQuickButtons.length > 0 ? (
        <View
          pointerEvents="box-none"
          style={{
            ...(Platform.OS === 'web'
              ? { position: 'fixed', left: 0, right: 0, bottom: 0 }
              : { position: 'absolute', left: 0, right: 0, bottom: 0 }),
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {Platform.OS === 'web' ? (
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backdropFilter: 'blur(18px)',
                  WebkitBackdropFilter: 'blur(18px)',
                  maskImage: `linear-gradient(to bottom, transparent 0%, black ${Math.round(QUICK_ROW_SOLID_AT * 100)}%)`,
                  WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black ${Math.round(QUICK_ROW_SOLID_AT * 100)}%)`,
                }}
              />
            ) : (
              <BlurView
                intensity={42}
                tint={colors.isDarkBg ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
            )}
            <LinearGradient
              pointerEvents="none"
              colors={[quickRowScrim.transparent, quickRowScrim.fill, quickRowScrim.fill]}
              locations={[0, QUICK_ROW_SOLID_AT, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
          <View
            pointerEvents="auto"
            style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'stretch',
              gap: WEB_DESKTOP_ROW_GAP,
              paddingTop: QUICK_ROW_FADE_TOP,
              paddingBottom: QUICK_ROW_PAD_BOTTOM,
              paddingHorizontal: Platform.OS === 'web' ? '6%' : WEB_DESKTOP_PAGE_PAD,
              ...(Platform.OS === 'web' ? { transform: [{ translateX: -15 }] } : null),
            }}
          >
            {webDesktopQuickButtons.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => { playTapSound(); item.onPress?.(); }}
                activeOpacity={0.85}
                accessibilityLabel={`${item.label} (F${index + 1})`}
                style={{
                  flex: 1,
                  flexBasis: 0,
                  minWidth: 0,
                  height: QUICK_ROW_BTN_H,
                  paddingVertical: 7,
                  paddingHorizontal: 8,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: quickRowTheme.btnBorder,
                  backgroundColor: quickRowTheme.btnBg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  position: 'relative',
                }}
              >
                {shortcutsEnabled ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: 6,
                    borderRadius: 7,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    backgroundColor: quickRowTheme.chipBg,
                    borderWidth: 1,
                    borderColor: quickRowTheme.chipBorder,
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: '800', color: quickRowTheme.chipText }}>{`F${index + 1}`}</Text>
                </View>
                ) : null}
                <AppIcon name={item.icon} size={16} color={quickRowTheme.icon} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: quickRowTheme.text, textAlign: 'center', flexShrink: 1 }} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
      <CardPickerModal
        visible={showCardPicker}
        onClose={() => setShowCardPicker(false)}
        visibleIds={sectionOrder}
        onReorder={(order) => setSectionOrder(order)}
        allAvailableIds={ALL_INICIO_IDS}
        addableFromDinheiro={DINHEIRO_ADDABLE_CARDS.filter((id) => !sectionOrder.includes(id))}
        addableCardTypes={DINHEIRO_CARD_TYPES}
        onAddCard={(id) => { playTapSound(); setSectionOrder((prev) => [...prev, id]); }}
        onRemoveCard={(id) => { playTapSound(); setSectionOrder((prev) => prev.filter((x) => x !== id)); }}
        compactButtons={compactButtons}
        onToggleCompact={() => setCompactButtons((v) => !v)}
        onApplyReadyLayout={(lay) => {
          applyInicioLayout(lay?.layout);
          if (!editMode && lay?.layout) {
            commitInicioLayoutToAccount(lay.layout, { updateProfile }).then(() => {
              editBaselineRef.current = cloneInicioLayout(lay.layout);
              setHasSavedLayout(true);
            }).catch(() => {});
          }
        }}
        onSaveLayout={saveCurrentInicioLayout}
        hasSavedLayout={hasSavedLayout}
        onApplySavedLayout={loadSavedInicioLayout}
        onSaveFavorite={saveFavoriteInicioLayout}
        hasFavorite={hasFavoriteLayout}
        onApplyFavorite={loadFavoriteInicioLayout}
      />
      {/* Web desktop: menu na coluna da tab bar (DesktopRailMenuButton). */}
      <Modal visible={!!parabensModalClient} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setParabensModalClient(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Enviar parabéns</Text>
              {parabensModalClient && <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>{parabensModalClient.name}</Text>}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Escolha uma frase ou edite abaixo</Text>
              <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                {FRASES_PARABENS.map((f, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => { playTapSound(); setParabensFrase(f); }}
                    style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 6, backgroundColor: parabensFrase === f ? (colors.primaryRgba?.(0.2) ?? colors.primary + '33') : colors.bg }}
                  >
                    <Text style={{ fontSize: 13, color: colors.text }} numberOfLines={2}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 12, marginBottom: 8 }}>Editar antes de enviar</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: 'top', borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }}
                placeholder="Personalize a mensagem"
                placeholderTextColor={colors.textSecondary}
                value={parabensFrase}
                onChangeText={setParabensFrase}
                multiline
              />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity onPress={() => setParabensModalClient(null)} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.border, alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    playTapSound();
                    if (parabensModalClient?.phone) openWhatsApp(parabensModalClient.phone, parabensFrase || FRASES_PARABENS[0]);
                    setParabensModalClient(null);
                  }}
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#25D366', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                >
                  <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Enviar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
      <CardExpandedModal
        visible={!!expandedCard}
        onClose={() => { playTapSound(); setExpandedCard(null); }}
        accentColor={CARD_ICON_COLORS[expandedCard] || colors.primary}
        headerRight={
          (expandedCard === 'proximos' || expandedCard === 'agendamentos' || expandedCard === 'proximasfaturas') ? (
            <TouchableOpacity
              onPress={() => {
                playTapSound();
                if (expandedCard === 'proximos') openAddModal?.('tarefa', null);
                if (expandedCard === 'agendamentos') openAddModal?.('agenda', null);
                if (expandedCard === 'proximasfaturas') openCadastro?.('boletos');
              }}
              style={{
                width: Platform.OS === 'web' ? 32 : 40,
                height: Platform.OS === 'web' ? 32 : 40,
                borderRadius: Platform.OS === 'web' ? 16 : 20,
                justifyContent: 'center',
                alignItems: 'center',
                ...chromeBtnBox(colors, { ghost: true }),
              }}
            >
              <Ionicons name="add" size={Platform.OS === 'web' ? 18 : 22} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null
        }
        title={
          expandedCard === 'proximos' ? (showConcluidasProximos ? 'Tarefas concluídas' : 'Próximas tarefas') :
          expandedCard === 'agendamentos' ? (showConcluidasAgendamentos ? ((showEmpresaFeatures && viewMode === 'empresa') ? 'Atendimentos concluídos' : 'Eventos concluídos') : ((showEmpresaFeatures && viewMode === 'empresa') ? 'Próximos atendimentos' : 'Próximos eventos')) :
          expandedCard === 'proximasfaturas' ? (showContasPagasProxFaturas ? 'Contas pagas' : 'Próximas faturas') :
          expandedCard === 'anotacoes' ? 'Minhas anotações' :
          expandedCard === 'listacompras' ? (showConcluidasListaCompras ? 'Compras concluídas' : 'Lista de compras') :
          (AVAILABLE_CARD_TYPES.find((c) => c.id === expandedCard)?.label || 'Card')
        }
      >
        {compactButtons && expandedCard && (sectionMap[expandedCard] || sectionMap.leftAgendaCombo) ? (
          <View style={{ minHeight: 420 }}>
            {expandedCard === 'proximos' ? (sectionMap.leftAgendaCombo || sectionMap.proximos) : sectionMap[expandedCard]}
          </View>
        ) : (
        <>
        {expandedCard === 'proximos' && (showConcluidasProximos ? proximasTarefas.concluidas : proximasTarefas.tarefas).map((t) => (
          <GlassCard key={t.id} colors={colors} solid style={{ marginBottom: 8, borderWidth: 1, borderColor: colors.border }} contentStyle={{ padding: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderLeftWidth: 3, borderLeftColor: CARD_ICON_COLORS.proximos + '40', minWidth: 0 }}>
              <View style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>
                <Text style={[{ fontSize: 15, color: colors.text, textDecorationLine: showConcluidasProximos ? 'line-through' : 'none' }, listItemTextClamp]} numberOfLines={1} ellipsizeMode="tail">{t.title}</Text>
                {(t.date || t.timeStart) && <Text style={[{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }, listItemTextClamp]} numberOfLines={1} ellipsizeMode="tail">{[t.date, t.timeStart && t.timeEnd ? `${t.timeStart}-${t.timeEnd}` : null].filter(Boolean).join(' · ')}</Text>}
              </View>
              <View style={listItemActionsStyle}>
              <TouchableOpacity onPress={() => { playTapSound(); setExpandedCard(null); openCadastro?.('tarefas', { editItemId: t.id }); }}><Ionicons name="pencil" size={20} color={colors.textSecondary} /></TouchableOpacity>
              {showConcluidasProximos ? (
                <TouchableOpacity onPress={() => { playTapSound(); updateCheckListItem(t.id, { checked: false }); }}><Ionicons name="arrow-undo" size={20} color={colors.textSecondary} /></TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => { playTapSound(); updateCheckListItem(t.id, { checked: true }); }}><Ionicons name="checkmark-done" size={20} color={colors.textSecondary} /></TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => { playTapSound(); onDeletePress('Excluir', 'Excluir esta tarefa?', deleteCheckListItem, t.id)(); }}><Ionicons name="trash-outline" size={20} color="#ef4444" /></TouchableOpacity>
              </View>
            </View>
          </GlassCard>
        ))}
        {expandedCard === 'agendamentos' && (showConcluidasAgendamentos ? proximasTarefas.agendasConcluidas : proximasTarefas.agendas).map((e) => {
          const info = getAgendaEventCardInfo(e, { client: agendaClientFor(e), service: agendaServiceFor(e) });
          return (
            <GlassCard key={e.id} colors={colors} solid style={{ marginBottom: 8, borderWidth: 1, borderColor: colors.border }} contentStyle={{ padding: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderLeftWidth: 3, borderLeftColor: CARD_ICON_COLORS.agendamentos + '40', minWidth: 0 }}>
                {renderAgendaEventInfo(info)}
                <View style={listItemActionsStyle}>
                <TouchableOpacity onPress={() => { playTapSound(); setExpandedCard(null); openAddModal?.('agenda', { editingEvent: e }); }}><Ionicons name="pencil" size={20} color={colors.textSecondary} /></TouchableOpacity>
                <TouchableOpacity onPress={() => { playTapSound(); promptConcluirAgenda(e, { showEmpresaFeatures, isConcluido: e.status === 'concluido', openAddModal, updateAgendaEvent }); }}><Ionicons name="checkmark-done" size={20} color={colors.textSecondary} /></TouchableOpacity>
                <TouchableOpacity onPress={() => { playTapSound(); onDeletePress('Excluir', 'Quer realmente excluir este evento?', deleteAgendaEvent, e.id)(); }}><Ionicons name="trash-outline" size={20} color="#ef4444" /></TouchableOpacity>
                </View>
              </View>
            </GlassCard>
          );
        })}
        {expandedCard === 'anotacoes' && notes.map((n) => (
          <View key={n.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.card, marginBottom: 8 }}>
            <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{n.title || 'Sem título'}</Text>
            <TouchableOpacity onPress={() => { playTapSound(); setExpandedCard(null); openAnotacoes?.({ editNoteId: n.id }); }}><Ionicons name="pencil" size={20} color={colors.textSecondary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => { playTapSound(); onDeletePress('Excluir', 'Quer excluir esta anotação?', deleteNote, n.id)(); }}><Ionicons name="trash-outline" size={20} color="#ef4444" /></TouchableOpacity>
          </View>
        ))}
        {expandedCard === 'listacompras' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => { playTapSound(); setShowConcluidasListaCompras(!showConcluidasListaCompras); }} style={cardActionButtonStyle}>
                <AppIcon name={showConcluidasListaCompras ? 'list-outline' : 'checkmark-done-outline'} size={CARD_ACTION_ICON_SIZE} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {(() => {
              const base = filtroListaCompras === 'todos' ? shoppingItems : shoppingItems.filter((i) => (i.tipo || 'pessoal') === filtroListaCompras);
              const items = showConcluidasListaCompras ? base.filter((i) => i.checked) : base.filter((i) => !i.checked);
              return items.map((i) => (
                <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.card, marginBottom: 8 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: i.checked ? colors.primary : colors.border, backgroundColor: i.checked ? colors.primary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>{i.checked && <Ionicons name="checkmark" size={12} color="#fff" />}</View>
                  <Text style={{ flex: 1, fontSize: 15, color: colors.text, textDecorationLine: i.checked ? 'line-through' : 'none' }}>{i.title}</Text>
                  <TouchableOpacity onPress={() => { playTapSound(); setExpandedCard(null); openListaCompras?.(); }}>
                    <Ionicons name="pencil" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { playTapSound(); updateShoppingItem(i.id, { checked: !i.checked }); }}>
                    <Ionicons name={i.checked ? 'arrow-undo' : 'checkmark-done'} size={20} color={i.checked ? colors.textSecondary : '#10b981'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      playTapSound();
                      onDeletePress('Excluir', 'Quer excluir este item da lista?', deleteShoppingItem, i.id)();
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ));
            })()}
          </>
        )}
        {expandedCard === 'proximasfaturas' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => { playTapSound(); setShowContasPagasProxFaturas(!showContasPagasProxFaturas); }}
                style={cardActionButtonStyle}
              >
                <AppIcon
                  name={showContasPagasProxFaturas ? 'list-outline' : 'checkmark-done-outline'}
                  size={CARD_ACTION_ICON_SIZE}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {(showContasPagasProxFaturas ? proximasFaturasLists.paid : proximasFaturasLists.unpaid).map((b) => {
              const due = parseBoletoDate(b.dueDate);
              const hojeM = new Date();
              hojeM.setHours(0, 0, 0, 0);
              const vencida = !b.paid && due && due < hojeM;
              const title = (b.name || '').trim() || 'Fatura';
              return (
                <GlassCard key={b.id} colors={colors} solid style={{ marginBottom: 8, borderWidth: 1, borderColor: colors.border }} contentStyle={{ padding: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderLeftWidth: 3, borderLeftColor: `${CARD_ICON_COLORS.proximasfaturas}40` }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 15, color: colors.text }} numberOfLines={1}>{title}</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                        {fmt(Number(b.amount) || 0)} · Venc. {b.dueDate || '—'}
                      </Text>
                      {vencida ? <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: '800', marginTop: 2 }}>Vencida</Text> : null}
                      {b.paid ? <Text style={{ fontSize: 10, color: '#10b981', fontWeight: '700', marginTop: 2 }}>Paga</Text> : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => { playTapSound(); setExpandedCard(null); openCadastro?.('boletos', { editItemId: b.id }); }}
                      style={{ padding: 6 }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="pencil" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {b.paid && showContasPagasProxFaturas ? (
                      <TouchableOpacity
                        onPress={() => { playTapSound(); updateBoleto(b.id, { paid: false }); }}
                        style={{ padding: 6 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="arrow-undo" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                    ) : !b.paid ? (
                      <TouchableOpacity
                        onPress={() => { playTapSound(); updateBoleto(b.id, { paid: true }); }}
                        style={{ padding: 6 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="checkmark-done" size={18} color="#10b981" />
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      onPress={() => {
                        playTapSound();
                        (async () => {
                          const ok = await confirmDestructive('Excluir fatura', 'Excluir este registro?');
                          if (ok) await deleteBoleto(b.id);
                        })();
                      }}
                      style={{ padding: 6 }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              );
            })}
          </>
        )}
        </>
        )}
      </CardExpandedModal>
    </SafeAreaView>
  );
}
