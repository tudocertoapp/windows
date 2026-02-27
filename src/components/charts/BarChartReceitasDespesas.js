import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

const CHART_WIDTH = 280;
const CHART_HEIGHT = 160;
const PADDING = { left: 40, right: 16, top: 24, bottom: 28 };

export function BarChartReceitasDespesas({ monthlyData, colors }) {
  const n = Math.max(1, monthlyData.length);
  const barGroupTotal = (CHART_WIDTH - PADDING.left - PADDING.right) / n;
  const BAR_GAP = 4;
  const BAR_GROUP_WIDTH = Math.max(8, (barGroupTotal - BAR_GAP) / 2 - 2);

  const maxVal = Math.max(1, ...monthlyData.flatMap((m) => [m.income, m.expense]));
  const scale = (CHART_HEIGHT - PADDING.top - PADDING.bottom) / maxVal;
  const chartH = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const bars = [];
  monthlyData.forEach((m, i) => {
    const x = PADDING.left + i * barGroupTotal + 2;
    const hIncome = Math.max(0, m.income * scale);
    const hExpense = Math.max(0, m.expense * scale);
    bars.push(
      <Rect key={`${i}-i`} x={x} y={PADDING.top + chartH - hIncome} width={BAR_GROUP_WIDTH} height={hIncome} fill={colors.primary} rx={4} />,
      <Rect key={`${i}-e`} x={x + BAR_GROUP_WIDTH + BAR_GAP} y={PADDING.top + chartH - hExpense} width={BAR_GROUP_WIDTH} height={hExpense} fill="#ef4444" rx={4} />
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Receitas vs Despesas - Últimos meses</Text>
      </View>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
        {bars}
      </Svg>
      <View style={styles.labelsRow}>
        {monthlyData.map((m, i) => (
          <Text key={i} style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
            {m.label}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Receitas</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Despesas</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  header: { marginBottom: 8 },
  title: { fontSize: 14, fontWeight: '600' },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: PADDING.left - 8, marginTop: 4 },
  label: { fontSize: 10, width: 36, textAlign: 'center' },
  legend: { flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 12 },
});
