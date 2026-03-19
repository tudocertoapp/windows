import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Dimensions, FlatList, LayoutAnimation, UIManager, Platform, Alert, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
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
import { TopBar } from '../components/TopBar';
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
import { DEFAULT_SECTIONS, DINHEIRO_ADDABLE_CARDS, DINHEIRO_CARD_TYPES, ALL_INICIO_IDS } from '../constants/dashboardCards';

const logoImage = require('../../assets/logo.png');
const SECTIONS_ORDER_KEY = '@tudocerto_dashboard_order';

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
  carousel: { marginTop: 16, height: 200, marginHorizontal: 0, paddingVertical: 8 },
  carouselItem: { height: 160, marginRight: 16, borderRadius: 20, padding: 20, borderWidth: 1 },
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
  const [carouselIndex, setCarouselIndex] = useState(0);
  const CARD_WIDTH = SW * 0.82;
  const CARD_GAP = 16;
  const CAROUSEL_PADDING = (SW - CARD_WIDTH) / 2;
  const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
  const [sectionOrder, setSectionOrder] = useState(DEFAULT_SECTIONS);
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
  const layoutsRef = useRef({});
  const [floatingId, setFloatingId] = useState(null);
  const now = new Date();
  const quote = getQuoteOfDay(quoteType);


  useEffect(() => {
    AsyncStorage.getItem(SECTIONS_ORDER_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const allowedSections = new Set(ALL_INICIO_IDS);
          let filtered = Array.isArray(parsed)
            ? parsed
                .filter((id) => id !== 'agenda' && allowedSections.has(id === 'tarefas' ? 'proximos' : id))
                .map((id) => (id === 'tarefas' ? 'proximos' : id))
            : DEFAULT_SECTIONS;
          filtered = [...new Set(filtered)];
          const base = filtered.length > 0 ? filtered : DEFAULT_SECTIONS;
          const missing = DEFAULT_SECTIONS.filter((id) => !base.includes(id));
          setSectionOrder([...base, ...missing]);
        } catch (_) {}
      } else {
        setSectionOrder(DEFAULT_SECTIONS);
      }
    });
  }, []);
  useEffect(() => {
    if (route.params?.openCardPicker) {
      setShowCardPicker(true);
      navigation?.setParams?.({ openCardPicker: undefined });
    }
  }, [route.params?.openCardPicker, navigation]);
  useEffect(() => {
    const toSave = sectionOrder.filter((id) => id !== 'agenda' && id !== 'tarefas');
    AsyncStorage.setItem(SECTIONS_ORDER_KEY, JSON.stringify(toSave.length > 0 ? toSave : DEFAULT_SECTIONS));
  }, [sectionOrder]);

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
      { id: '1', title: 'Gerencie suas finanças', text: 'Receitas, despesas e controle total em um só lugar.', icon: 'wallet-outline', color: '#10b981', onPress: 'dinheiro' },
      { id: '2', title: 'Limite seu orçamento', text: 'Mantenha sua vida organizada.', icon: 'cash-outline', color: '#dc2626', onPress: 'orcamento' },
      ...(isEmpresa ? [{ id: 'whatsapp', title: 'Envie mensagem para seus clientes', text: 'Use o WhatsApp para conversar, enviar lembretes e templates aos seus clientes.', icon: 'logo-whatsapp', color: '#25D366', onPress: 'whatsapp' }] : []),
      { id: '3', title: 'Faça upgrade do seu plano', text: 'Plano Empresa: CRM, produtos compostos e muito mais.', icon: 'rocket-outline', color: '#8b5cf6', onPress: 'assinatura' },
      { id: '4', title: 'Indique e ganhe', text: 'Convide amigos e ganhe benefícios exclusivos.', icon: 'people-outline', color: '#f59e0b', onPress: 'indique' },
      { id: '5', title: 'Agenda', text: isEmpresa ? 'Agende seus clientes.' : 'Agende seus eventos.', icon: 'calendar-outline', color: '#06b6d4', onPress: 'agenda' },
      { id: '6', title: 'Cards personalizáveis', text: 'Toque no ícone de grade ao lado para gerenciar os cards do Início.', icon: 'grid-outline', color: '#ec4899', onPress: 'cards' },
    ];
    return base;
  }, [viewMode, showEmpresaFeatures]);

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

  useEffect(() => {
    const count = carouselItems.length;
    const interval = setInterval(() => {
      const next = (carouselIndex + 1) % count;
      setCarouselIndex(next);
      carouselRef.current?.scrollToOffset({ offset: next * SNAP_INTERVAL, animated: true });
    }, 4000);
    return () => clearInterval(interval);
  }, [carouselIndex, SNAP_INTERVAL, carouselItems.length]);

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

  const taskCardBase = (icon, iconColor, title, subtitle, items, renderItem, emptyText, extraHeaderContent, onVerMais, headerRightActions) => (
    <TouchableOpacity
      key={title}
      onPress={() => navigation?.navigate?.('Agenda')}
      activeOpacity={0.9}
      style={{ marginHorizontal: 16, marginTop: 16 }}
    >
      <GlassCard colors={colors} style={[ds.card, { borderColor: colors.primary + '50', borderWidth: 2, padding: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 }]} contentStyle={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
            <AppIcon name={icon} size={26} color={iconColor || colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>{title}</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>{subtitle}</Text>
          </View>
          {headerRightActions ?? <AppIcon name="expand-outline" size={22} color={colors.primary} />}
        </View>
        {extraHeaderContent}
        <ScrollableCardList
          items={items}
          colors={colors}
          emptyText={emptyText}
          onVerMais={onVerMais}
          renderItem={(item) => renderItem(item)}
        />
      </GlassCard>
    </TouchableOpacity>
  );

  const sectionMap = {
    proximos: (
      <TouchableOpacity
        key="proximos"
        onPress={() => navigation?.navigate?.('Agenda')}
        activeOpacity={0.9}
        style={{ marginHorizontal: 16, marginTop: 16 }}
      >
        <GlassCard colors={colors} style={[ds.card, { borderColor: colors.primary + '50', borderWidth: 2, padding: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 }]} contentStyle={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
              <AppIcon name="checkmark-done-outline" size={26} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
                {showConcluidasProximos ? 'Tarefas concluídas' : 'Próximas tarefas'}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>
                {showConcluidasProximos
                  ? (proximasTarefas.concluidas.length === 0 ? 'Nenhuma' : `${proximasTarefas.concluidas.length} concluída${proximasTarefas.concluidas.length !== 1 ? 's' : ''}`)
                  : (proximasTarefas.tarefas.length === 0 ? 'Nada pendente' : `${proximasTarefas.tarefas.length} pendente${proximasTarefas.tarefas.length !== 1 ? 's' : ''}`)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAddModal?.('tarefa', null); }} style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}>
                <Ionicons name="add" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setExpandedCard('proximos'); }} style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}>
                <AppIcon name="expand-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setShowConcluidasProximos(!showConcluidasProximos); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}>
              <AppIcon name={showConcluidasProximos ? 'list-outline' : 'checkmark-done-outline'} size={16} color={colors.primary} />
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>{showConcluidasProximos ? 'Ver pendentes' : 'Ver concluídas'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollableCardList
            items={showConcluidasProximos ? proximasTarefas.concluidas : proximasTarefas.tarefas}
            colors={colors}
            emptyText={showConcluidasProximos ? 'Nenhuma tarefa concluída' : 'Nenhuma tarefa pendente'}
            onVerMais={() => { playTapSound(); setExpandedCard('proximos'); }}
            renderItem={(t) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 22, borderLeftWidth: 3, borderLeftColor: colors.primary + '40', marginLeft: 4 }}>
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
        <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 26, borderLeftWidth: 3, borderLeftColor: colors.primary + '40', marginLeft: 4, marginBottom: 4 }}>
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
      (
        <View key="agendamentos-actions" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setShowConcluidasAgendamentos(!showConcluidasAgendamentos); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}>
            <AppIcon name={showConcluidasAgendamentos ? 'calendar-outline' : 'checkmark-done-outline'} size={16} color={colors.primary} />
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>{showConcluidasAgendamentos ? 'Ver pendentes' : 'Ver concluídas'}</Text>
          </TouchableOpacity>
        </View>
      ),
      () => { playTapSound(); setExpandedCard('agendamentos'); },
      (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAddModal?.('agenda', null); }} style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setExpandedCard('agendamentos'); }} style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}>
            <AppIcon name="expand-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )
    ),
    carousel: (
      <View key="carousel" style={ds.carousel}>
        <FlatList
          ref={carouselRef}
          data={carouselItems}
          horizontal
          pagingEnabled={false}
          snapToInterval={SNAP_INTERVAL}
          snapToAlignment="center"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: CAROUSEL_PADDING }}
          onMomentumScrollEnd={(e) => setCarouselIndex(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, SNAP_INTERVAL)))}
          renderItem={({ item }) => {
            const cardContent = (
              <View style={[ds.carouselItem, { width: CARD_WIDTH, backgroundColor: item.color || colors.primary, borderColor: (item.color || colors.primary) + '80', overflow: 'hidden' }]}>
                <View style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                <View style={{ position: 'absolute', bottom: -30, left: -30, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                  <AppIcon name={item.icon} size={28} color="#fff" />
                </View>
                <Text style={[ds.carouselTitle, { color: '#fff' }]}>{item.title}</Text>
                <Text style={[ds.carouselText, { color: '#fff' }]}>{item.text}</Text>
              </View>
            );
            return item.onPress ? (
              <TouchableOpacity key={item.id} onPress={() => handleCarouselPress(item)} activeOpacity={0.9} style={{ width: CARD_WIDTH + 16 }}>
                {cardContent}
              </TouchableOpacity>
            ) : (
              <View key={item.id} style={{ width: CARD_WIDTH + 16 }}>{cardContent}</View>
            );
          }}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12 }}>
          {carouselItems.map((_, i) => (
            <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === carouselIndex ? colors.primary : colors.textSecondary + '60' }} />
          ))}
        </View>
      </View>
    ),
    quote: (
      <TouchableOpacity key="quote" onPress={() => openImageGenerator?.({ quote, quoteType })} activeOpacity={0.8} style={{ marginHorizontal: 16, marginTop: 16 }}>
        <GlassCard colors={colors} style={[ds.card, { borderColor: colors.primary + '50', borderWidth: 2, padding: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 }]} contentStyle={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
              <AppIcon name={quoteType === 'motivacional' ? 'chatbubble-outline' : 'book-outline'} size={26} color="#0891b2" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
                {quoteType === 'motivacional' ? 'Frase do dia' : 'Versículo do dia'}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>
                {quoteType === 'motivacional' ? 'Citação motivacional' : 'Palavra de sabedoria'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); playTapSound(); openImageGenerator?.({ quote, quoteType }); }}
                style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}
              >
                <Ionicons name="share-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[ds.quoteText, { color: colors.text }]} numberOfLines={3}>"{quote}"</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14 }}>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); playTapSound(); setQuoteType(quoteType === 'motivacional' ? 'verso' : 'motivacional'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '60' }}>
              <Ionicons name={quoteType === 'motivacional' ? 'book-outline' : 'chatbubble-outline'} size={18} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{quoteType === 'motivacional' ? 'Ver versículo' : 'Ver citação'}</Text>
            </TouchableOpacity>
          </View>
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
        <View key="aniversariantes" style={{ marginHorizontal: 16, marginTop: 16 }}>
          <GlassCard colors={colors} style={[ds.card, { borderColor: '#ec4899' + '80', borderWidth: 2, padding: 20, shadowColor: '#ec4899', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 }]} contentStyle={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <TouchableOpacity onPress={() => { playTapSound(); openAniversariantes?.(); }} activeOpacity={0.9} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="gift-outline" size={26} color="#ec4899" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>Aniversariantes da semana</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>
                    {aniversariantesSemana.length > 0
                      ? (isEmpresa ? `${aniversariantesSemana.length} cliente${aniversariantesSemana.length !== 1 ? 's' : ''} (empresa)` : `${aniversariantesSemana.length} família e amigos (pessoal)`)
                      : (isEmpresa ? 'Cadastre data de nascimento dos clientes' : 'Cadastre data de nascimento')}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openCadastro?.('clientes'); }} style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(236,72,153,0.15)', borderWidth: 1, borderColor: '#ec4899' + '50' }}>
                  <Ionicons name="add" size={24} color="#ec4899" />
                </TouchableOpacity>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAniversariantes?.(); }} style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(236,72,153,0.15)', borderWidth: 1, borderColor: '#ec4899' + '50' }}>
                  <AppIcon name="expand-outline" size={22} color="#ec4899" />
                </TouchableOpacity>
              </View>
            </View>
            {aniversariantesSemana.length > 0 ? (
              aniversariantesSemana.slice(0, 4).map((c) => {
                const bd = c.birthDate || c.dataNascimento;
                const diaLabel = getDiaLabel(bd);
                const dataStr = formatBirthShort(bd) + (diaLabel ? ` · ${diaLabel}` : '');
                return (
                <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 4, marginBottom: 4 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{c.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>{dataStr}{c.phone ? ` · ${c.phone}` : ''}</Text>
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
              })
            ) : (
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Mande uma mensagem de parabéns pelo WhatsApp</Text>
            )}
          </GlassCard>
        </View>
      );
    })(),
    meusgastos: (
      <View key="meusgastos" style={{ marginHorizontal: 16, marginTop: 16 }}>
        <GlassCard colors={colors} style={[ds.card, { borderColor: colors.primary + '50', borderWidth: 2, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6, overflow: 'hidden' }]} contentStyle={{ padding: 0 }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                <AppIcon name="chatbubbles-outline" size={26} color="#7c3aed" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>Meus gastos</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>Conversa por texto, voz e foto da notinha</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openMeusGastos?.(); }}
                  style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}
                  activeOpacity={0.9}
                >
                  <AppIcon name="expand-outline" size={22} color={colors.primary} />
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
        style={{ marginHorizontal: 16, marginTop: 16 }}
      >
        <GlassCard colors={colors} style={[ds.card, { borderColor: colors.primary + '50', borderWidth: 2, padding: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 }]} contentStyle={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
              <AppIcon name="document-text-outline" size={26} color="#0284c7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>Minhas anotações</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>
                {notes.length === 0 ? 'Suas notas e lembretes' : `${notes.length} anotação${notes.length !== 1 ? 'ões' : ''}`}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAnotacoes?.({ create: true }); }} style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}>
                <Ionicons name="add" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAnotacoes?.(); }} style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}>
                <AppIcon name="expand-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollableCardList
            items={notes}
            colors={colors}
            emptyText="Nenhuma anotação ainda"
            onVerMais={() => { playTapSound(); setExpandedCard('anotacoes'); }}
            renderItem={(n) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 22, borderLeftWidth: 3, borderLeftColor: colors.primary + '40', marginLeft: 4 }}>
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
          style={{ marginHorizontal: 16, marginTop: 16 }}
        >
          <GlassCard colors={colors} style={[ds.card, { borderColor: colors.primary + '50', borderWidth: 2, padding: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 }]} contentStyle={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                <AppIcon name="cart-outline" size={26} color="#f97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
                  {showConcluidasListaCompras ? 'Compras concluídas' : 'Lista de compras'}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: CARD_SUBTITLE_MARGIN_TOP }}>
                  {showConcluidasListaCompras
                    ? (filteredConcluidas.length === 0 ? 'Nenhuma compra concluída' : `${filteredConcluidas.length} concluída${filteredConcluidas.length !== 1 ? 's' : ''}`)
                    : (filteredPendentes.length === 0 ? 'Anote o que precisa comprar' : `${filteredPendentes.length} pendente${filteredPendentes.length !== 1 ? 's' : ''}`)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openListaCompras?.(); }} style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}>
                  <Ionicons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openListaCompras?.(); }} style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}>
                  <AppIcon name="expand-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ width: '100%', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' }}>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setFiltroListaCompras('todos'); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, backgroundColor: filtroListaCompras === 'todos' ? (colors.primaryRgba(0.2) ?? colors.primary + '30') : colors.primaryRgba?.(0.08) ?? colors.primary + '15', borderWidth: 1, borderColor: filtroListaCompras === 'todos' ? colors.primary : colors.border }}>
                  <Ionicons name="list" size={14} color={filtroListaCompras === 'todos' ? colors.primary : colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: filtroListaCompras === 'todos' ? colors.primary : colors.textSecondary, fontWeight: '600' }}>Todos</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setFiltroListaCompras('pessoal'); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, backgroundColor: filtroListaCompras === 'pessoal' ? (colors.primaryRgba(0.2) ?? colors.primary + '30') : colors.primaryRgba?.(0.08) ?? colors.primary + '15', borderWidth: 1, borderColor: filtroListaCompras === 'pessoal' ? colors.primary : colors.border }}>
                  <Ionicons name="person-outline" size={14} color={filtroListaCompras === 'pessoal' ? colors.primary : colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: filtroListaCompras === 'pessoal' ? colors.primary : colors.textSecondary, fontWeight: '600' }}>Pessoal</Text>
                </TouchableOpacity>
                {showEmpresaFeatures && (
                  <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setFiltroListaCompras('empresa'); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, backgroundColor: filtroListaCompras === 'empresa' ? 'rgba(99,102,241,0.2)' : colors.primaryRgba?.(0.08) ?? colors.primary + '15', borderWidth: 1, borderColor: filtroListaCompras === 'empresa' ? '#6366f1' : colors.border }}>
                    <Ionicons name="business-outline" size={14} color={filtroListaCompras === 'empresa' ? '#6366f1' : colors.textSecondary} />
                    <Text style={{ fontSize: 12, color: filtroListaCompras === 'empresa' ? '#6366f1' : colors.textSecondary, fontWeight: '600' }}>Empresa</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setShowConcluidasListaCompras(!showConcluidasListaCompras); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}>
                <AppIcon name={showConcluidasListaCompras ? 'list-outline' : 'checkmark-done-outline'} size={16} color={colors.primary} />
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>{showConcluidasListaCompras ? 'Ver pendentes' : 'Ver compras concluídas'}</Text>
              </TouchableOpacity>
            </View>
            <ScrollableCardList
              items={displayItems}
              colors={colors}
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
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, backgroundColor: faturasFiltroTipo === 'todos' ? (colors.primaryRgba(0.2) ?? colors.primary + '30') : colors.primaryRgba?.(0.08) ?? colors.primary + '15', borderWidth: 1, borderColor: faturasFiltroTipo === 'todos' ? colors.primary : colors.border }}
              >
                <Ionicons name="list" size={14} color={faturasFiltroTipo === 'todos' ? colors.primary : colors.textSecondary} />
                <Text style={{ fontSize: 12, color: faturasFiltroTipo === 'todos' ? colors.primary : colors.textSecondary, fontWeight: '600' }}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { playTapSound(); setFaturasFiltroTipo('pessoal'); }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, backgroundColor: faturasFiltroTipo === 'pessoal' ? (colors.primaryRgba(0.2) ?? colors.primary + '30') : colors.primaryRgba?.(0.08) ?? colors.primary + '15', borderWidth: 1, borderColor: faturasFiltroTipo === 'pessoal' ? colors.primary : colors.border }}
              >
                <Ionicons name="person-outline" size={14} color={faturasFiltroTipo === 'pessoal' ? colors.primary : colors.textSecondary} />
                <Text style={{ fontSize: 12, color: faturasFiltroTipo === 'pessoal' ? colors.primary : colors.textSecondary, fontWeight: '600' }}>Pessoal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { playTapSound(); setFaturasFiltroTipo('empresa'); }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, backgroundColor: faturasFiltroTipo === 'empresa' ? 'rgba(99,102,241,0.2)' : colors.primaryRgba?.(0.08) ?? colors.primary + '15', borderWidth: 1, borderColor: faturasFiltroTipo === 'empresa' ? '#6366f1' : colors.border }}
              >
                <Ionicons name="business-outline" size={14} color={faturasFiltroTipo === 'empresa' ? '#6366f1' : colors.textSecondary} />
                <Text style={{ fontSize: 12, color: faturasFiltroTipo === 'empresa' ? '#6366f1' : colors.textSecondary, fontWeight: '600' }}>Empresa</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    ),
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <TopBar
        title="Início"
        colors={colors}
        useLogoImage
        hideOrganize
        onManageCards={() => setShowCardPicker(true)}
        onCalculadora={openCalculadoraFull}
        onWhatsApp={showEmpresaFeatures ? openMensagensWhatsApp : undefined}
      />
      {canToggleView && <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} colors={colors} />}
      {isGuest && (
        <View style={{ marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: colors.primaryRgba(0.2), borderWidth: 1, borderColor: colors.primary + '60', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>Modo visitante: os dados não são salvos. Faça login para persistir.</Text>
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false} scrollEnabled>
        <View style={[ds.headerLogo, { backgroundColor: colors.bg }]}>
          <Text style={[ds.monthText, { color: colors.textSecondary }]}>{now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</Text>
        </View>

        {sectionOrder.map((sid) => {
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
        })}
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
        <View style={{ height: 100 }} />
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
        title={
          expandedCard === 'proximos' ? (showConcluidasProximos ? 'Tarefas concluídas' : 'Próximas tarefas') :
          expandedCard === 'agendamentos' ? (showConcluidasAgendamentos ? ((showEmpresaFeatures && viewMode === 'empresa') ? 'Atendimentos concluídos' : 'Eventos concluídos') : ((showEmpresaFeatures && viewMode === 'empresa') ? 'Próximos atendimentos' : 'Próximos eventos')) :
          expandedCard === 'anotacoes' ? 'Minhas anotações' :
          expandedCard === 'listacompras' ? (showConcluidasListaCompras ? 'Compras concluídas' : 'Lista de compras') : ''
        }
      >
        {expandedCard === 'proximos' && (showConcluidasProximos ? proximasTarefas.concluidas : proximasTarefas.tarefas).map((t) => (
          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.card, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: colors.text, textDecorationLine: showConcluidasProximos ? 'line-through' : 'none' }}>{t.title}</Text>
              {(t.date || t.timeStart) && <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{[t.date, t.timeStart && t.timeEnd ? `${t.timeStart}-${t.timeEnd}` : null].filter(Boolean).join(' · ')}</Text>}
            </View>
            <TouchableOpacity onPress={() => { playTapSound(); setExpandedCard(null); openCadastro?.('tarefas', { editItemId: t.id }); }}><Ionicons name="pencil" size={20} color={colors.primary} /></TouchableOpacity>
            {showConcluidasProximos ? (
              <TouchableOpacity onPress={() => { playTapSound(); updateCheckListItem(t.id, { checked: false }); }}><Ionicons name="arrow-undo" size={20} color={colors.textSecondary} /></TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => { playTapSound(); updateCheckListItem(t.id, { checked: true }); }}><Ionicons name="checkmark-done" size={20} color="#10b981" /></TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => { playTapSound(); Alert.alert('Excluir', 'Excluir esta tarefa?', [{ text: 'Cancelar' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteCheckListItem(t.id) }]); }}><Ionicons name="trash-outline" size={20} color="#ef4444" /></TouchableOpacity>
          </View>
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
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.card, marginBottom: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 15, color: colors.text }} numberOfLines={1}>{displayTitle}</Text>
                {detailStr && <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{detailStr}</Text>}
              </View>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{e.date}</Text>
              <TouchableOpacity onPress={() => { playTapSound(); setExpandedCard(null); openAddModal?.('agenda', { editingEvent: e }); }}><Ionicons name="pencil" size={20} color={colors.primary} /></TouchableOpacity>
              <TouchableOpacity onPress={() => { playTapSound(); const isEmp = showEmpresaFeatures && (e.tipo === 'empresa'); if (isEmp && e.status !== 'concluido') openAddModal?.('receita', { fromAgendaEvent: e }); else updateAgendaEvent(e.id, { status: (e.status === 'concluido' ? 'pendente' : 'concluido') }); }}><Ionicons name="checkmark-done" size={20} color="#10b981" /></TouchableOpacity>
              <TouchableOpacity onPress={() => { playTapSound(); Alert.alert('Excluir', 'Quer realmente excluir este evento?', [{ text: 'Cancelar' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteAgendaEvent(e.id) }]); }}><Ionicons name="trash-outline" size={20} color="#ef4444" /></TouchableOpacity>
            </View>
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
              <TouchableOpacity onPress={() => { playTapSound(); setShowConcluidasListaCompras(!showConcluidasListaCompras); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}>
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
