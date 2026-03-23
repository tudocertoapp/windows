import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppIcon } from '../components/AppIcon';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { useBanks } from '../contexts/BanksContext';
import { useProfile } from '../contexts/ProfileContext';
import { useMenu } from '../contexts/MenuContext';
import { useValuesVisibility } from '../contexts/ValuesVisibilityContext';
import { TopBar } from '../components/TopBar';
import { BanksCarousel } from '../components/BanksCarousel';
import { ViewModeToggle } from '../components/ViewModeToggle';
import { BalanceCard } from '../components/BalanceCard';
import { ContasDoMesCard } from '../components/ContasDoMesCard';
import { ResumoDoMesCard } from '../components/ResumoDoMesCard';
import { TransacoesCard } from '../components/TransacoesCard';
import { GastosPorCategoriaCard } from '../components/GastosPorCategoriaCard';
import { GlassCard } from '../components/GlassCard';
import { CardHeader } from '../components/CardHeader';
import { PieChart } from '../components/charts/PieChart';
import { BarChartReceitasDespesas } from '../components/charts/BarChartReceitasDespesas';
import { LineChartSaldo } from '../components/charts/LineChartSaldo';
import { getCategoryColor } from '../constants/colors';
import { formatCurrency } from '../utils/format';
import { playTapSound } from '../utils/sounds';
import { CardPickerModal } from '../components/CardPickerModal';
import { CardExpandedModal } from '../components/CardExpandedModal';
import { DEFAULT_DINHEIRO_SECTIONS, DEFAULT_DINHEIRO_SECTIONS_WEB, DINHEIRO_CARD_TYPES, CARD_ICON_COLORS } from '../constants/dashboardCards';
import { getLayoutStorageKey, getDefaultForPlatform } from '../utils/platformLayout';

const DINHEIRO_SECTIONS_KEY = '@tudocerto_dinheiro_sections';

function buildMonthlyData(transactions, monthsCount) {
  const now = new Date();
  const result = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthTx = transactions.filter((t) => {
      const dt = new Date(t.date);
      return dt.getMonth() === d.getMonth() && dt.getFullYear() === d.getFullYear();
    });
    const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
    result.push({ label, income, expense, balance: income - expense });
  }
  return result;
}

const dns = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: '700' },
  balanceCard: { margin: 16, padding: 20, borderRadius: 20 },
  balanceLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  balanceAmount: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 8 },
  balanceRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  balanceBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 },
  boxLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  boxValue: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 4 },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: { elevation: 2 },
  tabText: { fontSize: 12, fontWeight: '500' },
  section: { paddingHorizontal: 16, marginTop: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  chartCard: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  progressBarChart: { height: 20, borderRadius: 3, overflow: 'hidden' },
  bankCardMini: { borderRadius: 12, overflow: 'hidden', marginBottom: 4, minHeight: 64 },
  bankCardMiniInner: { padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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

function formatBankMoney(v) {
  const n = Number(v);
  if (isNaN(n)) return 'R$ 0,00';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const BANK_GRAD_PRESETS = [
  { id: 'verde', grad: ['#047857', '#10b981'] },
  { id: 'roxo', grad: ['#4338ca', '#818cf8'] },
  { id: 'vermelho', grad: ['#b91c1c', '#ef4444'] },
  { id: 'laranja', grad: ['#b45309', '#f59e0b'] },
  { id: 'violeta', grad: ['#5b21b6', '#a78bfa'] },
  { id: 'ciano', grad: ['#0e7490', '#22d3ee'] },
  { id: 'rosa', grad: ['#9d174d', '#ec4899'] },
  { id: 'azul', grad: ['#1d4ed8', '#60a5fa'] },
  { id: 'teal', grad: ['#0f766e', '#2dd4bf'] },
  { id: 'indigo', grad: ['#3730a3', '#818cf8'] },
];

function getBankGrad(bank) {
  if (bank?.cor) {
    const p = BANK_GRAD_PRESETS.find((x) => x.id === bank.cor);
    if (p) return p.grad;
  }
  return (bank?.tipo || 'pessoal') === 'empresa' ? ['#4338ca', '#6366f1'] : ['#059669', '#10b981'];
}


export function DinheiroScreen({ route }) {
  const isWeb = Platform.OS === 'web';
  const { transactions, boletos, checkListItems, agendaEvents, clients, deleteTransaction } = useFinance();
  const { colors, themeMode } = useTheme();
  const { viewMode, setViewMode, canToggleView, showEmpresaFeatures } = usePlan();
  const { banks, cards, addToBank, deductFromBank, deductFromCardBalance, getBankName, getCardsByBankId } = useBanks();
  const { profile } = useProfile();
  const { openBancos, openCalculadoraFull, openMeusGastos, openMensagensWhatsApp, openAddModal, openCadastro } = useMenu();
  const { showValues, toggleValues } = useValuesVisibility();
  const defaultDinheiroSections = getDefaultForPlatform(DEFAULT_DINHEIRO_SECTIONS, { web: DEFAULT_DINHEIRO_SECTIONS_WEB });
  const dinheiroStorageKey = getLayoutStorageKey(DINHEIRO_SECTIONS_KEY);
  const [sectionOrder, setSectionOrder] = useState(defaultDinheiroSections);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [dinheiroTab, setDinheiroTab] = useState('fluxo');
  const [expandedCard, setExpandedCard] = useState(null);
  const [faturasFiltroTipo, setFaturasFiltroTipo] = useState('todos');
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

  useEffect(() => {
    AsyncStorage.getItem(dinheiroStorageKey).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const valid = defaultDinheiroSections.filter((id) => (parsed || []).includes(id));
          const missing = defaultDinheiroSections.filter((id) => !valid.includes(id));
          setSectionOrder(valid.length > 0 ? [...valid, ...missing] : defaultDinheiroSections);
        } catch (_) {}
      }
    });
  }, [dinheiroStorageKey, defaultDinheiroSections]);
  useEffect(() => {
    AsyncStorage.setItem(dinheiroStorageKey, JSON.stringify(sectionOrder));
  }, [sectionOrder, dinheiroStorageKey]);
  useEffect(() => {
    if (route?.params?.openCardPicker) setShowCardPicker(true);
  }, [route?.params?.openCardPicker]);
  const [rangeMonths, setRangeMonths] = useState(6);
  const now = new Date();

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

  const handleDeleteTransaction = useCallback((tx) => {
    const amt = Number(tx?.amount) || 0;
    const tipo = tx?.tipoVenda || 'pessoal';
    const firstBank = (banks || []).find((b) => (b.tipo || 'pessoal') === tipo);
    const firstCard = firstBank ? (cards || []).find((c) => c.bankId === firstBank.id) : null;
    if (tx.type === 'expense' && amt > 0) {
      const fp = tx.formaPagamento || 'dinheiro';
      if ((fp === 'debito' || fp === 'pix' || fp === 'transferencia') && firstBank) addToBank(firstBank.id, amt);
      else if (fp === 'credito' && firstCard) deductFromCardBalance(firstCard.id, amt);
    } else if (tx.type === 'income' && amt > 0 && firstBank) {
      deductFromBank(firstBank.id, amt);
    }
    deleteTransaction(tx.id);
  }, [banks, cards, addToBank, deductFromBank, deductFromCardBalance, deleteTransaction]);

  const prevMonthTx = useMemo(() => {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1);
    return filteredTx.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear();
    });
  }, [filteredTx]);

  const monthlyData = useMemo(() => buildMonthlyData(filteredTx, rangeMonths), [filteredTx, rangeMonths]);

  const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const prevIncome = prevMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const prevExpense = prevMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const fmt = formatCurrency;
  const mask = (v) => (showValues ? v : '••••••');

  const catExpenses = useMemo(() => {
    const m = {};
    monthTx.filter((t) => t.type === 'expense').forEach((t) => (m[t.category] = (m[t.category] || 0) + t.amount));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [monthTx]);

  const total = catExpenses.reduce((s, [, a]) => s + a, 0);
  const maxVal = Math.max(...catExpenses.map(([, a]) => a), 1);
  const PIE_SIZE = 200;

  const filteredBanks = useMemo(() => {
    if (!canToggleView) return banks.filter((b) => (b.tipo || 'pessoal') === 'pessoal');
    return banks.filter((b) => (b.tipo || 'pessoal') === viewMode);
  }, [banks, viewMode, canToggleView]);

  const carouselBanks = useMemo(() => filteredBanks.slice(0, 8), [filteredBanks]);

  const contasStatus = useMemo(() => {
    const ref = balanceFilterDate;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let pagas = { qty: 0, valor: 0 };
    let aVencer = { qty: 0, valor: 0 };
    let vencidas = { qty: 0, valor: 0 };
    let list = showEmpresaFeatures ? (boletos || []).filter((b) => {
      const tipo = b.tipo || 'pessoal';
      if (faturasFiltroTipo === 'todos') return true;
      return tipo === faturasFiltroTipo;
    }) : (boletos || []);
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
  }, [boletos, faturasFiltroTipo, showEmpresaFeatures, balanceFilter, balanceFilterDate, periodStart, periodEnd, parseDateStr]);

  const resumoStats = useMemo(() => {
    const ref = balanceFilterDate;
    const parseAgendaDate = (str) => {
      if (!str) return null;
      const parts = String(str).trim().split(/[/\-]/);
      if (parts.length < 3) return null;
      const day = parseInt(parts[0], 10) || 1;
      const month = (parseInt(parts[1], 10) || 1) - 1;
      const year = parseInt(parts[2], 10) || new Date().getFullYear();
      return new Date(year, month, day);
    };
    const inPeriod = (d) => {
      if (!d) return false;
      const date = d instanceof Date ? d : (typeof d === 'string' ? parseAgendaDate(d) || new Date(d) : new Date(d));
      date.setHours(0, 0, 0, 0);
      if (balanceFilter === 'periodo') {
        const start = parseDateStr(periodStart);
        const end = parseDateStr(periodEnd);
        if (!start || !end) return true;
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return date >= start && date <= end;
      }
      if (balanceFilter === 'dia') return date.getDate() === ref.getDate() && date.getMonth() === ref.getMonth() && date.getFullYear() === ref.getFullYear();
      if (balanceFilter === 'mes') return date.getMonth() === ref.getMonth() && date.getFullYear() === ref.getFullYear();
      return date.getFullYear() === ref.getFullYear();
    };
    const vendas = monthTx.filter((t) => t.type === 'income').length;
    const agendas = (agendaEvents || []).filter((e) => inPeriod(e.date)).length;
    const tarefasConcluidas = (checkListItems || []).filter((t) => t.checked).length;
    const novosClientes = (clients || []).filter((c) => c.createdAt && inPeriod(new Date(c.createdAt))).length;
    const faturasPagas = contasStatus.pagas.qty;
    return { vendas, agendas, tarefasConcluidas, novosClientes, faturasPagas };
  }, [monthTx, agendaEvents, checkListItems, clients, contasStatus.pagas.qty, balanceFilter, balanceFilterDate, periodStart, periodEnd, parseDateStr]);

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

  const sectionContent = {
    balance: (
      <View key="balance">
        <BalanceCard
          iconColor={CARD_ICON_COLORS.balance}
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
          onFilterChange={(f) => { setBalanceFilter(f); setBalanceFilterDate(new Date()); }}
          onFilterDatePrev={() => adjustBalanceFilterDate(-1)}
          onFilterDateNext={() => adjustBalanceFilterDate(1)}
          onFilterPeriodChange={(start, end) => { setPeriodStart(start); setPeriodEnd(end); }}
          showValues={showValues}
          onToggleValues={() => { playTapSound(); toggleValues(); }}
        />
      </View>
    ),
    contas: (
      <View key="contas">
        <ContasDoMesCard
          iconColor={CARD_ICON_COLORS.contas}
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
          headerActions={showEmpresaFeatures ? (
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
          ) : null}
        />
      </View>
    ),
    bancos: (
      <View key="bancos" style={{ marginTop: 16, paddingHorizontal: 16 }}>
        <Text style={[dns.sectionTitle, { color: colors.textSecondary }]}>BANCOS E CARTÕES</Text>
        <BanksCarousel
          banks={carouselBanks}
          getBankName={getBankName}
          getCardsByBankId={getCardsByBankId}
          getBankGrad={getBankGrad}
          profile={profile}
          formatBankMoney={formatBankMoney}
          showValues={showValues}
          onCardPress={openBancos}
          onEmptyPress={openBancos}
          emptyContent={
            <GlassCard colors={colors} solid style={[dns.card, { alignItems: 'center' }]} contentStyle={{ paddingVertical: 20 }}>
              <Ionicons name="wallet-outline" size={32} color={colors.textSecondary} />
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>Nenhum banco cadastrado</Text>
            </GlassCard>
          }
          dotActiveColor={colors.primary}
          dotInactiveColor={colors.textSecondary + '50'}
        />
        {filteredBanks.length > 0 && (
          <TouchableOpacity onPress={() => { playTapSound(); openBancos?.(); }} style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>Ver todos os bancos e cartões</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    gastos: (
      <View key="gastos" style={[dns.section, { marginTop: 16 }]}>
        <GastosPorCategoriaCard
          iconColor={CARD_ICON_COLORS.gastos}
          catBreakdown={catExpenses}
          totalExpense={expense}
          formatCurrency={fmt}
          mask={mask}
          colors={colors}
          title="Gastos por categoria"
        />
      </View>
    ),
    transacoes: (
      <View key="transacoes" style={{ marginHorizontal: 16, marginTop: 16 }}>
        <TransacoesCard
          iconColor={CARD_ICON_COLORS.transacoes}
          transactions={[...monthTx].sort((a, b) => new Date(b.date) - new Date(a.date))}
          formatCurrency={fmt}
          mask={mask}
          colors={colors}
          title={showEmpresaFeatures && viewMode === 'empresa' ? 'Fluxo de caixa' : 'Últimas transações'}
          onVerMais={() => { playTapSound(); setExpandedCard('transacoes'); }}
          onEdit={(tx) => { openAddModal?.(tx.type === 'income' ? 'receita' : 'despesa', { editTransaction: tx }); }}
          onDelete={handleDeleteTransaction}
          playTapSound={playTapSound}
          deleteLabel={showEmpresaFeatures && viewMode === 'empresa' ? 'Cancelar' : 'Excluir'}
          deleteMessage={showEmpresaFeatures && viewMode === 'empresa' ? 'Cancelar esta transação? O valor será devolvido.' : 'Excluir esta transação? O valor será devolvido ao saldo.'}
        />
      </View>
    ),
    graficos: (
          <View key="graficos" style={{ marginTop: 16, paddingHorizontal: 16, gap: 0 }}>
            <View style={{ marginBottom: 16 }}>
              <ResumoDoMesCard
                iconColor={CARD_ICON_COLORS.graficos}
                income={income}
                expense={expense}
                balance={balance}
                formatCurrency={fmt}
                mask={mask}
                colors={colors}
                vendas={resumoStats.vendas}
                agendas={resumoStats.agendas}
                novosClientes={resumoStats.novosClientes}
                faturasPagas={resumoStats.faturasPagas}
                prevIncome={prevIncome}
                prevExpense={prevExpense}
              />
            </View>
            <View style={{ marginBottom: 16 }}>
              <GastosPorCategoriaCard
                iconColor={CARD_ICON_COLORS.gastos}
                catBreakdown={catExpenses}
                totalExpense={expense}
                formatCurrency={fmt}
                mask={mask}
                colors={colors}
                title="Gastos por categoria"
                subtitle="Distribuição das despesas por categoria"
              />
            </View>
            <GlassCard colors={colors} solid style={[dns.card, dns.chartCard]}>
              <CardHeader
                icon="bar-chart-outline"
                title="Receitas vs Despesas"
                subtitle="Últimos meses"
                colors={colors}
                iconColor={CARD_ICON_COLORS.graficos}
                rightActions={(
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {[3, 6, 12].map((n) => (
                      <TouchableOpacity key={n} onPress={() => setRangeMonths(n)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: rangeMonths === n ? colors.primary : colors.border + '40' }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: rangeMonths === n ? '#fff' : colors.textSecondary }}>{n}m</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
              <BarChartReceitasDespesas monthlyData={monthlyData} colors={colors} showTitle={false} />
            </GlassCard>
            <GlassCard colors={colors} solid style={[dns.card, dns.chartCard]}>
              <CardHeader icon="trending-up-outline" title="Evolução do Saldo Mensal" colors={colors} iconColor={CARD_ICON_COLORS.graficos} />
              <LineChartSaldo monthlyData={monthlyData} colors={colors} showTitle={false} />
            </GlassCard>
          </View>
    ),
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      {(() => {
        const showInlineToggle = isWeb && canToggleView;
        return (
      <TopBar
        title="Dinheiro"
        colors={colors}
        useLogoImage
        hideOrganize
        inlineToggle={showInlineToggle ? <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} colors={colors} inline /> : null}
        onManageCards={() => setShowCardPicker(true)}
        onCalculadora={openCalculadoraFull}
        onChat={openMeusGastos}
        onWhatsApp={showEmpresaFeatures ? openMensagensWhatsApp : undefined}
      />
        );
      })()}
      {!(isWeb && canToggleView) && canToggleView && <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} colors={colors} />}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, backgroundColor: colors.bg }}>
          <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1, color: colors.textSecondary }}>
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
          </Text>
        </View>
        {isWeb ? (
          <>
            {sectionContent.balance}
            {sectionContent.contas}
            <View style={[dns.tabBar, { backgroundColor: colors.border + '40', marginTop: 16, marginHorizontal: 16 }]}>
              {[
                { id: 'fluxo', label: 'Fluxo de caixa' },
                { id: 'graficos', label: 'Gráficos' },
                { id: 'bancos', label: 'Bancos e cartões' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => { playTapSound(); setDinheiroTab(t.id); }}
                  style={[
                    dns.tab,
                    dinheiroTab === t.id && { backgroundColor: colors.primary },
                    dinheiroTab === t.id && dns.tabActive,
                  ]}
                >
                  <Text style={[dns.tabText, { color: dinheiroTab === t.id ? '#fff' : colors.textSecondary }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {dinheiroTab === 'fluxo' && sectionContent.transacoes}
            {dinheiroTab === 'graficos' && sectionContent.graficos}
            {dinheiroTab === 'bancos' && sectionContent.bancos}
          </>
        ) : (
          <>
            {sectionContent.balance}
            {sectionContent.contas}
            <View style={[dns.tabBar, { backgroundColor: colors.border + '40', marginTop: 16, marginHorizontal: 16 }]}>
              {[
                { id: 'fluxo', label: 'Fluxo de caixa' },
                { id: 'graficos', label: 'Gráficos' },
                { id: 'bancos', label: 'Bancos e cartões' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => { playTapSound(); setDinheiroTab(t.id); }}
                  style={[
                    dns.tab,
                    dinheiroTab === t.id && { backgroundColor: colors.primary },
                    dinheiroTab === t.id && dns.tabActive,
                  ]}
                >
                  <Text style={[dns.tabText, { color: dinheiroTab === t.id ? '#fff' : colors.textSecondary }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {dinheiroTab === 'fluxo' && sectionContent.transacoes}
            {dinheiroTab === 'graficos' && sectionContent.graficos}
            {dinheiroTab === 'bancos' && sectionContent.bancos}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
      <CardPickerModal
        visible={showCardPicker}
        onClose={() => setShowCardPicker(false)}
        visibleIds={sectionOrder}
        onReorder={(order) => setSectionOrder(order)}
        cardTypes={DINHEIRO_CARD_TYPES}
      />
      <CardExpandedModal
        visible={expandedCard === 'transacoes'}
        onClose={() => { playTapSound(); setExpandedCard(null); }}
        title={showEmpresaFeatures && viewMode === 'empresa' ? 'Fluxo de caixa' : 'Últimas transações'}
      >
        {[...monthTx].sort((a, b) => new Date(b.date) - new Date(a.date)).map((tx) => (
          <View key={tx.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: CARD_ICON_COLORS.transacoes + '26', justifyContent: 'center', alignItems: 'center' }}>
              <AppIcon name={tx.type === 'income' ? 'trending-up-outline' : 'trending-down-outline'} size={18} color={tx.type === 'income' ? CARD_ICON_COLORS.transacoes : '#ef4444'} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }} numberOfLines={1}>{tx.description}</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>{tx.category}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: tx.type === 'income' ? CARD_ICON_COLORS.transacoes : '#ef4444' }}>
              {tx.type === 'income' ? '+' : '-'}{mask(fmt(tx.amount))}
            </Text>
            <TouchableOpacity
              onPress={() => { playTapSound(); setExpandedCard(null); openAddModal?.(tx.type === 'income' ? 'receita' : 'despesa', { editTransaction: tx }); }}
              style={{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary + '26', borderWidth: 1, borderColor: colors.primary + '50', flexShrink: 0 }}
            >
              <Ionicons name="pencil" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                playTapSound();
                const labelExcluir = showEmpresaFeatures && viewMode === 'empresa' ? 'Cancelar' : 'Excluir';
                Alert.alert(labelExcluir, `${labelExcluir === 'Cancelar' ? 'Cancelar esta transação? O valor será devolvido.' : 'Excluir esta transação? O valor será devolvido ao saldo.'}`, [
                  { text: 'Não' },
                  { text: labelExcluir, style: 'destructive', onPress: () => handleDeleteTransaction(tx) },
                ]);
              }}
              style={{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryRgba(0.08), borderWidth: 1, borderColor: colors.border, flexShrink: 0 }}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}
      </CardExpandedModal>
    </SafeAreaView>
  );
}
