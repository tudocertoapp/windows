import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppIcon } from '../components/AppIcon';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { useBanks } from '../contexts/BanksContext';
import { useMenu } from '../contexts/MenuContext';
import { TopBar } from '../components/TopBar';
import { ViewModeToggle } from '../components/ViewModeToggle';
import { BalanceCard } from '../components/BalanceCard';
import { PieChart } from '../components/charts/PieChart';
import { BarChartReceitasDespesas } from '../components/charts/BarChartReceitasDespesas';
import { LineChartSaldo } from '../components/charts/LineChartSaldo';
import { CATEGORY_COLORS } from '../constants/colors';
import { formatCurrency } from '../utils/format';
import { playTapSound } from '../utils/sounds';

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
  bankToggle: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, gap: 8 },
  bankToggleBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, minWidth: 90, alignItems: 'center' },
  bankCardMini: { borderRadius: 12, overflow: 'hidden', marginBottom: 8, minHeight: 64 },
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

export function DinheiroScreen({ route }) {
  const { transactions, boletos } = useFinance();
  const { colors } = useTheme();
  const { viewMode, setViewMode, canToggleView, showEmpresaFeatures } = usePlan();
  const { banks, getBankName, getCardsByBankId } = useBanks();
  const { openBancos, openManageCards } = useMenu();
  const [showValues, setShowValues] = useState(true);
  const [bankFilterTipo, setBankFilterTipo] = useState('todos');
  const [tab, setTab] = useState(route?.params?.tab || 'resumo');
  useEffect(() => {
    if (route?.params?.tab) setTab(route.params.tab);
  }, [route?.params?.tab]);
  useEffect(() => {
    if (!showEmpresaFeatures && bankFilterTipo === 'empresa') setBankFilterTipo('pessoal');
  }, [showEmpresaFeatures]);
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
    if (bankFilterTipo === 'todos') return banks;
    return banks.filter((b) => (b.tipo || 'pessoal') === bankFilterTipo);
  }, [banks, bankFilterTipo]);

  const contasStatus = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let pagas = { qty: 0, valor: 0 };
    let aVencer = { qty: 0, valor: 0 };
    let vencidas = { qty: 0, valor: 0 };
    (boletos || []).forEach((b) => {
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
  }, [boletos]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <TopBar title="Início" colors={colors} useLogoImage onManageCards={openManageCards} />
        {canToggleView && <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} colors={colors} />}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[dns.header, { backgroundColor: colors.bg }]}>
          <View>
            <Text style={[dns.title, { color: colors.text }]}>Resumo do mês</Text>
          </View>
          <TouchableOpacity onPress={() => setShowValues(!showValues)}>
            <AppIcon name={showValues ? 'eye-outline' : 'eye-off-outline'} size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <BalanceCard
          balance={balance}
          income={income}
          expense={expense}
          contasPagas={contasStatus.pagas.qty > 0 ? contasStatus.pagas : null}
          contasAVencer={contasStatus.aVencer.qty > 0 ? contasStatus.aVencer : null}
          contasVencidas={contasStatus.vencidas.qty > 0 ? contasStatus.vencidas : null}
          formatCurrency={fmt}
          mask={mask}
          colors={colors}
        />
        <TouchableOpacity activeOpacity={1} onPress={() => { playTapSound(); openBancos?.(); }} style={{ marginTop: 16 }}>
          <Text style={[dns.sectionTitle, { color: colors.textSecondary, paddingHorizontal: 16 }]}>BANCOS E CARTÕES</Text>
          <View style={[dns.bankToggle, { backgroundColor: colors.bg }]}>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); playTapSound(); setBankFilterTipo('todos'); }}
              style={[dns.bankToggleBtn, { backgroundColor: bankFilterTipo === 'todos' ? colors.primary : colors.primaryRgba(0.12) }]}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: bankFilterTipo === 'todos' ? '#fff' : colors.text }}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); playTapSound(); setBankFilterTipo('pessoal'); }}
              style={[dns.bankToggleBtn, { backgroundColor: bankFilterTipo === 'pessoal' ? colors.primary : colors.primaryRgba(0.12) }]}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: bankFilterTipo === 'pessoal' ? '#fff' : colors.text }}>Pessoal</Text>
            </TouchableOpacity>
            {showEmpresaFeatures && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); playTapSound(); setBankFilterTipo('empresa'); }}
              style={[dns.bankToggleBtn, { backgroundColor: bankFilterTipo === 'empresa' ? '#6366f1' : 'rgba(99,102,241,0.2)' }]}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: bankFilterTipo === 'empresa' ? '#fff' : '#6366f1' }}>Empresa</Text>
            </TouchableOpacity>
            )}
          </View>
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            {filteredBanks.length === 0 ? (
              <View style={[dns.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', paddingVertical: 20 }]}>
                <Ionicons name="wallet-outline" size={32} color={colors.textSecondary} />
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>Nenhum banco cadastrado</Text>
              </View>
            ) : (
              filteredBanks.slice(0, 4).map((bank) => {
                const cards = getCardsByBankId(bank.id);
                const tipoConta = bank.tipoConta || 'ambos';
                const temDebito = tipoConta === 'debito' || tipoConta === 'ambos';
                const valor = temDebito ? (bank.saldo || 0) : cards.reduce((s, c) => s + (c.saldo || 0), 0);
                const grad = (bank.tipo || 'pessoal') === 'empresa' ? ['#4338ca', '#6366f1'] : ['#059669', '#10b981'];
                return (
                  <TouchableOpacity key={bank.id} activeOpacity={0.9} onPress={() => { playTapSound(); openBancos?.(); }} style={dns.bankCardMini}>
                    <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={dns.bankCardMiniInner}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }} numberOfLines={1}>{getBankName(bank)}</Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>{showValues ? formatBankMoney(valor) : '••••'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })
            )}
            {filteredBanks.length > 4 && (
              <TouchableOpacity onPress={() => { playTapSound(); openBancos?.(); }} style={{ alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>Ver todos ({filteredBanks.length})</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
        <View style={[dns.tabBar, { backgroundColor: colors.border, marginTop: 16 }]}>
          {['resumo', 'transacoes', 'graficos'].map((t) => (
            <TouchableOpacity key={t} style={[dns.tab, tab === t && { ...dns.tabActive, backgroundColor: colors.card }]} onPress={() => setTab(t)}>
              <Text style={[dns.tabText, tab !== t && { color: colors.textSecondary }, tab === t && { color: colors.text }]}>{t === 'resumo' ? 'Resumo' : t === 'transacoes' ? 'Transações' : 'Gráficos'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {tab === 'resumo' && (
          <View style={dns.section}>
            <View style={[dns.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {catExpenses.map(([cat, amount]) => {
                const pct = expense > 0 ? (amount / expense) * 100 : 0;
                return (
                  <View key={cat} style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CATEGORY_COLORS[cat] || '#6b7280' }} />
                        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>{cat}</Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{mask(fmt(amount))}</Text>
                    </View>
                    <View style={[dns.progressBar, { backgroundColor: colors.border }]}>
                      <View style={[dns.progressFill, { width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat] || '#6b7280' }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
        {tab === 'transacoes' && (
          <View style={dns.section}>
            <View style={[dns.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {monthTx.sort((a, b) => new Date(b.date) - new Date(a.date)).map((t) => (
                <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border, gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                    <AppIcon name={t.type === 'income' ? 'trending-up-outline' : 'trending-down-outline'} size={18} color={t.type === 'income' ? colors.primary : '#ef4444'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{t.description}</Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>{t.category}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: t.type === 'income' ? colors.primary : '#ef4444' }}>
                    {t.type === 'income' ? '+' : '-'}
                    {mask(fmt(t.amount))}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {tab === 'graficos' && (
          <View style={{ padding: 16, gap: 0 }}>
            <View style={[dns.card, dns.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[dns.sectionTitle, { color: colors.text }]}>Resumo do mês</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary + '40' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>RECEITAS</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: 4 }}>{mask(fmt(income))}</Text>
                </View>
                <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>DESPESAS</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#ef4444', marginTop: 4 }}>{mask(fmt(expense))}</Text>
                </View>
                <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: colors.border + '40', borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>SALDO</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: balance >= 0 ? colors.primary : '#ef4444', marginTop: 4 }}>{mask(fmt(balance))}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 8 }}>
                {prevIncome > 0 || prevExpense > 0 ? `Mês anterior: +${mask(fmt(prevIncome))} / -${mask(fmt(prevExpense))}` : 'Sem dados do mês anterior'}
              </Text>
            </View>
            <View style={[dns.card, dns.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
            </View>
            <View style={[dns.card, dns.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LineChartSaldo monthlyData={monthlyData} colors={colors} />
            </View>
            <View style={[dns.card, dns.chartCard, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center' }]}>
              <Text style={[dns.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Distribuição por categoria (pizza)</Text>
              {catExpenses.length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 24 }}>Nenhuma despesa no mês</Text>
              ) : (
                <>
                  <PieChart data={catExpenses} size={PIE_SIZE} colors={colors} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 16, gap: 8 }}>
                    {catExpenses.map(([cat]) => (
                      <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                        <View style={[dns.catDot, { backgroundColor: CATEGORY_COLORS[cat] || colors.primary }]} />
                        <Text style={{ fontSize: 12, color: colors.text }}>{cat}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
            <View style={[dns.card, dns.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[dns.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Gastos por categoria (barras)</Text>
              {catExpenses.length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 16 }}>Nenhuma despesa no mês</Text>
              ) : (
                <>
                  {catExpenses.map(([cat, amount]) => {
                    const pct = total > 0 ? (amount / total) * 100 : 0;
                    const barW = total > 0 ? (amount / maxVal) * 100 : 0;
                    return (
                      <View key={cat} style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={[dns.catDot, { backgroundColor: CATEGORY_COLORS[cat] || colors.primary }]} />
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{cat}</Text>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                            {mask(fmt(amount))} ({pct.toFixed(0)}%)
                          </Text>
                        </View>
                        <View style={[dns.progressBarChart, { backgroundColor: colors.border }]}>
                          <View style={[dns.progressFill, { width: `${barW}%`, backgroundColor: CATEGORY_COLORS[cat] || colors.primary }]} />
                        </View>
                      </View>
                    );
                  })}
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Total de despesas: {mask(fmt(total))}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
