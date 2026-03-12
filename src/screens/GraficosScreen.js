import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { TopBar } from '../components/TopBar';
import { GlassCard } from '../components/GlassCard';
import { ViewModeToggle } from '../components/ViewModeToggle';
import { PieChart } from '../components/charts/PieChart';
import { BarChartReceitasDespesas } from '../components/charts/BarChartReceitasDespesas';
import { LineChartSaldo } from '../components/charts/LineChartSaldo';
import { getCategoryColor } from '../constants/colors';
import { formatCurrency } from '../utils/format';

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
  const { transactions } = useFinance();
  const { colors } = useTheme();
  const { viewMode, setViewMode, canToggleView } = usePlan();
  const [rangeMonths, setRangeMonths] = useState(6);
  const now = new Date();

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
          <GlassCard colors={colors} style={ds.card}>
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

          {/* Receitas vs Despesas - barras + filtro 3m/6m/12m */}
          <GlassCard colors={colors} style={ds.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[ds.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Receitas vs Despesas</Text>
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
            </View>
            <BarChartReceitasDespesas monthlyData={monthlyData} colors={colors} />
          </GlassCard>

          {/* Evolução do Saldo Mensal */}
          <GlassCard colors={colors} style={ds.card}>
            <LineChartSaldo monthlyData={monthlyData} colors={colors} />
          </GlassCard>

          {/* Gráfico de pizza */}
          <GlassCard colors={colors} style={[ds.card, { alignItems: 'center', justifyContent: 'center' }]}>
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
          <GlassCard colors={colors} style={ds.card}>
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
