import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { TopBar } from '../components/TopBar';
import { GlassCard } from '../components/GlassCard';
import { CardHeader } from '../components/CardHeader';
import { ViewModeToggle } from '../components/ViewModeToggle';
import { PieChart } from '../components/charts/PieChart';
import { BarChartReceitasDespesas } from '../components/charts/BarChartReceitasDespesas';
import { LineChartSaldo } from '../components/charts/LineChartSaldo';
import { getCategoryColor } from '../constants/colors';
import { CARD_ICON_COLORS } from '../constants/dashboardCards';
import { formatCurrency } from '../utils/format';
import { transactionMatchesViewMode } from '../utils/viewModeFilter';
import { buildOverviewKpis } from '../utils/overviewKpis';
import { KpiBarList } from '../components/charts/KpiBarList';

const ds = StyleSheet.create({
  monthText: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
});

const dns = StyleSheet.create({
  progressBar: { height: 20, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
});

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

export function GraficosScreen() {
  const { transactions, clients, products, services, agendaEvents, checkListItems, boletos } = useFinance();
  const { colors } = useTheme();
  const { viewMode, setViewMode, canToggleView, showEmpresaFeatures } = usePlan();
  const [rangeMonths, setRangeMonths] = useState(6);
  const now = new Date();

  const filteredTx = useMemo(() => {
    if (!canToggleView) return transactions;
    return transactions.filter((t) => transactionMatchesViewMode(t, viewMode));
  }, [transactions, viewMode, canToggleView]);

  const monthTx = useMemo(
    () =>
      filteredTx.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }),
    [filteredTx]
  );

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

  const catBreakdown = useMemo(() => {
    const m = {};
    monthTx.filter((t) => t.type === 'expense').forEach((t) => (m[t.category] = (m[t.category] || 0) + t.amount));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [monthTx]);

  const total = catBreakdown.reduce((s, [, a]) => s + a, 0);
  const maxVal = Math.max(...catBreakdown.map(([, a]) => a), 1);
  const fmt = formatCurrency;
  const PIE_SIZE = 200;
  const isEmpresaView = showEmpresaFeatures && viewMode === 'empresa';
  const overviewKpis = useMemo(() => {
    const inPeriod = (raw) => {
      if (!raw) return false;
      const date = raw instanceof Date ? new Date(raw) : new Date(raw);
      if (Number.isNaN(date.getTime())) {
        const parts = String(raw).trim().split(/[/\-]/);
        if (parts.length < 3) return false;
        const p = new Date(parseInt(parts[2], 10), (parseInt(parts[1], 10) || 1) - 1, parseInt(parts[0], 10) || 1);
        return p.getMonth() === now.getMonth() && p.getFullYear() === now.getFullYear();
      }
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    };
    const novosClientes = (clients || []).filter((c) => c.createdAt && inPeriod(c.createdAt)).length;
    const faturasPagas = (boletos || []).filter((b) => b.paid && inPeriod(b.dueDate || b.date || b.paidAt)).length;
    return buildOverviewKpis({
      isEmpresaView,
      monthTx,
      income,
      expense,
      formatCurrency: fmt,
      clients,
      products,
      services,
      agendaEvents,
      checkListItems,
      inPeriod,
      novosClientes,
      faturasPagas,
    });
  }, [isEmpresaView, monthTx, income, expense, fmt, clients, products, services, agendaEvents, checkListItems, boletos, now]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Gráficos" colors={colors} hideOrganize />
        {canToggleView && <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} colors={colors} />}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
          <Text style={[ds.monthText, { color: colors.textSecondary }]}>{now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</Text>
        </View>
        <View style={{ padding: 16, gap: 16 }}>
          {/* Resumo do mês */}
          <GlassCard colors={colors} solid style={ds.card}>
            <Text style={[ds.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Resumo do mês</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '40' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>RECEITAS</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: 4 }}>{fmt(income)}</Text>
              </View>
              <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>DESPESAS</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#ef4444', marginTop: 4 }}>{fmt(expense)}</Text>
              </View>
              <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: colors.border + '40', borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>SALDO</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: balance >= 0 ? colors.primary : '#ef4444', marginTop: 4 }}>{fmt(balance)}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 8 }}>
              {prevIncome > 0 || prevExpense > 0 ? `Mês anterior: +${fmt(prevIncome)} / -${fmt(prevExpense)}` : 'Sem dados do mês anterior'}
            </Text>
          </GlassCard>

          <GlassCard colors={colors} solid style={ds.card}>
            <CardHeader
              icon="pie-chart-outline"
              title="Entrando x saindo"
              subtitle={isEmpresaView ? 'Faturamento da empresa neste mês' : 'Seu dinheiro neste mês'}
              colors={colors}
              iconColor={CARD_ICON_COLORS.graficos}
            />
            {income + expense <= 0 ? (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 16 }}>Sem movimentação no mês</Text>
            ) : (
              <View style={{ alignItems: 'center', paddingTop: 8 }}>
                <PieChart
                  data={[['Entradas', Math.max(0, income)], ['Saídas', Math.max(0, expense)]]}
                  size={180}
                  colors={colors}
                  colorMap={{ Entradas: '#10b981', Saídas: '#ef4444' }}
                />
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
                  <Text style={{ fontSize: 12, color: '#10b981', fontWeight: '700' }}>Entradas {fmt(income)}</Text>
                  <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '700' }}>Saídas {fmt(expense)}</Text>
                </View>
              </View>
            )}
          </GlassCard>

          <GlassCard colors={colors} solid style={ds.card}>
            <CardHeader
              icon="analytics-outline"
              title={isEmpresaView ? 'Cadastros e movimento da empresa' : 'Movimento pessoal'}
              subtitle={isEmpresaView ? 'Clientes, catálogo e atendimentos' : 'Lançamentos, eventos e tarefas'}
              colors={colors}
              iconColor={CARD_ICON_COLORS.graficos}
            />
            <KpiBarList items={overviewKpis.counts} colors={colors} />
          </GlassCard>

          {/* Receitas vs Despesas - barras + filtro 3m/6m/12m */}
          <GlassCard colors={colors} solid style={ds.card}>
            <CardHeader
              icon="bar-chart-outline"
              title="Receitas vs Despesas"
              subtitle="Últimos meses"
              colors={colors}
              iconColor={CARD_ICON_COLORS.graficos}
              rightActions={(
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[3, 6, 12].map((n) => (
                    <TouchableOpacity
                      key={n}
                      onPress={() => setRangeMonths(n)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: rangeMonths === n ? colors.primary : colors.border + '40',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: rangeMonths === n ? '#fff' : colors.textSecondary }}>{n}m</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
            <BarChartReceitasDespesas monthlyData={monthlyData} colors={colors} showTitle={false} />
          </GlassCard>

          {/* Evolução do Saldo Mensal */}
          <GlassCard colors={colors} solid style={ds.card}>
            <CardHeader icon="trending-up-outline" title="Evolução do Saldo Mensal" colors={colors} iconColor={CARD_ICON_COLORS.graficos} />
            <LineChartSaldo monthlyData={monthlyData} colors={colors} showTitle={false} />
          </GlassCard>

          {/* Gráfico de pizza */}
          <GlassCard colors={colors} solid style={[ds.card, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={[ds.sectionTitle, { color: colors.text, marginBottom: 16, alignSelf: 'center' }]}>Distribuição por categoria</Text>
            {catBreakdown.length === 0 ? (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 24 }}>Nenhuma despesa no mês</Text>
            ) : (
              <>
                <View style={{ alignSelf: 'center' }}>
                  <PieChart data={catBreakdown} size={PIE_SIZE} colors={colors} />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 16, gap: 8 }}>
                  {catBreakdown.map(([cat]) => (
                    <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                      <View style={[ds.catDot, { backgroundColor: getCategoryColor(cat) }]} />
                      <Text style={{ fontSize: 12, color: colors.text }}>{cat}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </GlassCard>

          {/* Barras horizontais por categoria */}
          <GlassCard colors={colors} solid style={ds.card}>
            <Text style={[ds.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Gastos por categoria</Text>
            {catBreakdown.length === 0 ? (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 16 }}>Nenhuma despesa no mês</Text>
            ) : (
              <>
                {catBreakdown.map(([cat, amount]) => {
                  const pct = total > 0 ? (amount / total) * 100 : 0;
                  const barW = total > 0 ? (amount / maxVal) * 100 : 0;
                  return (
                    <View key={cat} style={{ marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={[ds.catDot, { backgroundColor: getCategoryColor(cat) }]} />
                          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{cat}</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                          {fmt(amount)} ({pct.toFixed(0)}%)
                        </Text>
                      </View>
                      <View style={[dns.progressBar, { backgroundColor: colors.border }]}>
                        <View style={[dns.progressFill, { width: `${barW}%`, backgroundColor: getCategoryColor(cat) }]} />
                      </View>
                    </View>
                  );
                })}
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Total de despesas: {fmt(total)}</Text>
                </View>
              </>
            )}
          </GlassCard>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
