import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function KpiBarList({ items = [], colors }) {
  const max = Math.max(1, ...items.map((i) => Number(i.value) || 0));
  if (!items.length) {
    return <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 12 }}>Sem dados neste período</Text>;
  }
  return (
    <View style={s.wrap}>
      {items.map((item) => {
        const v = Number(item.value) || 0;
        const pct = Math.max(4, (v / max) * 100);
        const color = item.color || colors.primary;
        return (
          <View key={item.id} style={s.row}>
            <View style={s.head}>
              <Text style={[s.label, { color: colors.text }]} numberOfLines={1}>{item.label}</Text>
              <Text style={[s.value, { color }]}>{item.display != null ? item.display : v}</Text>
            </View>
            <View style={[s.track, { backgroundColor: colors.border + '55' }]}>
              <View style={[s.fill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 12, paddingTop: 4 },
  row: { gap: 6 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  label: { fontSize: 13, fontWeight: '600', flex: 1 },
  value: { fontSize: 13, fontWeight: '800' },
  track: { height: 10, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
});
