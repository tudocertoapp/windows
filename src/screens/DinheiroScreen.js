import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
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
import { PieChart } from '../components/charts/PieChart';
import { BarChartReceitasDespesas } from '../components/charts/BarChartReceitasDespesas';
import { LineChartSaldo } from '../components/charts/LineChartSaldo';
import { getCategoryColor } from '../constants/colors';
import { formatCurrency } from '../utils/format';
import { playTapSound } from '../utils/sounds';
import { CardPickerModal } from '../components/CardPickerModal';
import { CardExpandedModal } from '../components/CardExpandedModal';
import { DEFAULT_DINHEIRO_SECTIONS, DINHEIRO_CARD_TYPES } from '../constants/dashboardCards';

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
  const { transactions, boletos, checkListItems, agendaEvents, clients } = useFinance();
  const { colors, themeMode } = useTheme();
  const { viewMode, setViewMode, canToggleView, showEmpresaFeatures } = usePlan();
  const { banks, getBankName, getCardsByBankId } = useBanks();
  const { profile } = useProfile();
  const { openBancos, openCalculadoraFull, openMeusGastos, openMensagensWhatsApp } = useMenu();
  const { showValues, toggleValues } = useValuesVisibility();
  const [sectionOrder, setSectionOrder] = useState(DEFAULT_DINHEIRO_SECTIONS);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [dinheiroTab, setDinheiroTab] = useState('fluxo');
  const [expandedCard, setExpandedCard] = useState(null);
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
    AsyncStorage.getItem(DINHEIRO_SECTIONS_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const valid = DEFAULT_DINHEIRO_SECTIONS.filter((id) => (parsed || []).includes(id));
          const missing = DEFAULT_DINHEIRO_SECTIONS.filter((id) => !valid.includes(id));
          setSectionOrder(valid.length > 0 ? [...valid, ...missing] : DEFAULT_DINHEIRO_SECTIONS);
        } catch (_) {}
      }
    });
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(DINHEIRO_SECTIONS_KEY, JSON.stringify(sectionOrder));
  }, [sectionOrder]);
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
    bancos: (
      <View key="bancos" style={{ marginTop: 16 }}>
        <Text style={[dns.sectionTitle, { color: colors.textSecondary, paddingHorizontal: 16 }]}>BANCOS E CARTÕES</Text>
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
            <GlassCard colors={colors} style={[dns.card, { alignItems: 'center', marginHorizontal: 16 }]} contentStyle={{ paddingVertical: 20 }}>
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
          transactions={[...monthTx].sort((a, b) => new Date(b.date) - new Date(a.date))}
          formatCurrency={fmt}
          mask={mask}
          colors={colors}
          title={showEmpresaFeatures && viewMode === 'empresa' ? 'Fluxo de caixa' : 'Últimas transações'}
          onVerMais={() => { playTapSound(); setExpandedCard('transacoes'); }}
        />
      </View>
    ),
    graficos: (
          <View key="graficos" style={{ marginTop: 16, padding: 16, gap: 0 }}>
            <View style={{ marginBottom: 16 }}>
              <ResumoDoMesCard
                income={income}
                expense={expense}
                balance={balance}
                formatCurrency={fmt}
                mask={mask}
                colors={colors}
                vendas={resumoStats.vendas}
                agendas={resumoStats.agendas}
                tarefasConcluidas={resumoStats.tarefasConcluidas}
                novosClientes={resumoStats.novosClientes}
                faturasPagas={resumoStats.faturasPagas}
                prevIncome={prevIncome}
                prevExpense={prevExpense}
              />
            </View>
            <GlassCard colors={colors} style={[dns.card, dns.chartCard]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[dns.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Receitas vs Despesas</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[3, 6, 12].map((n) => (
                    <TouchableOpacity key={n} onPress={() => setRangeMonths(n)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: rangeMonths === n ? colors.primary : colors.border + '40' }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: rangeMonths === n ? '#fff' : colors.textSecondary }}>{n}m</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <BarChartReceitasDespesas monthlyData={monthlyData} colors={colors} />
            </GlassCard>
            <GlassCard colors={colors} style={[dns.card, dns.chartCard]}>
              <LineChartSaldo monthlyData={monthlyData} colors={colors} />
            </GlassCard>
            <GastosPorCategoriaCard
              catBreakdown={catExpenses}
              totalExpense={expense}
              formatCurrency={fmt}
              mask={mask}
              colors={colors}
              title="Gastos por categoria"
              subtitle="Distribuição das despesas por categoria"
            />
          </View>
    ),
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <TopBar
        title="Dinheiro"
        colors={colors}
        useLogoImage
        hideOrganize
        onManageCards={() => setShowCardPicker(true)}
        onCalculadora={openCalculadoraFull}
        onChat={openMeusGastos}
        onWhatsApp={showEmpresaFeatures ? openMensagensWhatsApp : undefined}
      />
      {canToggleView && <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} colors={colors} />}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, backgroundColor: colors.bg }}>
          <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1, color: colors.textSecondary }}>
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
          </Text>
        </View>
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
          <View key={tx.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryRgba(0.15), justifyContent: 'center', alignItems: 'center' }}>
              <AppIcon name={tx.type === 'income' ? 'trending-up-outline' : 'trending-down-outline'} size={18} color={tx.type === 'income' ? colors.primary : '#ef4444'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{tx.description}</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>{tx.category}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: tx.type === 'income' ? colors.primary : '#ef4444' }}>
              {tx.type === 'income' ? '+' : '-'}{mask(fmt(tx.amount))}
            </Text>
          </View>
        ))}
      </CardExpandedModal>
    </SafeAreaView>
  );
}
