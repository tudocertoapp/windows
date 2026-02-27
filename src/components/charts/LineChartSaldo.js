import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

const CHART_WIDTH = 280;
const CHART_HEIGHT = 160;
const PADDING = { left: 40, right: 16, top: 24, bottom: 28 };

export function LineChartSaldo({ monthlyData, colors }) {
  const values = monthlyData.map((m) => m.balance);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const chartH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const scale = chartH / range;
  const stepX = (CHART_WIDTH - PADDING.left - PADDING.right) / Math.max(1, values.length - 1);

  const points = values.map((v, i) => {
    const x = PADDING.left + i * stepX;
    const y = PADDING.top + chartH - (v - min) * scale;
    return { x, y, v };
  });

  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Evolução do Saldo Mensal</Text>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
        <Path d={d} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.primary} />
        ))}
      </Svg>
      <View style={styles.labelsRow}>
        {monthlyData.map((m, i) => (
          <Text key={i} style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
            {m.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  title: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: PADDING.left - 8, marginTop: 4 },
  label: { fontSize: 10, width: 36, textAlign: 'center' },
});
