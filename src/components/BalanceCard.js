import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppIcon } from './AppIcon';
import { CardHeader } from './CardHeader';
import { GlassCard } from './GlassCard';
import { playTapSound } from '../utils/sounds';
import { DatePickerInput } from './DatePickerInput';

const CARD_MARGIN_H = 16;
const CARD_MARGIN_TOP = 16;

const ds = StyleSheet.create({
  balanceCard: { marginHorizontal: CARD_MARGIN_H, marginTop: CARD_MARGIN_TOP, marginBottom: 0, padding: 20, borderRadius: 20 },
  balanceLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  balanceAmount: { fontSize: 28, fontWeight: '800', marginTop: 8 },
  balanceRow: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' },
  balanceBox: { flex: 1, minWidth: 70, borderRadius: 12, padding: 12 },
  boxLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  boxValue: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  filterTab: { flex: 1, minWidth: 50, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  filterTabText: { fontSize: 11, fontWeight: '600' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  periodoLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  periodoTouch: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalBox: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  modalRow: { marginBottom: 12 },
  modalLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  modalBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
});

function formatDateStr(d) {
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

export function BalanceCard({
  balance,
  income,
  expense,
  formatCurrency,
  mask,
  colors,
  iconColor,
  filter,
  filterLabel,
  filterStartDate,
  filterEndDate,
  onFilterChange,
  onFilterDatePrev,
  onFilterDateNext,
  onFilterPeriodChange,
  showValues,
  onToggleValues,
  lightBackground,
}) {
  const fmt = formatCurrency || ((v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`);
  const m = mask || ((v) => v);
  const accent = iconColor || colors.primary;
  const btnColor = colors.primary;
  const hasFilter = !!filter;
  const isPeriodo = filter === 'periodo';
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [tempStart, setTempStart] = useState(filterStartDate || formatDateStr(new Date(new Date().getFullYear(), 0, 1)));
  const [tempEnd, setTempEnd] = useState(filterEndDate || formatDateStr(new Date()));

  const applyPeriodo = () => {
    playTapSound();
    onFilterPeriodChange?.(tempStart, tempEnd);
    setShowPeriodModal(false);
  };

  return (
    <GlassCard
      colors={colors}
      solid
      style={ds.balanceCard}
      contentStyle={{ padding: 20 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, flexShrink: 1, minWidth: 0 }}>
          <CardHeader icon="wallet-outline" title="Saldo disponível" colors={colors} iconColor={iconColor || colors.primary} />
        </View>
        {onToggleValues && (
          <TouchableOpacity onPress={() => { playTapSound(); onToggleValues(); }} style={{ flexShrink: 0, padding: 4, marginLeft: 8 }}>
            <AppIcon name={showValues ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      <View style={{ marginTop: -4, marginBottom: 8 }}>
        <Text style={[ds.balanceAmount, { color: colors.text, fontSize: 24 }]}>{m(fmt(balance))}</Text>
      </View>
      {hasFilter && (
        <>
          <View style={ds.filterRow}>
            {['dia', 'mes', 'ano', 'periodo'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[ds.filterTab, { backgroundColor: filter === f ? btnColor + '40' : btnColor + '20' }]}
                onPress={() => { playTapSound(); onFilterChange?.(f); }}
              >
                <Text style={[ds.filterTabText, { color: colors.text }]}>{f === 'dia' ? 'Dia' : f === 'mes' ? 'Mês' : f === 'ano' ? 'Ano' : 'Período'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {isPeriodo ? (
            <TouchableOpacity style={[ds.periodoTouch, { backgroundColor: btnColor + '25' }]} onPress={() => { playTapSound(); setTempStart(filterStartDate || tempStart); setTempEnd(filterEndDate || tempEnd); setShowPeriodModal(true); }}>
              <Text style={[ds.periodoLabel, { color: colors.text }]}>{filterLabel}</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Toque para alterar</Text>
            </TouchableOpacity>
          ) : (
            <View style={ds.navRow}>
              <TouchableOpacity onPress={() => { playTapSound(); onFilterDatePrev?.(); }} style={{ padding: 6, borderRadius: 8, backgroundColor: btnColor + '30' }}>
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{filterLabel}</Text>
              <TouchableOpacity onPress={() => { playTapSound(); onFilterDateNext?.(); }} style={{ padding: 6, borderRadius: 8, backgroundColor: btnColor + '30' }}>
                <Ionicons name="chevron-forward" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      <View style={ds.balanceRow}>
        <View style={[ds.balanceBox, { backgroundColor: colors.primaryRgba?.(0.12) }]}>
          <Text style={[ds.boxLabel, { color: colors.textSecondary }]}>ENTRADA</Text>
          <Text style={[ds.boxValue, { color: colors.text }]}>+ {m(fmt(income))}</Text>
        </View>
        <View style={[ds.balanceBox, { backgroundColor: colors.primaryRgba?.(0.12) }]}>
          <Text style={[ds.boxLabel, { color: colors.textSecondary }]}>SAÍDA</Text>
          <Text style={[ds.boxValue, { color: colors.expense || '#dc2626' }]}>- {m(fmt(expense))}</Text>
        </View>
        <View style={[ds.balanceBox, { backgroundColor: colors.primaryRgba?.(0.12) }]}>
          <Text style={[ds.boxLabel, { color: colors.textSecondary }]}>SALDO</Text>
          <Text style={[ds.boxValue, { color: balance >= 0 ? accent : '#dc2626' }]}>{m(fmt(balance))}</Text>
        </View>
      </View>

      <Modal visible={showPeriodModal} transparent animationType="fade">
        <TouchableOpacity style={ds.modalOverlay} activeOpacity={1} onPress={() => setShowPeriodModal(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[ds.modalBox, { backgroundColor: colors.card }]}>
            <Text style={[ds.modalTitle, { color: colors.text }]}>Filtrar por período</Text>
            <View style={ds.modalRow}>
              <Text style={[ds.modalLabel, { color: colors.textSecondary }]}>Data inicial</Text>
              <DatePickerInput value={tempStart} onChange={setTempStart} colors={colors} placeholder="01/01/2025" />
            </View>
            <View style={ds.modalRow}>
              <Text style={[ds.modalLabel, { color: colors.textSecondary }]}>Data final</Text>
              <DatePickerInput value={tempEnd} onChange={setTempEnd} colors={colors} placeholder="03/02/2026" />
            </View>
            <TouchableOpacity style={[ds.modalBtn, { backgroundColor: btnColor }]} onPress={applyPeriodo}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Aplicar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ds.modalBtn, { backgroundColor: colors.border }]} onPress={() => setShowPeriodModal(false)}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </GlassCard>
  );
}
