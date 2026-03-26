import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, ScrollView, StyleSheet, Image, ImageBackground, TouchableOpacity, Dimensions, FlatList, LayoutAnimation, UIManager, Platform, Alert, Modal, TextInput, KeyboardAvoidingView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFinance } from '../contexts/FinanceContext';
import { useBanks } from '../contexts/BanksContext';
import { useTheme } from '../contexts/ThemeContext';
import { useMenu } from '../contexts/MenuContext';
import { useProfile } from '../contexts/ProfileContext';
import { usePlan } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotes } from '../contexts/NotesContext';
import { useShoppingList } from '../contexts/ShoppingListContext';
import { useValuesVisibility } from '../contexts/ValuesVisibilityContext';
import { TopBar, getStableHomePrompt } from '../components/TopBar';
import { ViewModeToggle } from '../components/ViewModeToggle';
import { ContasDoMesCard } from '../components/ContasDoMesCard';
import { GlassCard } from '../components/GlassCard';
import { MeusGastosChat } from '../components/MeusGastosChat';
import { DraggableCard } from '../components/DraggableCard';
import { CardPickerModal } from '../components/CardPickerModal';
import { ScrollableCardList } from '../components/ScrollableCardList';
import { CardExpandedModal } from '../components/CardExpandedModal';
import { playTapSound } from '../utils/sounds';
import { openWhatsApp } from '../utils/whatsapp';
import { formatCurrency } from '../utils/format';
import { getQuoteOfDay } from '../utils/quotes';
import { Ionicons } from '@expo/vector-icons';
import { AppIcon } from '../components/AppIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SECTIONS, DEFAULT_SECTIONS_WEB, DINHEIRO_ADDABLE_CARDS, DINHEIRO_CARD_TYPES, ALL_INICIO_IDS, CARD_ICON_COLORS } from '../constants/dashboardCards';
import { getLayoutStorageKey, getDefaultForPlatform, useIsDesktopLayout, scaleWebDesktop } from '../utils/platformLayout';

const logoImage = require('../../assets/logo.png');
const SECTIONS_ORDER_KEY = '@tudocerto_dashboard_order';

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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ds = StyleSheet.create({
  headerLogo: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  pagePromptBanner: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 0,
  },
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
  carouselTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  carouselText: { fontSize: 12, lineHeight: 18 },
  quoteCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, borderWidth: 1 },
  quoteText: { fontSize: 14, fontStyle: 'italic', lineHeight: 22 },
  quoteType: { fontSize: 10, marginTop: 8, letterSpacing: 1 },
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

export function DashboardScreen() {
  const isWeb = Platform.OS === 'web';
  const isDesktopLayout = useIsDesktopLayout();
  const useWebLayout = isWeb && isDesktopLayout;
  // No web desktop, o grid externo controla spacing/width. Evita "dobrar" margens e causar desalinhamento/sobreposição.
  const WEB_CARD_MARGIN_H = useWebLayout ? 0 : 16;
  const WEB_CARD_MARGIN_TOP = useWebLayout ? 0 : 16;
  const WEB_CARD_PADDING = useWebLayout ? scaleWebDesktop(12, useWebLayout) : 20;
  const WEB_HEADER_GAP = useWebLayout ? scaleWebDesktop(5, useWebLayout) : 12;
  const CARD_ACTION_SIZE = useWebLayout ? scaleWebDesktop(32, useWebLayout) : 40;
  const CARD_ACTION_ICON_SIZE = useWebLayout ? scaleWebDesktop(20, useWebLayout) : 24;
  const CARD_EXPAND_ICON_SIZE = useWebLayout ? scaleWebDesktop(18, useWebLayout) : 22;
  // Web desktop: cards compactos (tarefas + agendamentos)
  const TRIO_CARD_HEIGHT = useWebLayout ? scaleWebDesktop(210, useWebLayout) : undefined;
  const HEADER_ICON_BOX_SIZE = useWebLayout ? scaleWebDesktop(40, useWebLayout) : 48;
  const HEADER_ICON_SIZE = useWebLayout ? scaleWebDesktop(22, useWebLayout) : 26;
  const route = useRoute();
  const navigation = useNavigation();
  const { transactions, checkListItems, agendaEvents, boletos, clients, aReceber, updateCheckListItem, deleteCheckListItem, updateAgendaEvent, deleteAgendaEvent, addCheckListItem, deleteTransaction, updateTransaction } = useFinance();
  const { banks, cards, addToBank, deductFromBank, addToCardBalance, deductFromCardBalance, getBankById } = useBanks();
  const { colors, themeMode } = useTheme();
  const { viewMode, setViewMode, canToggleView, showEmpresaFeatures } = usePlan();
  const { isGuest } = useAuth();
  const { openImageGenerator, openAReceber, openAddModal, openCadastro, openAnotacoes, openOrcamento, openAssinatura, openIndique, openManageCards, openCalculadoraFull, openMeusGastos, openListaCompras, openMensagensWhatsApp, openAniversariantes } = useMenu();
  const { notes, deleteNote } = useNotes();
  const { items: shoppingItems, updateItem: updateShoppingItem, deleteItem: deleteShoppingItem } = useShoppingList();
  const { profile } = useProfile();
  const [editMode, setEditMode] = useState(false);
  const [quoteType, setQuoteType] = useState('motivacional');
  const carouselRef = useRef(null);
  const [carouselIndex, setCarouselIndex] = useState(0); // display index 0..count-1
  // Web desktop: mede altura real do card "Agenda" para manter simetria no grid.
  const [webAgendaCardHeight, setWebAgendaCardHeight] = useState(0);
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
  const [sectionOrder, setSectionOrder] = useState(defaultSections);
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
  const [parabensModalClient, setParabensModalClient] = useState(null);
  const [parabensFrase, setParabensFrase] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  const [agendaCardDate, setAgendaCardDate] = useState(() => new Date());
  // Web desktop: zoom padrão menor para ver mais horas no card
  const [agendaCardZoom, setAgendaCardZoom] = useState(0.85);
  const [agendaCardShowMonthPicker, setAgendaCardShowMonthPicker] = useState(false);
  const [agendaCardPickerYear, setAgendaCardPickerYear] = useState(() => new Date().getFullYear());
  const [agendaCardPickerMonth, setAgendaCardPickerMonth] = useState(() => new Date().getMonth());
  const layoutsRef = useRef({});
  const [floatingId, setFloatingId] = useState(null);
  const now = new Date();
  const quote = getQuoteOfDay(quoteType);


  useEffect(() => {
    AsyncStorage.getItem(sectionsStorageKey).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const allowedSections = new Set(ALL_INICIO_IDS);
          let filtered = Array.isArray(parsed)
            ? parsed
                .filter((id) => id !== 'agenda' && allowedSections.has(id === 'tarefas' ? 'proximos' : id))
                .map((id) => (id === 'tarefas' ? 'proximos' : id))
            : defaultSections;
          filtered = [...new Set(filtered)];
          const base = filtered.length > 0 ? filtered : defaultSections;
          const missing = defaultSections.filter((id) => !base.includes(id));
          setSectionOrder([...base, ...missing]);
        } catch (_) {}
      } else {
        setSectionOrder(defaultSections);
      }
    });
  }, [sectionsStorageKey, defaultSections]);
  useEffect(() => {
    if (route.params?.openCardPicker) {
      setShowCardPicker(true);
      navigation?.setParams?.({ openCardPicker: undefined });
    }
  }, [route.params?.openCardPicker, navigation]);
  useEffect(() => {
    const toSave = sectionOrder.filter((id) => id !== 'agenda' && id !== 'tarefas');
    AsyncStorage.setItem(sectionsStorageKey, JSON.stringify(toSave.length > 0 ? toSave : defaultSections));
  }, [sectionOrder, sectionsStorageKey, defaultSections]);

  const filteredTx = useMemo(() => {
    if (!canToggleView) return transactions;
    return transactions.filter((t) => (t.tipoVenda || 'pessoal') === viewMode);
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

  const isSameDay = useCallback((a, b) => {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }, []);

  const agendaCardWeek = useMemo(() => {
    const base = new Date(agendaCardDate);
    base.setHours(0, 0, 0, 0);
    const day = base.getDay(); // 0..6 (dom..sab)
    const mon = new Date(base);
    // semana começando na segunda (Seg=1)
    const diffToMon = (day === 0 ? -6 : 1 - day);
    mon.setDate(base.getDate() + diffToMon);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
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

  const agendaMonthCounts = useMemo(() => {
    const y = agendaCardDate.getFullYear();
    const m = agendaCardDate.getMonth();
    const counts = {};
    (agendaEvents || []).forEach((e) => {
      const key = String(e?.date || '').trim();
      if (!key) return;
      const parts = key.split(/[\/\-]/).map((x) => parseInt(x, 10));
      if (parts.length < 3) return;
      const [dd, mm, yyyy] = parts;
      if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return;
      if (yyyy !== y || (mm - 1) !== m) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [agendaEvents, agendaCardDate]);

  const handleAgendaCardCalendarDaySelect = useCallback((d) => {
    playTapSound();
    setAgendaCardDate(new Date(d));
    setAgendaCardShowMonthPicker(false);
  }, []);

  const agendaCardEvents = useMemo(() => {
    const targetKey = formatBrShort(agendaCardDate);
    const list = (agendaEvents || []).filter((e) => String(e?.date || '').trim() === targetKey);
    const toMinutes = (t) => {
      if (!t) return 0;
      const [h, m] = String(t).split(':').map((x) => parseInt(x, 10));
      return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
    };
    return list.sort((a, b) => toMinutes(a.timeStart) - toMinutes(b.timeStart));
  }, [agendaEvents, agendaCardDate, formatBrShort]);

  const agendaCardTimeline = useMemo(() => {
    const toMinutes = (t) => {
      if (!t) return 0;
      const [h, m] = String(t).split(':').map((x) => parseInt(x, 10));
      return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
    };
    const clamp = (n, a, b) => Math.max(a, Math.min(n, b));
    return (agendaCardEvents || []).map((e) => {
      const startM = clamp(toMinutes(e.timeStart), 0, 24 * 60);
      const endRaw = e.timeEnd ? toMinutes(e.timeEnd) : (startM + 60);
      const endM = clamp(Math.max(endRaw, startM + 15), 0, 24 * 60); // mínimo 15 min
      return { e, startM, endM, durM: endM - startM };
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

  const [faturasFiltroTipo, setFaturasFiltroTipo] = useState('todos'); // 'todos' | 'pessoal' | 'empresa'

  const contasStatus = useMemo(() => {
    const ref = balanceFilterDate;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let pagas = { qty: 0, valor: 0 };
    let aVencer = { qty: 0, valor: 0 };
    let vencidas = { qty: 0, valor: 0 };
    let list = showEmpresaFeatures ? (boletos || []) : (boletos || []);
    // filtro de tipo de fatura: todos, pessoal, empresa
    list = list.filter((b) => {
      const tipo = (b.tipo || 'pessoal');
      if (faturasFiltroTipo === 'todos') return true;
      return tipo === faturasFiltroTipo;
    });
    list = list.filter((b) => {
      const d = parseBoletoDate(b.dueDate);
      if (!d) return false;
      if (balanceFilter === 'periodo') {
        const start = parseDateStr(periodStart);
        const end = parseDateStr(periodEnd);
        if (!start || !end) return true;
        d.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
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
    list.forEach((b) => {
      const d = parseBoletoDate(b.dueDate);
      const amt = Number(b.amount) || 0;
      if (b.paid) {
        pagas.qty++;
        pagas.valor += amt;
      } else if (d) {
        if (d >= hoje) {
          aVencer.qty++;
          aVencer.valor += amt;
        } else {
          vencidas.qty++;
          vencidas.valor += amt;
        }
      }
    });
    return { pagas, aVencer, vencidas };
  }, [boletos, showEmpresaFeatures, balanceFilter, balanceFilterDate, periodStart, periodEnd, parseDateStr, faturasFiltroTipo]);

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
      { id: '1', title: 'Gerencie suas finanças', text: 'Receitas, despesas e controle total em um só lugar.', icon: 'wallet-outline', color: '#10b981', onPress: 'dinheiro', image: CAROUSEL_IMAGES.financas },
      { id: '2', title: 'Limite seu orçamento', text: 'Mantenha sua vida organizada.', icon: 'cash-outline', color: '#dc2626', onPress: 'orcamento', image: CAROUSEL_IMAGES.orcamento },
      ...(isEmpresa ? [{ id: 'whatsapp', title: 'Envie mensagem para seus clientes', text: 'Use o WhatsApp para conversar, enviar lembretes e templates aos seus clientes.', icon: 'logo-whatsapp', color: '#25D366', onPress: 'whatsapp', image: CAROUSEL_IMAGES.whatsapp }] : []),
      { id: '3', title: 'Faça upgrade do seu plano', text: 'Plano Empresa: CRM, produtos compostos e muito mais.', icon: 'rocket-outline', color: '#8b5cf6', onPress: 'assinatura', image: CAROUSEL_IMAGES.upgrade },
      { id: '4', title: 'Indique um amigo e ganhe', text: 'Convide amigos e ganhe benefícios exclusivos.', icon: 'people-outline', color: '#f59e0b', onPress: 'indique', image: CAROUSEL_IMAGES.indique },
      { id: '5', title: 'Agenda', text: 'Agende seus clientes e eventos.', icon: 'calendar-outline', color: '#06b6d4', onPress: 'agenda', image: CAROUSEL_IMAGES.agenda },
      { id: '6', title: 'Cards personalizáveis', text: 'Toque no ícone de grade ao lado para gerenciar os cards do Início.', icon: 'grid-outline', color: '#ec4899', onPress: 'cards', image: CAROUSEL_IMAGES.cards },
    ];
    return base;
  }, [viewMode, showEmpresaFeatures]);

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

  const webSectionOrder = useMemo(() => {
    if (!useWebLayout) return sectionOrder;
    const first = ['carousel', 'quote'];
    const rest = sectionOrder.filter((id) => !first.includes(id));
    return [...first.filter((id) => sectionOrder.includes(id)), ...rest];
  }, [useWebLayout, sectionOrder]);
  const [webProductivityTab, setWebProductivityTab] = useState('anotacoes');
  const webSectionTail = useMemo(() => {
    if (!useWebLayout) return [];
    const tail = webSectionOrder.slice(2);
    const hasAnotacoes = tail.includes('anotacoes');
    const hasCompras = tail.includes('listacompras');
    if (!hasAnotacoes || !hasCompras) return tail;
    const firstIdx = Math.min(tail.indexOf('anotacoes'), tail.indexOf('listacompras'));
    const filtered = tail.filter((id) => id !== 'anotacoes' && id !== 'listacompras');
    filtered.splice(firstIdx, 0, 'produtividade');
    return filtered;
  }, [useWebLayout, webSectionOrder]);

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
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const pendentes = checkListItems
      .filter((t) => !t.checked)
      .sort((a, b) => {
        const oa = a.sortOrder ?? 999;
        const ob = b.sortOrder ?? 999;
        if (oa !== ob) return oa - ob;
        const da = parseTaskDate(a.date) || new Date(0);
        const db = parseTaskDate(b.date) || new Date(0);
        if (da.getTime() !== db.getTime()) return da - db;
        return prOrd(b.priority) - prOrd(a.priority);
      });
    const concluidas = checkListItems.filter((t) => t.checked).sort((a, b) => {
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
  const cardActionButtonStyle = {
    width: CARD_ACTION_SIZE,
    height: CARD_ACTION_SIZE,
    borderRadius: CARD_ACTION_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary + '26',
    borderWidth: 1,
    borderColor: colors.primary + '50',
  };
  const cardHeaderActionsStyle = { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: useWebLayout ? 2 : 0 };

  const taskCardBase = (icon, _iconColor, title, subtitle, items, renderItem, emptyText, extraHeaderContent, onVerMais, headerRightActions, extraFooterContent) => (
    <TouchableOpacity
      key={title}
      onPress={() => navigation?.navigate?.('Agenda')}
      activeOpacity={0.9}
      // No web desktop o layout (grid/colunas) já controla espaçamento.
      // Margens externas aqui fazem o card "vazar" do container com altura fixa e parecer cortado.
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
        contentStyle={{ padding: WEB_CARD_PADDING }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: WEB_HEADER_GAP, marginBottom: useWebLayout ? 10 : 16 }}>
          <View style={{ width: HEADER_ICON_BOX_SIZE, height: HEADER_ICON_BOX_SIZE, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
            <AppIcon name={icon} size={HEADER_ICON_SIZE} color={cardIconColor} />
          </View>
          <View style={{ flex: 1 }}>
              <Text style={{ fontSize: useWebLayout ? 14 : 16, fontWeight: '700', color: colors.text }}>{title}</Text>
            <Text style={{ fontSize: useWebLayout ? 11 : 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>{subtitle}</Text>
          </View>
          {headerRightActions ?? <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.primary} />}
        </View>
        {extraHeaderContent}
        <View style={{ flex: 1, minHeight: 0 }}>
          <ScrollableCardList
            items={items}
            colors={colors}
            emptyText={emptyText}
            onVerMais={onVerMais}
            fixedVisibleHeight={useWebLayout ? 'fill' : false}
            renderItem={(item) => renderItem(item)}
          />
        </View>
        {extraFooterContent ? <View style={{ flexShrink: 0 }}>{extraFooterContent}</View> : null}
      </GlassCard>
    </TouchableOpacity>
  );

  const sectionMap = {
    proximos: (
      <TouchableOpacity
        key="proximos"
        onPress={() => navigation?.navigate?.('Agenda')}
        activeOpacity={0.9}
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
          contentStyle={{ padding: WEB_CARD_PADDING }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: WEB_HEADER_GAP, marginBottom: useWebLayout ? 10 : 12 }}>
            <View style={{ width: HEADER_ICON_BOX_SIZE, height: HEADER_ICON_BOX_SIZE, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
              <AppIcon name="checkmark-done-outline" size={HEADER_ICON_SIZE} color={cardIconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: useWebLayout ? 14 : 16, fontWeight: '700', color: colors.text }}>
                {showConcluidasProximos ? 'Tarefas concluídas' : 'Próximas tarefas'}
              </Text>
              <Text style={{ fontSize: useWebLayout ? 11 : 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>
                {showConcluidasProximos
                  ? (proximasTarefas.concluidas.length === 0 ? 'Nenhuma' : `${proximasTarefas.concluidas.length} concluída${proximasTarefas.concluidas.length !== 1 ? 's' : ''}`)
                  : (proximasTarefas.tarefas.length === 0 ? 'Nada pendente' : `${proximasTarefas.tarefas.length} pendente${proximasTarefas.tarefas.length !== 1 ? 's' : ''}`)}
              </Text>
            </View>
            <View style={cardHeaderActionsStyle}>
              <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAddModal?.('tarefa', null); }} style={cardActionButtonStyle}>
                <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setExpandedCard('proximos'); }} style={cardActionButtonStyle}>
                <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ flex: 1, minHeight: 0 }}>
            <ScrollableCardList
              items={showConcluidasProximos ? proximasTarefas.concluidas : proximasTarefas.tarefas}
              colors={colors}
              accentColor={colors.primary}
              emptyText={showConcluidasProximos ? 'Nenhuma tarefa concluída' : 'Nenhuma tarefa pendente'}
              onVerMais={() => { playTapSound(); setExpandedCard('proximos'); }}
              fixedVisibleHeight={useWebLayout ? 'fill' : false}
              renderItem={(t) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 22, borderLeftWidth: 3, borderLeftColor: CARD_ICON_COLORS.proximos + '40', marginLeft: 4 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15, color: colors.text, textDecorationLine: showConcluidasProximos ? 'line-through' : 'none' }} numberOfLines={1}>{t.title}</Text>
                  {(t.date || t.timeStart) && (
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                      {[t.date, t.timeStart && t.timeEnd ? `${t.timeStart}-${t.timeEnd}` : null].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openCadastro?.('tarefas', { editItemId: t.id }); }} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="pencil" size={22} color={colors.primary} />
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
                  e?.stopPropagation?.();
                  playTapSound();
                  Alert.alert('Excluir', 'Quer realmente excluir esta tarefa?', [
                    { text: 'Cancelar' },
                    { text: 'Excluir', style: 'destructive', onPress: () => deleteCheckListItem(t.id) },
                  ]);
                }} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={22} color="#ef4444" />
                </TouchableOpacity>
              </View>
              )}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setShowConcluidasProximos(!showConcluidasProximos); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.primary + '26', borderWidth: 1, borderColor: colors.primary + '50' }}>
              <AppIcon name={showConcluidasProximos ? 'list-outline' : 'checkmark-done-outline'} size={16} color={colors.primary} />
              <Text style={{ fontSize: 12, color: colors.primary || colors.primary, fontWeight: '600' }}>{showConcluidasProximos ? 'Ver pendentes' : 'Ver concluídas'}</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </TouchableOpacity>
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
        const displayTitle = ((e.tipo === 'empresa' && e.clientId) ? (clients?.find((c) => c.id === e.clientId)?.name) : null) || (e.title || '').replace(/^Pré-pedido\s*[-–]\s*/i, '').trim() || 'Evento';
        const detailParts = [];
        if (e.amount > 0) detailParts.push(formatCurrency(e.amount));
        if (e.type === 'venda') detailParts.push('Venda');
        else if (e.type === 'orcamento') detailParts.push('Orçamento');
        else if (e.type === 'manutencao') detailParts.push('Garantia');
        const detailStr = detailParts.length ? detailParts.join(' · ') : null;
        return (
        <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 26, borderLeftWidth: 3, borderLeftColor: CARD_ICON_COLORS.agendamentos + '40', marginLeft: 4, marginBottom: 4 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 15, color: colors.text }} numberOfLines={1}>{displayTitle}</Text>
            {detailStr && <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{detailStr}</Text>}
          </View>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{e.date}</Text>
          <TouchableOpacity onPress={(ev) => { ev?.stopPropagation?.(); playTapSound(); openAddModal?.('agenda', { editingEvent: e }); }} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="pencil" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={(ev) => {
              ev?.stopPropagation?.();
              playTapSound();
              const isEmpresaEvent = showEmpresaFeatures && (e.tipo === 'empresa');
              if (isEmpresaEvent && e.status !== 'concluido') {
                openAddModal?.('receita', { fromAgendaEvent: e });
              } else {
                updateAgendaEvent(e.id, { status: (e.status === 'concluido' ? 'pendente' : 'concluido') });
              }
            }}
            style={{ padding: 8 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="checkmark-done" size={22} color="#10b981" />
          </TouchableOpacity>
          <TouchableOpacity onPress={(ev) => {
            ev?.stopPropagation?.();
            playTapSound();
            Alert.alert('Excluir', 'Quer realmente excluir este evento?', [
              { text: 'Cancelar' },
              { text: 'Excluir', style: 'destructive', onPress: () => deleteAgendaEvent(e.id) },
            ]);
          }} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
        );
      },
      showConcluidasAgendamentos ? ((showEmpresaFeatures && viewMode === 'empresa') ? 'Nenhum atendimento concluído' : 'Nenhum evento concluído') : ((showEmpresaFeatures && viewMode === 'empresa') ? 'Nenhum atendimento agendado' : 'Nenhum evento agendado'),
      null,
      () => { playTapSound(); setExpandedCard('agendamentos'); },
      (
        <View style={cardHeaderActionsStyle}>
          <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAddModal?.('agenda', null); }} style={cardActionButtonStyle}>
            <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.primary || colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setExpandedCard('agendamentos'); }} style={cardActionButtonStyle}>
            <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.primary || colors.primary} />
          </TouchableOpacity>
        </View>
      ),
      (
        <View key="agendamentos-actions" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
          <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setShowConcluidasAgendamentos(!showConcluidasAgendamentos); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.primary + '26', borderWidth: 1, borderColor: colors.primary + '50' }}>
            <AppIcon name={showConcluidasAgendamentos ? 'calendar-outline' : 'checkmark-done-outline'} size={16} color={colors.primary || colors.primary} />
            <Text style={{ fontSize: 12, color: colors.primary || colors.primary, fontWeight: '600' }}>{showConcluidasAgendamentos ? 'Ver pendentes' : 'Ver concluídas'}</Text>
          </TouchableOpacity>
        </View>
      )
    ),
    agenda: !useWebLayout ? null : (
      <View
        key="agenda"
        style={{ marginHorizontal: 0, marginTop: 0 }}
        onLayout={(e) => {
          // Medimos aqui porque o componente GlassCard pode não repassar onLayout no RN-web.
          const h = e?.nativeEvent?.layout?.height;
          if (typeof h === 'number' && h > 0) setWebAgendaCardHeight(h);
        }}
      >
        <GlassCard
          colors={colors}
          solid
          style={[ds.card, { padding: WEB_CARD_PADDING }]}
          contentStyle={{ padding: WEB_CARD_PADDING }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: WEB_HEADER_GAP, marginBottom: 10 }}>
            <View style={{ width: HEADER_ICON_BOX_SIZE, height: HEADER_ICON_BOX_SIZE, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
              <AppIcon name="calendar-outline" size={HEADER_ICON_SIZE} color={CARD_ICON_COLORS.agenda || colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: useWebLayout ? 14 : 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>Agenda</Text>
              <Text style={{ fontSize: useWebLayout ? 11 : 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }} numberOfLines={1}>
                {formatBrShort(agendaCardDate)}
              </Text>
            </View>
            <View style={cardHeaderActionsStyle}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.primaryRgba(0.18), borderWidth: 1, borderColor: colors.primary + '55' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>
                  {agendaCardEvents.length} agend.
                </Text>
              </View>
              <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setAgendaCardDate(new Date()); }} style={cardActionButtonStyle}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Hoje</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAddModal?.('agenda', { initialDate: formatBrShort(agendaCardDate) }); }} style={cardActionButtonStyle}>
                <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); navigation?.navigate?.('Agenda'); }} style={cardActionButtonStyle}>
                <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => { playTapSound(); setAgendaCardShowMonthPicker(true); }}
            activeOpacity={0.85}
            style={{ alignSelf: 'center', marginBottom: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border + '80', backgroundColor: colors.card }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }} numberOfLines={1}>{agendaMonthLabel}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ paddingRight: 6 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {agendaMonthDays.map((d) => {
                const selected = isSameDay(d, agendaCardDate);
                const dayLabel = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][d.getDay()];
                const num = d.getDate();
                const dayKey = formatBrShort(d);
                const count = agendaMonthCounts[dayKey] || 0;
                const hasAgenda = count > 0;
                return (
                  <TouchableOpacity
                    key={d.toISOString()}
                    onPress={() => { playTapSound(); setAgendaCardDate(d); }}
                    style={{
                      width: 48,
                      paddingVertical: 8,
                      borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor: selected ? (colors.primary + '26') : (colors.card),
                      borderWidth: 1,
                      borderColor: selected ? (colors.primary + '80') : (colors.border + '80'),
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: selected ? colors.primary : colors.textSecondary }}>{dayLabel}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{num}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '800', marginTop: 2, color: selected ? (hasAgenda ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.75)') : (hasAgenda ? colors.primary : colors.textSecondary) }}>
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

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
                            borderRadius: 18,
                            opacity: cell.empty ? 0.25 : isCurMonth ? 1 : 0.5,
                            backgroundColor: sel ? colors.primary : 'transparent',
                            borderWidth: isTodayCell ? 2 : 0,
                            borderColor: isTodayCell ? (sel ? '#fff' : colors.primary) : 'transparent',
                          }}
                          activeOpacity={0.75}
                          onPress={() => !cell.empty && handleAgendaCardCalendarDaySelect(cell.date)}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '700', color: sel ? '#fff' : colors.text }}>
                            {cell.date.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}

                <TouchableOpacity
                  onPress={() => { playTapSound(); setAgendaCardShowMonthPicker(false); }}
                  style={{ marginTop: 12, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: colors.primaryRgba(0.12), borderWidth: 1, borderColor: colors.primary + '55' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>Fechar</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          </Modal>

          {(() => {
            // Compacto no web desktop: horas menores para ver mais do dia
            const HOUR_HEIGHT_CARD = (useWebLayout ? 44 : 56) * agendaCardZoom;
            const MINUTES_PER_HOUR = 60;
            const timelineHeight = 24 * HOUR_HEIGHT_CARD;
            const accent = CARD_ICON_COLORS.agenda || colors.primary;
            const nowObj = new Date();
            const showNowLine = isSameDay(nowObj, agendaCardDate);
            const nowMinutes = nowObj.getHours() * 60 + nowObj.getMinutes();
            const nowTop = (nowMinutes / MINUTES_PER_HOUR) * HOUR_HEIGHT_CARD;
            return (
              <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border + '80', overflow: 'hidden', backgroundColor: colors.bg }}>
                <View style={{ padding: 12 }}>
                  {/* Agenda (timeline) */}
                  <View style={{ position: 'relative' }}>
                  <ScrollView
                    // Deixa a timeline flexível; o grid controla a altura externa do card.
                    style={{ height: useWebLayout ? 240 : 380 }}
                    contentContainerStyle={{ paddingRight: 6 }}
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

                          {agendaCardTimeline.map(({ e, startM, durM }) => {
                            const title = ((e.tipo === 'empresa' && e.clientId) ? (clients?.find((c) => c.id === e.clientId)?.name) : null) || (e.title || '').replace(/^Pré-pedido\s*[-–]\s*/i, '').trim() || 'Evento';
                            const top = (startM / MINUTES_PER_HOUR) * HOUR_HEIGHT_CARD;
                            const height = Math.max(28, (durM / MINUTES_PER_HOUR) * HOUR_HEIGHT_CARD);
                            const isEmp = showEmpresaFeatures && (e.tipo === 'empresa');
                            const timeStr = [e.timeStart, e.timeEnd ? `- ${e.timeEnd}` : null].filter(Boolean).join(' ');
                            return (
                              <TouchableOpacity
                                key={e.id}
                                activeOpacity={0.9}
                                onPress={() => { playTapSound(); openAddModal?.('agenda', { editingEvent: e }); }}
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  right: 0,
                                  top,
                                  height,
                                  padding: 10,
                                  borderRadius: 14,
                                  backgroundColor: accent + '1F',
                                  borderWidth: 1,
                                  borderColor: accent + '66',
                                  overflow: 'hidden',
                                }}
                              >
                                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                                  {title}
                                </Text>
                                <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                                  {[timeStr, e.amount > 0 ? formatCurrency(e.amount) : null, e.status === 'concluido' ? 'Concluído' : null].filter(Boolean).join(' · ')}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                  <TouchableOpacity onPress={(ev) => { ev?.stopPropagation?.(); playTapSound(); openAddModal?.('agenda', { editingEvent: e }); }} style={{ padding: 6 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Ionicons name="pencil" size={18} color={colors.primary} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={(ev) => {
                                      ev?.stopPropagation?.();
                                      playTapSound();
                                      if (isEmp && e.status !== 'concluido') openAddModal?.('receita', { fromAgendaEvent: e });
                                      else updateAgendaEvent(e.id, { status: (e.status === 'concluido' ? 'pendente' : 'concluido') });
                                    }}
                                    style={{ padding: 6 }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  >
                                    <Ionicons name="checkmark-done" size={18} color="#10b981" />
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={(ev) => {
                                    ev?.stopPropagation?.();
                                    playTapSound();
                                    Alert.alert('Excluir', 'Quer realmente excluir este evento?', [
                                      { text: 'Cancelar' },
                                      { text: 'Excluir', style: 'destructive', onPress: () => deleteAgendaEvent(e.id) },
                                    ]);
                                  }} style={{ padding: 6 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                  </TouchableOpacity>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  </ScrollView>
                  {/* zoom dentro da timeline */}
                  <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', gap: 8 }} pointerEvents="box-none">
                    <TouchableOpacity
                      onPress={() => { playTapSound(); setAgendaCardZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2)))); }}
                      style={[cardActionButtonStyle, { backgroundColor: colors.card, borderColor: colors.border + '80' }]}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="remove" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { playTapSound(); setAgendaCardZoom((z) => Math.min(2.0, Number((z + 0.1).toFixed(2)))); }}
                      style={[cardActionButtonStyle, { backgroundColor: colors.card, borderColor: colors.border + '80' }]}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="add" size={18} color={colors.primary} />
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
          (useWebLayout || isWebMobile) && { width: '100%', alignItems: 'center' },
        ]}
      >
        {(useWebLayout || isWebMobile) ? (
          (() => {
            const item = carouselItems[Math.max(0, Math.min(carouselIndex, Math.max(0, carouselItems.length - 1)))] || carouselItems[0];
            if (!item) return null;
            return (
              <View style={{ width: '100%', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => handleCarouselPress(item)} activeOpacity={0.9} style={{ alignSelf: 'center' }}>
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
                    <View style={{ position: 'absolute', top: 20, left: 20, width: 48, height: 48, borderRadius: 24, backgroundColor: (item.color || colors.primary) + 'E6', justifyContent: 'center', alignItems: 'center', zIndex: 2 }}>
                      <AppIcon name={item.icon} size={24} color="#fff" />
                    </View>
                    <LinearGradient colors={['transparent', 'transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.75)']} locations={[0, 0.4, 0.75, 1]} style={{ flex: 1, width: '100%', height: '100%', borderRadius: 20, padding: 20, justifyContent: 'flex-end', overflow: 'visible' }}>
                      <Text style={[ds.carouselTitle, { color: '#fff' }]}>{item.title}</Text>
                      <Text style={[ds.carouselText, { color: '#fff' }]}>{item.text}</Text>
                    </LinearGradient>
                    <View style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                    <View style={{ position: 'absolute', bottom: -30, left: -30, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                  </ImageBackground>
                </TouchableOpacity>

                {/* setas/bordas clicáveis */}
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
                  <View style={{ position: 'absolute', top: 20, left: 20, width: 48, height: 48, borderRadius: 24, backgroundColor: (item.color || colors.primary) + 'E6', justifyContent: 'center', alignItems: 'center', zIndex: 2 }}>
                    <AppIcon name={item.icon} size={24} color="#fff" />
                  </View>
                  <LinearGradient colors={['transparent', 'transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.75)']} locations={[0, 0.4, 0.75, 1]} style={{ flex: 1, width: '100%', height: '100%', borderRadius: 20, padding: 20, justifyContent: 'flex-end', overflow: 'visible' }}>
                    <Text style={[ds.carouselTitle, { color: '#fff' }]}>{item.title}</Text>
                    <Text style={[ds.carouselText, { color: '#fff' }]}>{item.text}</Text>
                  </LinearGradient>
                  <View style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                  <View style={{ position: 'absolute', bottom: -30, left: -30, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                </ImageBackground>
              );
              return item.onPress ? (
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
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12 }}>
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
      </View>
    ),
    quote: (
      <TouchableOpacity key="quote" onPress={() => openImageGenerator?.({ quote, quoteType })} activeOpacity={0.8} style={{ marginHorizontal: WEB_CARD_MARGIN_H, marginTop: WEB_CARD_MARGIN_TOP }}>
        <GlassCard
          colors={colors}
          solid
          style={[ds.card, { padding: useWebLayout ? 10 : WEB_CARD_PADDING, minHeight: useWebLayout ? 130 : undefined }]}
          contentStyle={{ padding: useWebLayout ? 10 : WEB_CARD_PADDING }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: WEB_HEADER_GAP, marginBottom: useWebLayout ? 10 : 12 }}>
            <View style={{ width: HEADER_ICON_BOX_SIZE, height: HEADER_ICON_BOX_SIZE, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
              <AppIcon name={quoteType === 'motivacional' ? 'chatbubble-outline' : 'book-outline'} size={HEADER_ICON_SIZE} color={cardIconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: useWebLayout ? 14 : 16, fontWeight: '700', color: colors.text }}>
                {quoteType === 'motivacional' ? 'Frase do dia' : 'Versículo do dia'}
              </Text>
              <Text style={{ fontSize: useWebLayout ? 11 : 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>
                {quoteType === 'motivacional' ? 'Citação motivacional' : 'Palavra de sabedoria'}
              </Text>
            </View>
            <View style={cardHeaderActionsStyle}>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); playTapSound(); setQuoteType(quoteType === 'motivacional' ? 'verso' : 'motivacional'); }}
                style={[cardActionButtonStyle, { width: useWebLayout ? 40 : CARD_ACTION_SIZE, borderRadius: useWebLayout ? 20 : CARD_ACTION_SIZE / 2 }]}
              >
                <Ionicons name={quoteType === 'motivacional' ? 'book-outline' : 'chatbubble-outline'} size={CARD_EXPAND_ICON_SIZE} color={colors.primary || colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); playTapSound(); openImageGenerator?.({ quote, quoteType }); }}
                style={cardActionButtonStyle}
              >
                <Ionicons name="share-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.primary || colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[ds.quoteText, { color: colors.text, fontSize: useWebLayout ? 14 : ds.quoteText.fontSize }]} numberOfLines={useWebLayout ? 2 : 3}>"{quote}"</Text>
        </GlassCard>
      </TouchableOpacity>
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
        <View key="aniversariantes" style={{ marginHorizontal: WEB_CARD_MARGIN_H, marginTop: WEB_CARD_MARGIN_TOP }}>
          <GlassCard colors={colors} solid style={[ds.card, { padding: WEB_CARD_PADDING, minHeight: TRIO_CARD_HEIGHT }]} contentStyle={{ padding: WEB_CARD_PADDING }}>
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
                  <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAniversariantes?.(); }} style={cardActionButtonStyle}>
                  <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollableCardList
              items={aniversariantesSemana}
              colors={colors}
              accentColor={colors.primary}
              emptyText="Mande uma mensagem de parabéns pelo WhatsApp"
              onVerMais={() => { playTapSound(); openAniversariantes?.(); }}
              fixedVisibleHeight={useWebLayout}
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
                        <Ionicons name="logo-whatsapp" size={22} color={colors.primary} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              }}
            />
          </GlassCard>
        </View>
      );
    })(),
    meusgastos: (
      <View key="meusgastos" style={{ marginHorizontal: WEB_CARD_MARGIN_H, marginTop: WEB_CARD_MARGIN_TOP }}>
        <GlassCard colors={colors} solid style={[ds.card, { overflow: 'hidden' }]} contentStyle={{ padding: 0 }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                <AppIcon name="chatbubbles-outline" size={26} color={cardIconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Meus gastos</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>Conversa por texto, voz e foto da notinha</Text>
              </View>
              <View style={cardHeaderActionsStyle}>
                <TouchableOpacity
                  onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openMeusGastos?.(); }}
                  style={cardActionButtonStyle}
                  activeOpacity={0.9}
                >
                  <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.primary || colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={{ height: 330, marginTop: 6 }}>
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
        style={{ marginHorizontal: WEB_CARD_MARGIN_H, marginTop: WEB_CARD_MARGIN_TOP }}
      >
        <GlassCard colors={colors} solid style={[ds.card, { padding: WEB_CARD_PADDING }]} contentStyle={{ padding: WEB_CARD_PADDING }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
              <AppIcon name="document-text-outline" size={26} color={cardIconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Minhas anotações</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>
                {notes.length === 0 ? 'Suas notas e lembretes' : `${notes.length} anotação${notes.length !== 1 ? 'ões' : ''}`}
              </Text>
            </View>
            <View style={cardHeaderActionsStyle}>
              <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAnotacoes?.({ create: true }); }} style={cardActionButtonStyle}>
                <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.primary || colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAnotacoes?.(); }} style={cardActionButtonStyle}>
                <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.primary || colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollableCardList
            items={notes}
            colors={colors}
            accentColor={colors.primary}
            emptyText="Nenhuma anotação ainda"
            onVerMais={() => { playTapSound(); setExpandedCard('anotacoes'); }}
            renderItem={(n) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 22, borderLeftWidth: 3, borderLeftColor: CARD_ICON_COLORS.anotacoes + '40', marginLeft: 4 }}>
                <Text style={{ fontSize: 15, color: colors.text, flex: 1 }} numberOfLines={1}>{n.title || 'Sem título'}</Text>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAnotacoes?.({ editNoteId: n.id }); }} style={{ padding: 6 }}>
                  <Ionicons name="pencil" size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    playTapSound();
                    Alert.alert('Excluir', 'Quer excluir esta anotação?', [
                      { text: 'Cancelar' },
                      { text: 'Excluir', style: 'destructive', onPress: () => deleteNote(n.id) },
                    ]);
                  }}
                  style={{ padding: 6 }}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
          />
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
          style={{ marginHorizontal: WEB_CARD_MARGIN_H, marginTop: WEB_CARD_MARGIN_TOP }}
        >
          <GlassCard colors={colors} solid style={[ds.card, { padding: WEB_CARD_PADDING }]} contentStyle={{ padding: WEB_CARD_PADDING }}>
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
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openListaCompras?.(); }} style={cardActionButtonStyle}>
                  <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.primary || colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openListaCompras?.(); }} style={cardActionButtonStyle}>
                  <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.primary || colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ width: '100%', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' }}>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setFiltroListaCompras('todos'); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, backgroundColor: filtroListaCompras === 'todos' ? colors.primary + '30' : colors.primaryRgba?.(0.08) ?? colors.primary + '15', borderWidth: 1, borderColor: filtroListaCompras === 'todos' ? colors.primary : colors.border }}>
                  <Ionicons name="list" size={14} color={filtroListaCompras === 'todos' ? colors.primary : colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: filtroListaCompras === 'todos' ? colors.primary : colors.textSecondary, fontWeight: '600' }}>Todos</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setFiltroListaCompras('pessoal'); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, backgroundColor: filtroListaCompras === 'pessoal' ? colors.primary + '30' : colors.primaryRgba?.(0.08) ?? colors.primary + '15', borderWidth: 1, borderColor: filtroListaCompras === 'pessoal' ? colors.primary : colors.border }}>
                  <Ionicons name="person-outline" size={14} color={filtroListaCompras === 'pessoal' ? colors.primary : colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: filtroListaCompras === 'pessoal' ? colors.primary : colors.textSecondary, fontWeight: '600' }}>Pessoal</Text>
                </TouchableOpacity>
                {showEmpresaFeatures && (
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setFiltroListaCompras('empresa'); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, backgroundColor: filtroListaCompras === 'empresa' ? colors.primary + '30' : colors.primaryRgba?.(0.08) ?? colors.primary + '15', borderWidth: 1, borderColor: filtroListaCompras === 'empresa' ? colors.primary : colors.border }}>
                  <Ionicons name="business-outline" size={14} color={filtroListaCompras === 'empresa' ? colors.primary : colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: filtroListaCompras === 'empresa' ? colors.primary : colors.textSecondary, fontWeight: '600' }}>Empresa</Text>
                </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setShowConcluidasListaCompras(!showConcluidasListaCompras); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.primary + '26', borderWidth: 1, borderColor: colors.primary + '50' }}>
                <AppIcon name={showConcluidasListaCompras ? 'list-outline' : 'checkmark-done-outline'} size={16} color={colors.primary} />
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>{showConcluidasListaCompras ? 'Ver pendentes' : 'Ver compras concluídas'}</Text>
              </TouchableOpacity>
            </View>
            <ScrollableCardList
              items={displayItems}
              colors={colors}
              accentColor={colors.primary}
              emptyText={showConcluidasListaCompras ? 'Nenhuma compra concluída' : 'Nenhum item na lista'}
              onVerMais={() => { playTapSound(); setExpandedCard('listacompras'); }}
              itemMarginBottom={8}
              renderItem={(i) => (
                <TouchableOpacity onPress={(e) => toggleItem(e, i)} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: i.checked ? colors.primary : colors.border, backgroundColor: i.checked ? colors.primary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                    {i.checked && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <Text style={{ fontSize: 15, color: colors.text, flex: 1, textDecorationLine: i.checked ? 'line-through' : 'none' }} numberOfLines={1}>{i.title}</Text>
                </TouchableOpacity>
              )}
            />
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
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: webProductivityTab === 'anotacoes' ? colors.primary + '30' : colors.primaryRgba?.(0.08) ?? colors.primary + '15', borderWidth: 1, borderColor: webProductivityTab === 'anotacoes' ? colors.primary : colors.border }}
            >
              <Ionicons name="document-text-outline" size={14} color={webProductivityTab === 'anotacoes' ? colors.primary : colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: webProductivityTab === 'anotacoes' ? colors.primary : colors.textSecondary }}>Minhas anotações</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { playTapSound(); setWebProductivityTab('compras'); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: webProductivityTab === 'compras' ? colors.primary + '30' : colors.primaryRgba?.(0.08) ?? colors.primary + '15', borderWidth: 1, borderColor: webProductivityTab === 'compras' ? colors.primary : colors.border }}
            >
              <Ionicons name="cart-outline" size={14} color={webProductivityTab === 'compras' ? colors.primary : colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: webProductivityTab === 'compras' ? colors.primary : colors.textSecondary }}>Minhas compras</Text>
            </TouchableOpacity>
            <View style={{ marginLeft: 'auto', ...cardHeaderActionsStyle }}>
              <TouchableOpacity
                onPress={() => { playTapSound(); webProductivityTab === 'anotacoes' ? openAnotacoes?.() : openListaCompras?.(); }}
                style={cardActionButtonStyle}
              >
                <Ionicons name="add" size={CARD_ACTION_ICON_SIZE} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { playTapSound(); webProductivityTab === 'anotacoes' ? openAnotacoes?.() : openListaCompras?.(); }}
                style={cardActionButtonStyle}
              >
                <AppIcon name="expand-outline" size={CARD_EXPAND_ICON_SIZE} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          {webProductivityTab === 'anotacoes' ? (
            <ScrollableCardList
              items={notes}
              colors={colors}
              accentColor={colors.primary}
              emptyText="Nenhuma anotação ainda"
              onVerMais={() => { playTapSound(); openAnotacoes?.(); }}
              renderItem={(n) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 22, borderLeftWidth: 3, borderLeftColor: CARD_ICON_COLORS.anotacoes + '40', marginLeft: 4 }}>
                  <Text style={{ fontSize: 15, color: colors.text, flex: 1 }} numberOfLines={1}>{n.title || 'Sem título'}</Text>
                </View>
              )}
            />
          ) : (
            <ScrollableCardList
              items={(shoppingItems || []).filter((i) => !i.checked)}
              colors={colors}
              accentColor={colors.primary}
              emptyText="Nenhum item na lista"
              onVerMais={() => { playTapSound(); openListaCompras?.(); }}
              renderItem={(i) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                  <View style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: colors.border, backgroundColor: 'transparent' }} />
                  <Text style={{ fontSize: 15, color: colors.text, flex: 1 }} numberOfLines={1}>{i.title}</Text>
                </View>
              )}
            />
          )}
        </GlassCard>
      </View>
    ),
    contas: (
      <View key="contas">
        <ContasDoMesCard
          contasPagas={contasStatus.pagas}
          contasAVencer={contasStatus.aVencer}
          contasVencidas={contasStatus.vencidas}
          formatCurrency={fmt}
          mask={mask}
          colors={colors}
          lightBackground={themeMode === 'light'}
          noMargins={useWebLayout}
          onOpenFaturas={() => openCadastro?.('boletos')}
          onAddFatura={() => openCadastro?.('boletos')}
          playTapSound={playTapSound}
          filter={balanceFilter}
          filterLabel={balanceFilterLabel}
          filterStartDate={periodStart}
          filterEndDate={periodEnd}
          onFilterChange={(f) => { playTapSound(); setBalanceFilter(f); setBalanceFilterDate(new Date()); }}
          onFilterDatePrev={() => adjustBalanceFilterDate(-1)}
          onFilterDateNext={() => adjustBalanceFilterDate(1)}
          onFilterPeriodChange={(start, end) => { setPeriodStart(start); setPeriodEnd(end); }}
          headerActions={(
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' }}>
              <TouchableOpacity
                onPress={() => { playTapSound(); setFaturasFiltroTipo('todos'); }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, backgroundColor: faturasFiltroTipo === 'todos' ? colors.primary + '30' : colors.primaryRgba?.(0.08) ?? colors.primary + '15', borderWidth: 1, borderColor: faturasFiltroTipo === 'todos' ? colors.primary : colors.border }}
              >
                <Ionicons name="list" size={14} color={faturasFiltroTipo === 'todos' ? colors.primary : colors.textSecondary} />
                <Text style={{ fontSize: 12, color: faturasFiltroTipo === 'todos' ? colors.primary : colors.textSecondary, fontWeight: '600' }}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { playTapSound(); setFaturasFiltroTipo('pessoal'); }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, backgroundColor: faturasFiltroTipo === 'pessoal' ? colors.primary + '30' : colors.primaryRgba?.(0.08) ?? colors.primary + '15', borderWidth: 1, borderColor: faturasFiltroTipo === 'pessoal' ? colors.primary : colors.border }}
              >
                <Ionicons name="person-outline" size={14} color={faturasFiltroTipo === 'pessoal' ? colors.primary : colors.textSecondary} />
                <Text style={{ fontSize: 12, color: faturasFiltroTipo === 'pessoal' ? colors.primary : colors.textSecondary, fontWeight: '600' }}>Pessoal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { playTapSound(); setFaturasFiltroTipo('empresa'); }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, backgroundColor: faturasFiltroTipo === 'empresa' ? colors.primary + '30' : colors.primaryRgba?.(0.08) ?? colors.primary + '15', borderWidth: 1, borderColor: faturasFiltroTipo === 'empresa' ? colors.primary : colors.border }}
              >
                <Ionicons name="business-outline" size={14} color={faturasFiltroTipo === 'empresa' ? colors.primary : colors.textSecondary} />
                <Text style={{ fontSize: 12, color: faturasFiltroTipo === 'empresa' ? colors.primary : colors.textSecondary, fontWeight: '600' }}>Empresa</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    ),
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      {(() => {
        const showInlineToggle = useWebLayout && canToggleView;
        return (
      <TopBar
        title="Início"
        colors={colors}
        useLogoImage
        hideOrganize
        headerDate={now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
        deferFinancePrompt
        inlineToggle={showInlineToggle ? <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} colors={colors} inline /> : null}
        onManageCards={() => setShowCardPicker(true)}
        onCalculadora={useWebLayout ? openCalculadoraFull : undefined}
        onChat={useWebLayout ? openMeusGastos : undefined}
        onWhatsApp={showEmpresaFeatures ? openMensagensWhatsApp : undefined}
      />
        );
      })()}
      {!(useWebLayout && canToggleView) && canToggleView && <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} colors={colors} />}
      {isGuest && (
        <View style={{ marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: colors.primaryRgba(0.2), borderWidth: 1, borderColor: colors.primary + '60', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>Modo visitante: os dados não são salvos. Faça login para persistir.</Text>
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false} scrollEnabled nestedScrollEnabled={isWebMobile}>
        <View style={[ds.pagePromptBanner, { backgroundColor: colors.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border + '99' }]}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'center', lineHeight: 22 }}>
            {getStableHomePrompt()}
          </Text>
        </View>

        {useWebLayout ? (
          <View style={{ paddingHorizontal: 10 }}>
            {(() => {
              const carouselContent = sectionMap.carousel;
              const quoteContent = sectionMap.quote;
              return (
                <>
                  {carouselContent ? (
                    <View style={{ width: '100%', paddingHorizontal: 4 }}>
                      {carouselContent}
                    </View>
                  ) : null}
                  {quoteContent ? (
                    <View style={{ width: '100%', paddingHorizontal: 4 }}>
                      {quoteContent}
                    </View>
                  ) : null}
                </>
              );
            })()}
            {(() => {
              const hasAgenda = webSectionTail.includes('agenda');
              if (!hasAgenda) return null;
              // Layout pedido: 1 card grande (Atendimentos + Agenda) e Próximas tarefas embaixo.
              if (!webSectionTail.includes('proximos')) return null;
              return (
                <>
                  {/* Grid 2x2: direita (Agenda) ocupa 2 espaços; esquerda: Atendimentos + Tarefas empilhados */}
                  {(() => {
                    // Padroniza alinhamento/altura/spacing entre os cards no grid do web.
                    // Gap pequeno, mesmo “peso” do espaçamento lateral (4 + 4).
                    const GAP = 8;
                    const baseH = (TRIO_CARD_HEIGHT || 250);
                    const GRID_H = baseH * 2 + GAP;
                    // Regra pedida: (alturaAgenda - GAP) / 2.
                    // Se ainda não mediu, usa fallback estável pelo TRIO_CARD_HEIGHT.
                    const agendaH = Number(webAgendaCardHeight) || 0;
                    const STACK_H = agendaH > 0 ? agendaH : GRID_H;
                    const LEFT_ITEM_H = Math.max(140, (STACK_H - GAP) / 2);
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'stretch', marginTop: 4 }}>
                        <View style={{ width: '40%', paddingRight: 4, height: STACK_H }}>
                          <View style={{ flex: 1, justifyContent: 'flex-start' }}>
                            <View style={{ height: LEFT_ITEM_H, marginBottom: GAP }}>
                              {sectionMap.agendamentos}
                            </View>
                            <View style={{ height: LEFT_ITEM_H }}>
                              {sectionMap.proximos}
                            </View>
                          </View>
                        </View>
                        <View style={{ width: '60%', paddingLeft: 4 }}>
                          {/* No web/desktop, altura fixa + overflow hidden recorta o card em alguns tamanhos de janela.
                              Preferimos deixar crescer quando necessário para nunca cortar conteúdo. */}
                          <View style={{ minHeight: GRID_H }}>
                            {sectionMap.agenda}
                          </View>
                        </View>
                      </View>
                    );
                  })()}
                  {webSectionTail.includes('aniversariantes') ? (
                    <View style={{ width: '100%', paddingHorizontal: 4, marginTop: 8 }}>
                      {sectionMap.aniversariantes}
                    </View>
                  ) : null}
                  <View style={{ height: 8 }} />
                </>
              );
            })()}
            {(() => {
              const CARD_GAP = 8;
              return (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: CARD_GAP }}>
              {webSectionTail
                .filter((sid) => !['proximos', 'agendamentos', 'agenda', 'aniversariantes', 'meusgastos'].includes(sid))
                .map((sid) => {
                const content = sectionMap[sid];
                if (!content) return null;
                const isMeusGastos = sid === 'meusgastos';
                const isProdutividade = sid === 'produtividade';
                const isMinhasFaturas = sid === 'contas';
                return (
                  <View
                    key={sid}
                    style={{
                      width: (isMeusGastos || isProdutividade || isMinhasFaturas) ? '100%' : '50%',
                      paddingHorizontal: 4,
                      marginBottom: CARD_GAP,
                    }}
                  >
                    {content}
                  </View>
                );
              })}
            </View>
              );
            })()}
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
        {editMode && (
          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            <TouchableOpacity
              style={{ padding: 16, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary + '80', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              onPress={() => setShowCardPicker(true)}
            >
              <AppIcon name="add-circle-outline" size={26} color={colors.primary} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>Adicionar card</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 12 }}>Segure 3s para flutuar, role a tela e toque em outro card para trocar</Text>
          </View>
        )}
        <View style={{ height: isWebMobile ? 140 : 100 }} />
      </ScrollView>
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
      />
      {/* Web desktop: botão flutuante removido (fica no cabeçalho). */}
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
        headerRight={
          (expandedCard === 'proximos' || expandedCard === 'agendamentos') ? (
            <TouchableOpacity
              onPress={() => {
                playTapSound();
                if (expandedCard === 'proximos') openAddModal?.('tarefa', null);
                if (expandedCard === 'agendamentos') openAddModal?.('agenda', null);
              }}
              style={{
                width: Platform.OS === 'web' ? 32 : 40,
                height: Platform.OS === 'web' ? 32 : 40,
                borderRadius: Platform.OS === 'web' ? 16 : 20,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.primary + '26',
                borderWidth: 1,
                borderColor: colors.primary + '50',
              }}
            >
              <Ionicons name="add" size={Platform.OS === 'web' ? 18 : 22} color={colors.primary} />
            </TouchableOpacity>
          ) : null
        }
        title={
          expandedCard === 'proximos' ? (showConcluidasProximos ? 'Tarefas concluídas' : 'Próximas tarefas') :
          expandedCard === 'agendamentos' ? (showConcluidasAgendamentos ? ((showEmpresaFeatures && viewMode === 'empresa') ? 'Atendimentos concluídos' : 'Eventos concluídos') : ((showEmpresaFeatures && viewMode === 'empresa') ? 'Próximos atendimentos' : 'Próximos eventos')) :
          expandedCard === 'anotacoes' ? 'Minhas anotações' :
          expandedCard === 'listacompras' ? (showConcluidasListaCompras ? 'Compras concluídas' : 'Lista de compras') : ''
        }
      >
        {expandedCard === 'proximos' && (showConcluidasProximos ? proximasTarefas.concluidas : proximasTarefas.tarefas).map((t) => (
          <GlassCard key={t.id} colors={colors} solid style={{ marginBottom: 8, borderWidth: 1, borderColor: colors.border }} contentStyle={{ padding: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderLeftWidth: 3, borderLeftColor: CARD_ICON_COLORS.proximos + '40' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: colors.text, textDecorationLine: showConcluidasProximos ? 'line-through' : 'none' }}>{t.title}</Text>
                {(t.date || t.timeStart) && <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{[t.date, t.timeStart && t.timeEnd ? `${t.timeStart}-${t.timeEnd}` : null].filter(Boolean).join(' · ')}</Text>}
              </View>
              <TouchableOpacity onPress={() => { playTapSound(); setExpandedCard(null); openCadastro?.('tarefas', { editItemId: t.id }); }}><Ionicons name="pencil" size={20} color={colors.primary} /></TouchableOpacity>
              {showConcluidasProximos ? (
                <TouchableOpacity onPress={() => { playTapSound(); updateCheckListItem(t.id, { checked: false }); }}><Ionicons name="arrow-undo" size={20} color={colors.textSecondary} /></TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => { playTapSound(); updateCheckListItem(t.id, { checked: true }); }}><Ionicons name="checkmark-done" size={20} color={colors.primary} /></TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => { playTapSound(); Alert.alert('Excluir', 'Excluir esta tarefa?', [{ text: 'Cancelar' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteCheckListItem(t.id) }]); }}><Ionicons name="trash-outline" size={20} color="#ef4444" /></TouchableOpacity>
            </View>
          </GlassCard>
        ))}
        {expandedCard === 'agendamentos' && (showConcluidasAgendamentos ? proximasTarefas.agendasConcluidas : proximasTarefas.agendas).map((e) => {
          const displayTitle = ((e.tipo === 'empresa' && e.clientId) ? (clients?.find((c) => c.id === e.clientId)?.name) : null) || (e.title || '').replace(/^Pré-pedido\s*[-–]\s*/i, '').trim() || 'Evento';
          const detailParts = [];
          if (e.amount > 0) detailParts.push(formatCurrency(e.amount));
          if (e.type === 'venda') detailParts.push('Venda');
          else if (e.type === 'orcamento') detailParts.push('Orçamento');
          else if (e.type === 'manutencao') detailParts.push('Garantia');
          const detailStr = detailParts.length ? detailParts.join(' · ') : null;
          return (
            <GlassCard key={e.id} colors={colors} solid style={{ marginBottom: 8, borderWidth: 1, borderColor: colors.border }} contentStyle={{ padding: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderLeftWidth: 3, borderLeftColor: CARD_ICON_COLORS.agendamentos + '40' }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15, color: colors.text }} numberOfLines={1}>{displayTitle}</Text>
                  {detailStr && <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{detailStr}</Text>}
                </View>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>{e.date}</Text>
                <TouchableOpacity onPress={() => { playTapSound(); setExpandedCard(null); openAddModal?.('agenda', { editingEvent: e }); }}><Ionicons name="pencil" size={20} color={colors.primary} /></TouchableOpacity>
                <TouchableOpacity onPress={() => { playTapSound(); const isEmp = showEmpresaFeatures && (e.tipo === 'empresa'); if (isEmp && e.status !== 'concluido') openAddModal?.('receita', { fromAgendaEvent: e }); else updateAgendaEvent(e.id, { status: (e.status === 'concluido' ? 'pendente' : 'concluido') }); }}><Ionicons name="checkmark-done" size={20} color={colors.primary} /></TouchableOpacity>
                <TouchableOpacity onPress={() => { playTapSound(); Alert.alert('Excluir', 'Quer realmente excluir este evento?', [{ text: 'Cancelar' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteAgendaEvent(e.id) }]); }}><Ionicons name="trash-outline" size={20} color="#ef4444" /></TouchableOpacity>
              </View>
            </GlassCard>
          );
        })}
        {expandedCard === 'anotacoes' && notes.map((n) => (
          <View key={n.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.card, marginBottom: 8 }}>
            <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{n.title || 'Sem título'}</Text>
            <TouchableOpacity onPress={() => { playTapSound(); setExpandedCard(null); openAnotacoes?.({ editNoteId: n.id }); }}><Ionicons name="pencil" size={20} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => { playTapSound(); Alert.alert('Excluir', 'Quer excluir esta anotação?', [{ text: 'Cancelar' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteNote(n.id) }]); }}><Ionicons name="trash-outline" size={20} color="#ef4444" /></TouchableOpacity>
          </View>
        ))}
        {expandedCard === 'listacompras' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <TouchableOpacity onPress={() => { playTapSound(); setShowConcluidasListaCompras(!showConcluidasListaCompras); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.primary + '26', borderWidth: 1, borderColor: colors.primary + '50' }}>
                <AppIcon name={showConcluidasListaCompras ? 'list-outline' : 'checkmark-done-outline'} size={16} color={colors.primary} />
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>{showConcluidasListaCompras ? 'Ver pendentes' : 'Ver compras concluídas'}</Text>
              </TouchableOpacity>
            </View>
            {(() => {
              const base = filtroListaCompras === 'todos' ? shoppingItems : shoppingItems.filter((i) => (i.tipo || 'pessoal') === filtroListaCompras);
              const items = showConcluidasListaCompras ? base.filter((i) => i.checked) : base.filter((i) => !i.checked);
              return items.map((i) => (
                <TouchableOpacity key={i.id} onPress={() => { playTapSound(); updateShoppingItem(i.id, { checked: !i.checked }); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.card, marginBottom: 8 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: i.checked ? colors.primary : colors.border, backgroundColor: i.checked ? colors.primary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>{i.checked && <Ionicons name="checkmark" size={12} color="#fff" />}</View>
                  <Text style={{ flex: 1, fontSize: 15, color: colors.text, textDecorationLine: i.checked ? 'line-through' : 'none' }}>{i.title}</Text>
                </TouchableOpacity>
              ));
            })()}
          </>
        )}
      </CardExpandedModal>
    </SafeAreaView>
  );
}
