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
import { TopBar } from '../components/TopBar';
import { ViewModeToggle } from '../components/ViewModeToggle';
import { BalanceCard } from '../components/BalanceCard';
import { ContasDoMesCard } from '../components/ContasDoMesCard';
import { TransacoesCard } from '../components/TransacoesCard';
import { GastosPorCategoriaCard } from '../components/GastosPorCategoriaCard';
import { GlassCard } from '../components/GlassCard';
import { DraggableCard } from '../components/DraggableCard';
import { CardPickerModal } from '../components/CardPickerModal';
import { CATEGORY_COLORS } from '../constants/colors';
import { formatCurrency } from '../utils/format';
import { playTapSound } from '../utils/sounds';
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
  const { transactions, checkListItems, agendaEvents, boletos, aReceber, updateCheckListItem, deleteCheckListItem, updateAgendaEvent, deleteAgendaEvent } = useFinance();
  const { colors } = useTheme();
  const { viewMode, setViewMode, canToggleView, showEmpresaFeatures } = usePlan();
  const { isGuest } = useAuth();
  const { openImageGenerator, openAReceber, openAddModal, openCadastro } = useMenu();
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
  const layoutsRef = useRef({});
  const [floatingId, setFloatingId] = useState(null);
  const now = new Date();
  const quote = getQuoteOfDay(quoteType);


  useEffect(() => {
    AsyncStorage.getItem(SECTIONS_ORDER_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          let filtered = Array.isArray(parsed)
            ? parsed.filter((id) => id !== 'agenda').map((id) => (id === 'tarefas' ? 'proximos' : id))
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

  const monthTx = useMemo(
    () =>
      filteredTx.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }),
    [filteredTx]
  );

  const income = useMemo(() => monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0), [monthTx]);
  const expense = useMemo(() => monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [monthTx]);
  const balance = income - expense;

  const contasStatus = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let pagas = { qty: 0, valor: 0 };
    let aVencer = { qty: 0, valor: 0 };
    let vencidas = { qty: 0, valor: 0 };
    const list = showEmpresaFeatures ? (boletos || []).filter((b) => (b.tipo || 'pessoal') === viewMode) : (boletos || []);
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
  }, [boletos, viewMode, showEmpresaFeatures]);

  const catBreakdown = useMemo(() => {
    const m = {};
    monthTx.filter((t) => t.type === 'expense').forEach((t) => (m[t.category] = (m[t.category] || 0) + t.amount));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [monthTx]);

  const fmt = formatCurrency;

  const carouselItems = [
    { id: '1', title: 'Gerencie suas finanças', text: 'Receitas, despesas e controle total em um só lugar.', icon: 'wallet-outline', color: '#10b981' },
    { id: '2', title: 'Faça upgrade do seu plano', text: 'Plano Empresa: CRM, produtos compostos e muito mais.', icon: 'rocket-outline', color: '#8b5cf6' },
    { id: '3', title: 'Indique e ganhe', text: 'Convide amigos e ganhe benefícios exclusivos.', icon: 'people-outline', color: '#f59e0b' },
    { id: '4', title: 'Novidade: Agenda com zoom', text: 'Zoom com os dedos na agenda para ver melhor seus eventos.', icon: 'calendar-outline', color: '#06b6d4' },
    { id: '5', title: 'Novidade: Cards personalizáveis', text: 'Toque no ícone de grade ao lado para gerenciar os cards do Início.', icon: 'grid-outline', color: '#ec4899' },
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

  const proximasTarefas = useMemo(() => {
    const tarefas = checkListItems.filter((t) => !t.checked).slice(0, 3);
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      const parts = dateStr.trim().split(/[/\-]/);
      if (parts.length < 3) return null;
      const day = parseInt(parts[0], 10) || 1;
      const month = (parseInt(parts[1], 10) || 1) - 1;
      const year = parseInt(parts[2], 10) || new Date().getFullYear();
      return new Date(year, month, day);
    };
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const agendas = agendaEvents
      .filter((e) => {
        const d = parseDate(e.date);
        return d && d >= hoje;
      })
      .sort((a, b) => {
        const da = parseDate(a.date) || new Date(9999);
        const db = parseDate(b.date) || new Date(9999);
        return da - db;
      })
      .slice(0, 3);
    return { tarefas, agendas };
  }, [checkListItems, agendaEvents]);

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

  const taskCardBase = (icon, title, subtitle, items, renderItem, emptyText) => (
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
        {items.length === 0 ? (
          <Text style={{ fontSize: 14, color: colors.textSecondary, paddingLeft: 4 }}>{emptyText}</Text>
        ) : (
          items.map((item) => renderItem(item))
        )}
      </GlassCard>
    </TouchableOpacity>
  );

  const sectionMap = {
    proximos: taskCardBase(
      'checkmark-done-outline',
      'Próximas tarefas',
      proximasTarefas.tarefas.length === 0 ? 'Nada pendente' : `${proximasTarefas.tarefas.length} pendente${proximasTarefas.tarefas.length !== 1 ? 's' : ''}`,
      proximasTarefas.tarefas,
      (t) => (
        <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 26, borderLeftWidth: 3, borderLeftColor: colors.primary + '40', marginLeft: 4, marginBottom: 4 }}>
          <Text style={{ fontSize: 15, color: colors.text, flex: 1 }} numberOfLines={1}>{t.title}</Text>
          <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); openCadastro?.('tarefas', { editItemId: t.id }); }} style={{ padding: 6 }}>
            <Ionicons name="pencil" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={(e) => { e?.stopPropagation?.(); playTapSound(); updateCheckListItem(t.id, { checked: true }); }} style={{ padding: 6 }}>
            <Ionicons name="checkmark-done" size={18} color="#10b981" />
          </TouchableOpacity>
          <TouchableOpacity onPress={(e) => {
            e?.stopPropagation?.();
            playTapSound();
            Alert.alert('Excluir', 'Quer realmente excluir esta tarefa?', [
              { text: 'Cancelar' },
              { text: 'Excluir', style: 'destructive', onPress: () => deleteCheckListItem(t.id) },
            ]);
          }} style={{ padding: 6 }}>
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ),
      'Nenhuma tarefa pendente'
    ),
    agendamentos: taskCardBase(
      'calendar-outline',
      'Próximos eventos',
      proximasTarefas.agendas.length === 0 ? 'Nada agendado' : `${proximasTarefas.agendas.length} evento${proximasTarefas.agendas.length !== 1 ? 's' : ''}`,
      proximasTarefas.agendas,
      (e) => (
        <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 26, borderLeftWidth: 3, borderLeftColor: colors.primary + '40', marginLeft: 4, marginBottom: 4 }}>
          <Text style={{ fontSize: 15, color: colors.text, flex: 1 }} numberOfLines={1}>{e.title}</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{e.date}</Text>
          <TouchableOpacity onPress={(ev) => { ev?.stopPropagation?.(); playTapSound(); openAddModal?.('agenda', { editingEvent: e }); }} style={{ padding: 6 }}>
            <Ionicons name="pencil" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={(ev) => { ev?.stopPropagation?.(); playTapSound(); updateAgendaEvent(e.id, { status: (e.status === 'concluido' ? 'pendente' : 'concluido') }); }} style={{ padding: 6 }}>
            <Ionicons name="checkmark-done" size={18} color="#10b981" />
          </TouchableOpacity>
          <TouchableOpacity onPress={(ev) => {
            ev?.stopPropagation?.();
            playTapSound();
            Alert.alert('Excluir', 'Quer realmente excluir este evento?', [
              { text: 'Cancelar' },
              { text: 'Excluir', style: 'destructive', onPress: () => deleteAgendaEvent(e.id) },
            ]);
          }} style={{ padding: 6 }}>
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ),
      'Nenhum evento agendado'
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
          renderItem={({ item }) => (
            <View style={[ds.carouselItem, { width: CARD_WIDTH, backgroundColor: item.color || colors.primary, borderColor: (item.color || colors.primary) + '80', overflow: 'hidden' }]}>
              <View style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.15)' }} />
              <View style={{ position: 'absolute', bottom: -30, left: -30, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <AppIcon name={item.icon} size={28} color="#fff" />
              </View>
              <Text style={[ds.carouselTitle, { color: '#fff' }]}>{item.title}</Text>
              <Text style={[ds.carouselText, { color: 'rgba(255,255,255,0.95)' }]}>{item.text}</Text>
            </View>
          )}
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
        <GlassCard colors={colors} style={[ds.quoteCard]}>
        <Text style={[ds.quoteText, { color: colors.text }]} numberOfLines={3}>"{quote}"</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, gap: 10 }}>
          <TouchableOpacity onPress={(e) => { e.stopPropagation(); setQuoteType(quoteType === 'motivacional' ? 'verso' : 'motivacional'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '60' }}>
            <Ionicons name={quoteType === 'motivacional' ? 'book-outline' : 'chatbubble-outline'} size={18} color={colors.primary} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{quoteType === 'motivacional' ? 'Ver versículo' : 'Ver citação'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={(e) => { e.stopPropagation(); openImageGenerator?.({ quote, quoteType }); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.primary }}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Compartilhar frase</Text>
          </TouchableOpacity>
        </View>
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
          colors={colors}
        />
      </View>
    ),
    contas: (
      <View key="contas" style={{ marginHorizontal: 16, marginTop: 16 }}>
        <ContasDoMesCard
          contasPagas={contasStatus.pagas}
          contasAVencer={contasStatus.aVencer}
          contasVencidas={contasStatus.vencidas}
          formatCurrency={fmt}
          colors={colors}
        />
      </View>
    ),
    gastos: (
      <View key="gastos" style={ds.section}>
        <Text style={[ds.sectionTitle, { color: colors.text }]}>Gastos por Categoria</Text>
        <GlassCard colors={colors} style={ds.card}>
          {catBreakdown.map(([cat, amount]) => {
            const pct = expense > 0 ? (amount / expense) * 100 : 0;
            return (
              <View key={cat} style={ds.catItem}>
                <View style={ds.catHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[ds.catDot, { backgroundColor: CATEGORY_COLORS[cat] || '#6b7280' }]} />
                    <Text style={[ds.catName, { color: colors.text }]}>{cat}</Text>
                  </View>
                  <Text style={[ds.catAmount, { color: colors.text }]}>{fmt(amount)}</Text>
                </View>
                <View style={[ds.progressBar, { backgroundColor: colors.border }]}>
                  <View style={[ds.progressFill, { width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat] || '#6b7280' }]} />
                </View>
              </View>
            );
          })}
        </GlassCard>
      </View>
    ),
    transacoes: (
      <View key="transacoes" style={ds.section}>
        <TransacoesCard
          transactions={monthTx}
          formatCurrency={fmt}
          colors={colors}
          title="Últimas transações"
        />
      </View>
    ),
    graficos: (
      <View key="graficos">
        <GlassCard colors={colors} style={[ds.card, { marginHorizontal: 16, marginTop: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
            <AppIcon name="stats-chart-outline" size={22} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Resumo do mês</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '40' }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary }}>RECEITAS</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 4 }}>{fmt(income)}</Text>
          </View>
          <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary }}>DESPESAS</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#ef4444', marginTop: 4 }}>{fmt(expense)}</Text>
          </View>
          <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: colors.border + '40', borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary }}>SALDO</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: balance >= 0 ? colors.primary : '#ef4444', marginTop: 4 }}>{fmt(balance)}</Text>
          </View>
        </View>
        </GlassCard>
      </View>
    ),
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <TopBar title="Início" colors={colors} useLogoImage hideOrganize onManageCards={() => setShowCardPicker(true)} />
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
