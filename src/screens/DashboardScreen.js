import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Dimensions, FlatList, LayoutAnimation, UIManager, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { useMenu } from '../contexts/MenuContext';
import { useProfile } from '../contexts/ProfileContext';
import { usePlan } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotes } from '../contexts/NotesContext';
import { useValuesVisibility } from '../contexts/ValuesVisibilityContext';
import { TopBar } from '../components/TopBar';
import { ViewModeToggle } from '../components/ViewModeToggle';
import { BalanceCard } from '../components/BalanceCard';
import { ContasDoMesCard } from '../components/ContasDoMesCard';
import { TransacoesCard } from '../components/TransacoesCard';
import { GastosPorCategoriaCard } from '../components/GastosPorCategoriaCard';
import { GlassCard } from '../components/GlassCard';
import { DraggableCard } from '../components/DraggableCard';
import { CardPickerModal } from '../components/CardPickerModal';
import { playTapSound } from '../utils/sounds';
import { formatCurrency } from '../utils/format';
import { getQuoteOfDay } from '../utils/quotes';
import { Ionicons } from '@expo/vector-icons';
import { AppIcon } from '../components/AppIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SECTIONS } from '../constants/dashboardCards';

const logoImage = require('../../assets/logo.png');
const SECTIONS_ORDER_KEY = '@tudocerto_dashboard_order';
const { width: SW } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ds = StyleSheet.create({
  headerLogo: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  logoLarge: { width: 100, height: 100 },
  appTitle: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  monthText: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  balanceCard: { margin: 16, padding: 20, borderRadius: 20 },
  balanceLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  balanceAmount: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 8 },
  balanceRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  balanceBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 },
  boxLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
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
  carouselText: { fontSize: 12, opacity: 0.95, lineHeight: 18 },
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
  const { transactions, checkListItems, agendaEvents, boletos, clients, aReceber, updateCheckListItem, deleteCheckListItem, updateAgendaEvent, deleteAgendaEvent } = useFinance();
  const { colors, themeMode } = useTheme();
  const { viewMode, setViewMode, canToggleView, showEmpresaFeatures } = usePlan();
  const { isGuest } = useAuth();
  const { openImageGenerator, openAReceber, openAddModal, openCadastro, openAnotacoes, openOrcamento, openCalculadoraFull } = useMenu();
  const { notes, deleteNote } = useNotes();
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
  const [showConcluidasProximos, setShowConcluidasProximos] = useState(false);
  const layoutsRef = useRef({});
  const [floatingId, setFloatingId] = useState(null);
  const now = new Date();
  const quote = getQuoteOfDay(quoteType);


  useEffect(() => {
    AsyncStorage.getItem(SECTIONS_ORDER_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const allowedSections = new Set(DEFAULT_SECTIONS);
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

  const contasStatus = useMemo(() => {
    const ref = balanceFilterDate;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let pagas = { qty: 0, valor: 0 };
    let aVencer = { qty: 0, valor: 0 };
    let vencidas = { qty: 0, valor: 0 };
    let list = showEmpresaFeatures ? (boletos || []).filter((b) => (b.tipo || 'pessoal') === viewMode) : (boletos || []);
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
  }, [boletos, viewMode, showEmpresaFeatures, balanceFilter, balanceFilterDate, periodStart, periodEnd, parseDateStr]);

  const fmt = formatCurrency;
  const mask = (v) => (showValues ? v : '••••••');

  const catBreakdown = useMemo(() => {
    const m = {};
    monthTx.filter((t) => t.type === 'expense').forEach((t) => (m[t.category] = (m[t.category] || 0) + t.amount));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [monthTx]);

  const carouselItems = [
    { id: '1', title: 'Gerencie suas finanças', text: 'Receitas, despesas e controle total em um só lugar.', icon: 'wallet-outline', color: '#10b981' },
    { id: '2', title: 'Limite seu orçamento', text: 'Mantenha sua vida organizada.', icon: 'cash-outline', color: '#059669', onPress: 'orcamento' },
    { id: '3', title: 'Faça upgrade do seu plano', text: 'Plano Empresa: CRM, produtos compostos e muito mais.', icon: 'rocket-outline', color: '#8b5cf6' },
    { id: '4', title: 'Indique e ganhe', text: 'Convide amigos e ganhe benefícios exclusivos.', icon: 'people-outline', color: '#f59e0b' },
    { id: '5', title: 'Novidade: Agenda com zoom', text: 'Zoom com os dedos na agenda para ver melhor seus eventos.', icon: 'calendar-outline', color: '#06b6d4' },
    { id: '6', title: 'Novidade: Cards personalizáveis', text: 'Toque no ícone de grade ao lado para gerenciar os cards do Início.', icon: 'grid-outline', color: '#ec4899' },
  ];

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
    const agendas = agendaEvents
      .filter((e) => {
        const d = parseTaskDate(e.date);
        return d && d >= hoje;
      })
      .sort((a, b) => {
        const da = parseTaskDate(a.date) || new Date(9999);
        const db = parseTaskDate(b.date) || new Date(9999);
        return da - db;
      })
      .slice(0, 3);
    return { tarefas: pendentes, concluidas, agendas };
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

  const taskCardBase = (icon, title, subtitle, items, renderItem, emptyText, extraHeaderContent) => (
    <TouchableOpacity
      key={title}
      onPress={() => navigation?.navigate?.('Agenda')}
      activeOpacity={0.9}
      style={{ marginHorizontal: 16, marginTop: 16 }}
    >
      <GlassCard colors={colors} style={[ds.card, { borderColor: colors.primary + '50', borderWidth: 2, padding: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 }]} contentStyle={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
            <AppIcon name={icon} size={26} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>{title}</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{subtitle}</Text>
          </View>
          <AppIcon name="chevron-forward" size={22} color={colors.primary} />
        </View>
        {extraHeaderContent}
        {items.length === 0 ? (
          <Text style={{ fontSize: 14, color: colors.textSecondary, paddingLeft: 4 }}>{emptyText}</Text>
        ) : (
          items.map((item) => renderItem(item))
        )}
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
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
              <AppIcon name="checkmark-done-outline" size={26} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
                {showConcluidasProximos ? 'Tarefas concluídas' : 'Próximas tarefas'}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                {showConcluidasProximos
                  ? (proximasTarefas.concluidas.length === 0 ? 'Nenhuma' : `${proximasTarefas.concluidas.length} concluída${proximasTarefas.concluidas.length !== 1 ? 's' : ''}`)
                  : (proximasTarefas.tarefas.length === 0 ? 'Nada pendente' : `${proximasTarefas.tarefas.length} pendente${proximasTarefas.tarefas.length !== 1 ? 's' : ''}`)}
              </Text>
            </View>
            <AppIcon name="chevron-forward" size={22} color={colors.primary} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); setShowConcluidasProximos(!showConcluidasProximos); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}>
              <AppIcon name={showConcluidasProximos ? 'list-outline' : 'checkmark-done-outline'} size={16} color={colors.primary} />
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>{showConcluidasProximos ? 'Ver pendentes' : 'Ver concluídas'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAddModal?.('tarefa', null); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Criar tarefa</Text>
            </TouchableOpacity>
          </View>
          {(showConcluidasProximos ? proximasTarefas.concluidas : proximasTarefas.tarefas).length === 0 ? (
            <Text style={{ fontSize: 14, color: colors.textSecondary, paddingLeft: 4 }}>
              {showConcluidasProximos ? 'Nenhuma tarefa concluída' : 'Nenhuma tarefa pendente'}
            </Text>
          ) : (
            (showConcluidasProximos ? proximasTarefas.concluidas : proximasTarefas.tarefas).map((t) => (
              <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 26, borderLeftWidth: 3, borderLeftColor: colors.primary + '40', marginLeft: 4, marginBottom: 4 }}>
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
            ))
          )}
        </GlassCard>
      </TouchableOpacity>
    ),
    agendamentos: taskCardBase(
      'calendar-outline',
      (showEmpresaFeatures && viewMode === 'empresa') ? 'Próximos atendimentos' : 'Próximos eventos',
      proximasTarefas.agendas.length === 0
        ? ((showEmpresaFeatures && viewMode === 'empresa') ? 'Seus atendimentos agendados' : 'Seus eventos agendados nos próximos dias')
        : `${proximasTarefas.agendas.length} ${(showEmpresaFeatures && viewMode === 'empresa') ? 'atendimento' : 'evento'}${proximasTarefas.agendas.length !== 1 ? 's' : ''} nos próximos dias`,
      proximasTarefas.agendas,
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
      (showEmpresaFeatures && viewMode === 'empresa') ? 'Nenhum atendimento agendado' : 'Nenhum evento agendado',
      (
        <View key="criar-evento" style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
          <TouchableOpacity onPress={(ev) => { ev?.stopPropagation?.(); playTapSound(); openAddModal?.('agenda', null); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}>
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Criar evento</Text>
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
                <Text style={[ds.carouselText, { color: 'rgba(255,255,255,0.95)' }]}>{item.text}</Text>
              </View>
            );
            return item.onPress === 'orcamento' ? (
              <TouchableOpacity key={item.id} onPress={() => { playTapSound(); openOrcamento?.(); }} activeOpacity={0.9} style={{ width: CARD_WIDTH + 16 }}>
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
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
              <AppIcon name={quoteType === 'motivacional' ? 'chatbubble-outline' : 'book-outline'} size={26} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
                {quoteType === 'motivacional' ? 'Frase do dia' : 'Versículo do dia'}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                {quoteType === 'motivacional' ? 'Citação motivacional' : 'Palavra de sabedoria'}
              </Text>
            </View>
          </View>
          <Text style={[ds.quoteText, { color: colors.text }]} numberOfLines={3}>"{quote}"</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, gap: 10 }}>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); playTapSound(); setQuoteType(quoteType === 'motivacional' ? 'verso' : 'motivacional'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '60' }}>
              <Ionicons name={quoteType === 'motivacional' ? 'book-outline' : 'chatbubble-outline'} size={18} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{quoteType === 'motivacional' ? 'Ver versículo' : 'Ver citação'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); playTapSound(); openImageGenerator?.({ quote, quoteType }); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.primary }}>
              <Ionicons name="share-social-outline" size={18} color="#fff" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Compartilhar frase</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </TouchableOpacity>
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
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
              <AppIcon name="document-text-outline" size={26} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>Minhas anotações</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                {notes.length === 0 ? 'Suas notas e lembretes' : `${notes.length} anotação${notes.length !== 1 ? 'ões' : ''}`}
              </Text>
            </View>
            <AppIcon name="chevron-forward" size={22} color={colors.primary} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openAnotacoes?.({ create: true }); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '50' }}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Criar anotação</Text>
            </TouchableOpacity>
          </View>
          {notes.length === 0 ? (
            <Text style={{ fontSize: 14, color: colors.textSecondary, paddingLeft: 4 }}>Nenhuma anotação ainda</Text>
          ) : (
            notes.slice(0, 5).map((n) => (
              <View key={n.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 26, borderLeftWidth: 3, borderLeftColor: colors.primary + '40', marginLeft: 4, marginBottom: 4 }}>
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
            ))
          )}
        </GlassCard>
      </TouchableOpacity>
    ),
    balance: (
      <View key="balance">
        <BalanceCard
          balance={balance}
          income={income}
          expense={expense}
          formatCurrency={fmt}
          mask={mask}
          colors={colors}
          lightBackground={themeMode === 'light'}
          filter={balanceFilter}
          filterLabel={balanceFilterLabel}
          filterStartDate={periodStart}
          filterEndDate={periodEnd}
          onFilterChange={(f) => { playTapSound(); setBalanceFilter(f); setBalanceFilterDate(new Date()); }}
          onFilterDatePrev={() => { playTapSound(); adjustBalanceFilterDate(-1); }}
          onFilterDateNext={() => { playTapSound(); adjustBalanceFilterDate(1); }}
          onFilterPeriodChange={(start, end) => { setPeriodStart(start); setPeriodEnd(end); }}
          showValues={showValues}
          onToggleValues={() => { playTapSound(); toggleValues(); }}
        />
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
        />
      </View>
    ),
    gastos: (
      <View key="gastos" style={ds.section}>
        <GastosPorCategoriaCard
          catBreakdown={catBreakdown}
          totalExpense={expense}
          formatCurrency={fmt}
          mask={mask}
          colors={colors}
          title="Gastos por categoria"
        />
      </View>
    ),
    transacoes: (
      <View key="transacoes" style={ds.section}>
        <TransacoesCard
          transactions={monthTx}
          formatCurrency={fmt}
          mask={mask}
          colors={colors}
          title="Últimas transações"
        />
      </View>
    ),
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <TopBar title="Início" colors={colors} useLogoImage hideOrganize onManageCards={() => setShowCardPicker(true)} onCalculadora={openCalculadoraFull} />
      {canToggleView && <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} colors={colors} />}
      {isGuest && (
        <View style={{ marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: colors.primaryRgba(0.2), borderWidth: 1, borderColor: colors.primary + '60', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
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
      />
    </SafeAreaView>
  );
}
