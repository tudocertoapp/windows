import React from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import { formatCurrency } from '../utils/format';
import { dedupeBoletos } from '../utils/boletoDates';

export function computeFaturasResumo(boletosList) {
  const list = dedupeBoletos(Array.isArray(boletosList) ? boletosList : []);
  let totalGeral = 0;
  let totalPago = 0;
  let totalAberto = 0;
  const gruposMap = {};

  for (const b of list) {
    const amt = Number(b.amount) || 0;
    totalGeral += amt;
    if (b.paid) totalPago += amt;
    else totalAberto += amt;

    const label = (b.name || '').trim() || 'Sem descrição';
    const key = label.toLowerCase();
    if (!gruposMap[key]) {
      gruposMap[key] = { name: label, count: 0, total: 0, amounts: [] };
    }
    gruposMap[key].count += 1;
    gruposMap[key].total += amt;
    gruposMap[key].amounts.push(amt);
  }

  const grupos = Object.values(gruposMap)
    .map((g) => {
      const uniq = [...new Set(g.amounts.map((a) => Number(a).toFixed(2)))];
      const unit = uniq.length === 1 ? Number(uniq[0]) : null;
      return { name: g.name, count: g.count, total: g.total, unit };
    })
    .sort((a, b) => b.total - a.total);

  return {
    count: list.length,
    totalGeral,
    totalPago,
    totalAberto,
    grupos,
  };
}

export function FaturasResumoPanel({
  boletosList,
  colors,
  showDetalhes,
  onToggleDetalhes,
  compact,
  pickMode = false,
  onTogglePickMode,
  filterTotal = 0,
  selectedCount = 0,
  onSelectAllInFilter,
  onClearSelection,
}) {
  const resumo = computeFaturasResumo(boletosList);
  const showPanel = pickMode || resumo.count > 0 || filterTotal > 0;
  if (!showPanel) return null;

  return (
    <View style={[s.wrap, { backgroundColor: colors.primaryRgba(0.08), borderColor: colors.border }, compact && { marginBottom: 8 }]}>
      <View style={s.headerRow}>
        <Text style={[s.title, { color: colors.text }]}>Resumo das faturas</Text>
        <View style={s.switchRow}>
          <Text style={[s.switchLabel, { color: colors.textSecondary }]}>Valores</Text>
          <Switch
            value={showDetalhes}
            onValueChange={onToggleDetalhes}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {onTogglePickMode ? (
        <>
          <View style={[s.pickRow, { borderTopColor: colors.border + '80' }]}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[s.pickLabel, { color: colors.text }]}>Escolher faturas</Text>
              <Text style={[s.pickHint, { color: colors.textSecondary }]}>
                {pickMode
                  ? 'Marque na lista quais entram na soma'
                  : 'Soma todas as faturas do filtro atual'}
              </Text>
            </View>
            <Switch
              value={pickMode}
              onValueChange={onTogglePickMode}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          {pickMode ? (
            <View style={s.pickActions}>
              <Text style={[s.pickCount, { color: colors.textSecondary }]}>
                {selectedCount} de {filterTotal} selecionada{selectedCount !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity
                onPress={onSelectAllInFilter}
                style={[s.pickBtn, { borderColor: colors.primary, backgroundColor: colors.primaryRgba(0.12) }]}
              >
                <Text style={[s.pickBtnText, { color: colors.primary }]}>Todas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClearSelection}
                style={[s.pickBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
              >
                <Text style={[s.pickBtnText, { color: colors.textSecondary }]}>Nenhuma</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      ) : null}

      {pickMode && resumo.count === 0 ? (
        <Text style={[s.emptyPick, { color: colors.textSecondary }]}>
          Nenhuma fatura selecionada — marque itens na lista abaixo.
        </Text>
      ) : null}

      {resumo.count > 0 && showDetalhes ? (
        <>
          <View style={s.totalsRow}>
            <View style={[s.totalBox, { borderColor: colors.border }]}>
              <Text style={[s.totalLabel, { color: colors.textSecondary }]}>Total</Text>
              <Text style={[s.totalValue, { color: colors.text }]}>{formatCurrency(resumo.totalGeral)}</Text>
              <Text style={[s.totalSub, { color: colors.textSecondary }]}>
                {resumo.count} fatura{resumo.count !== 1 ? 's' : ''}
                {pickMode ? ' selecionada' + (resumo.count !== 1 ? 's' : '') : ''}
              </Text>
            </View>
            <View style={[s.totalBox, { borderColor: colors.border }]}>
              <Text style={[s.totalLabel, { color: colors.textSecondary }]}>Pago</Text>
              <Text style={[s.totalValue, { color: '#10b981' }]}>{formatCurrency(resumo.totalPago)}</Text>
            </View>
            <View style={[s.totalBox, { borderColor: colors.border }]}>
              <Text style={[s.totalLabel, { color: colors.textSecondary }]}>A pagar</Text>
              <Text style={[s.totalValue, { color: '#ef4444' }]}>{formatCurrency(resumo.totalAberto)}</Text>
            </View>
          </View>
          {resumo.grupos.length > 0 && (
            <View style={s.grupos}>
              {resumo.grupos.slice(0, compact ? 3 : 6).map((g) => (
                <Text key={g.name} style={[s.grupoLine, { color: colors.textSecondary }]} numberOfLines={2}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>{g.name}</Text>
                  {g.unit != null && g.count > 1
                    ? ` · ${g.count}x ${formatCurrency(g.unit)} = ${formatCurrency(g.total)}`
                    : g.count > 1
                    ? ` · ${g.count} faturas = ${formatCurrency(g.total)}`
                    : ` · ${formatCurrency(g.total)}`}
                </Text>
              ))}
            </View>
          )}
        </>
      ) : resumo.count > 0 ? (
        <Text style={[s.compactLine, { color: colors.textSecondary }]}>
          {resumo.count} fatura{resumo.count !== 1 ? 's' : ''}
          {pickMode ? ' selecionada' + (resumo.count !== 1 ? 's' : '') : ''} · Total {formatCurrency(resumo.totalGeral)}
        </Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 13, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { fontSize: 11, fontWeight: '600' },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
  },
  pickLabel: { fontSize: 13, fontWeight: '600' },
  pickHint: { fontSize: 11, marginTop: 2, lineHeight: 16 },
  pickActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 4 },
  pickCount: { fontSize: 11, flex: 1, minWidth: 120 },
  pickBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  pickBtnText: { fontSize: 12, fontWeight: '700' },
  emptyPick: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  totalsRow: { flexDirection: 'row', gap: 8, marginBottom: 8, marginTop: 8 },
  totalBox: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 8, alignItems: 'center' },
  totalLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  totalValue: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  totalSub: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  grupos: { gap: 6 },
  grupoLine: { fontSize: 12, lineHeight: 18 },
  compactLine: { fontSize: 12, marginTop: 8 },
});
