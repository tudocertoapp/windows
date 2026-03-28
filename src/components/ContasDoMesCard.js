import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CardHeader } from './CardHeader';
import { GlassCard } from './GlassCard';
import { AppIcon } from './AppIcon';
import { DatePickerInput } from './DatePickerInput';
import { scaleWebDesktop } from '../utils/platformLayout';

const CARD_MARGIN_H = 16;
const CARD_MARGIN_TOP = 16;

function formatDateStr(d) {
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

const ds = StyleSheet.create({
  card: { marginHorizontal: CARD_MARGIN_H, marginTop: CARD_MARGIN_TOP, marginBottom: 0, padding: 20, borderRadius: 20 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 12, marginTop: 16, flexWrap: 'wrap' },
  box: { flex: 1, minWidth: 90, borderRadius: 12, padding: 12 },
  boxLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  boxValue: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 6, marginTop: 12, marginBottom: 8, flexWrap: 'wrap' },
  filterTab: { flex: 1, minWidth: 50, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  filterTabText: { fontSize: 11, fontWeight: '600' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 8 },
  periodoTouch: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginBottom: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalBox: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  modalRow: { marginBottom: 12 },
  modalLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  modalBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
});

const iconBtnStyle = { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(37,99,235,0.15)', borderWidth: 1, borderColor: '#2563eb' + '50' };

export function ContasDoMesCard({
  contasPagas,
  contasAVencer,
  contasVencidas,
  formatCurrency,
  mask,
  colors,
  lightBackground,
  headerActions,
  iconColor,
  onOpenFaturas,
  onAddFatura,
  playTapSound,
  filter,
  filterLabel,
  filterStartDate,
  filterEndDate,
  onFilterChange,
  onFilterDatePrev,
  onFilterDateNext,
  onFilterPeriodChange,
  /** Quando true, remove margens externas (útil para grids no web). */
  noMargins,
  /** Web desktop Início: cabeçalho como os outros cards (ícone + botões; título na linha de baixo). */
  dashboardWebHeader,
}) {
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [tempStart, setTempStart] = useState(filterStartDate || formatDateStr(new Date(new Date().getFullYear(), 0, 1)));
  const [tempEnd, setTempEnd] = useState(filterEndDate || formatDateStr(new Date()));
  const hasFilter = !!filter;
  const isPeriodo = filter === 'periodo';
  const tap = playTapSound || (() => {});
  const applyPeriodo = () => {
    tap();
    onFilterPeriodChange?.(tempStart, tempEnd);
    setShowPeriodModal(false);
  };
  const fmt = formatCurrency || ((v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`);
  const m = mask || ((v) => v);
  const accent = iconColor || colors?.primary || '#2563eb';
  const btnColor = colors?.primary || '#2563eb';
  const pagas = contasPagas || { qty: 0, valor: 0 };
  const aVencer = contasAVencer || { qty: 0, valor: 0 };
  const vencidas = contasVencidas || { qty: 0, valor: 0 };
  const totalContas = pagas.qty + aVencer.qty + vencidas.qty;
  const webDesk = !!dashboardWebHeader;
  const cardPad = webDesk ? scaleWebDesktop(12, true) : 20;
  const headerIconBox = webDesk ? scaleWebDesktop(40, true) : 48;
  const headerIconSize = webDesk ? scaleWebDesktop(22, true) : 26;
  const actionBtnSize = webDesk ? scaleWebDesktop(26, true) : 40;
  const actionIconSize = webDesk ? scaleWebDesktop(17, true) : 24;
  const expandIconSize = webDesk ? scaleWebDesktop(16, true) : 22;
  const cardIconC = colors?.cardIconColor ?? iconColor ?? accent;
  const actionBtnStyle = useMemo(
    () => ({
      width: actionBtnSize,
      height: actionBtnSize,
      borderRadius: actionBtnSize / 2,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: btnColor + '26',
      borderWidth: 1,
      borderColor: btnColor + '50',
    }),
    [actionBtnSize, btnColor]
  );
  const boxLabelFs = webDesk ? scaleWebDesktop(10, true) : 9;
  const boxValueFs = webDesk ? scaleWebDesktop(13, true) : 14;
  const filterTabFs = webDesk ? scaleWebDesktop(11, true) : 11;
  const navMidFs = webDesk ? scaleWebDesktop(12, true) : 13;
  const chevronSz = webDesk ? scaleWebDesktop(18, true) : 18;
  return (
    <GlassCard
      colors={colors}
      solid
      style={[
        ds.card,
        noMargins && { marginHorizontal: 0, marginTop: 0 },
        noMargins && { flex: 1, minHeight: 0 },
        webDesk && { padding: cardPad, marginHorizontal: 0, marginTop: 0 },
      ]}
      contentStyle={{ ...(noMargins || webDesk ? { flex: 1, minHeight: 0 } : null) }}
    >
      {webDesk ? (
        <View style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <View
              style={{
                width: headerIconBox,
                height: headerIconBox,
                borderRadius: 14,
                backgroundColor: 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <AppIcon name="document-text-outline" size={headerIconSize} color={cardIconC} />
            </View>
            {(onOpenFaturas || onAddFatura) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {onAddFatura ? (
                  <TouchableOpacity onPress={() => { tap(); onAddFatura(); }} style={actionBtnStyle}>
                    <Ionicons name="add" size={actionIconSize} color={btnColor} />
                  </TouchableOpacity>
                ) : null}
                {onOpenFaturas ? (
                  <TouchableOpacity onPress={() => { tap(); onOpenFaturas(); }} style={actionBtnStyle}>
                    <AppIcon name="expand-outline" size={expandIconSize} color={btnColor} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors?.text }} numberOfLines={1}>
            Minhas faturas
          </Text>
          <Text style={{ fontSize: 11, color: colors?.textSecondary, marginTop: 2 }} numberOfLines={1}>
            Contas a pagar e vencidas
          </Text>
        </View>
      ) : (
        <CardHeader
          icon="document-text-outline"
          title="Minhas Faturas"
          subtitle="Contas a pagar e vencidas"
          colors={colors}
          iconColor={iconColor || '#2563eb'}
          rightActions={(onOpenFaturas || onAddFatura) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {onAddFatura && (
                <TouchableOpacity onPress={() => { tap(); onAddFatura(); }} style={[iconBtnStyle, { backgroundColor: btnColor + '26', borderColor: btnColor + '50' }]}>
                  <Ionicons name="add" size={24} color={btnColor} />
                </TouchableOpacity>
              )}
              {onOpenFaturas && (
                <TouchableOpacity onPress={() => { tap(); onOpenFaturas(); }} style={[iconBtnStyle, { backgroundColor: btnColor + '26', borderColor: btnColor + '50' }]}>
                  <AppIcon name="expand-outline" size={22} color={btnColor} />
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        />
      )}
      {hasFilter && (
        <>
          <View style={ds.filterRow}>
            {['dia', 'mes', 'ano', 'periodo'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[ds.filterTab, { backgroundColor: filter === f ? btnColor + '40' : btnColor + '20' }]}
                onPress={() => { tap(); onFilterChange?.(f); }}
              >
                <Text style={[ds.filterTabText, { color: colors?.text }]}>{f === 'dia' ? 'Dia' : f === 'mes' ? 'Mês' : f === 'ano' ? 'Ano' : 'Período'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {isPeriodo ? (
            <TouchableOpacity style={[ds.periodoTouch, { backgroundColor: btnColor + '25' }]} onPress={() => { tap(); setTempStart(filterStartDate || tempStart); setTempEnd(filterEndDate || tempEnd); setShowPeriodModal(true); }}>
              <Text style={[ds.filterTabText, { color: colors?.text, fontSize: filterTabFs }]}>{filterLabel}</Text>
              <Text style={{ fontSize: webDesk ? scaleWebDesktop(11, true) : 11, color: colors?.textSecondary, marginTop: 2 }}>Toque para alterar</Text>
            </TouchableOpacity>
          ) : (
            <View style={ds.navRow}>
              <TouchableOpacity onPress={() => { tap(); onFilterDatePrev?.(); }} style={{ padding: 6, borderRadius: 8, backgroundColor: btnColor + '30' }}>
                <Ionicons name="chevron-back" size={chevronSz} color={colors?.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: navMidFs, fontWeight: '600', color: colors?.text }}>{filterLabel}</Text>
              <TouchableOpacity onPress={() => { tap(); onFilterDateNext?.(); }} style={{ padding: 6, borderRadius: 8, backgroundColor: btnColor + '30' }}>
                <Ionicons name="chevron-forward" size={chevronSz} color={colors?.text} />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      {headerActions ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: webDesk ? 6 : 8, marginBottom: 12, width: '100%' }}>
          {headerActions}
        </View>
      ) : null}
      <View style={[ds.row, { marginTop: webDesk ? 8 : 12 }]}>
        <View style={[ds.box, { minWidth: '100%', marginBottom: 4, backgroundColor: colors.primaryRgba?.(0.12), padding: webDesk ? scaleWebDesktop(10, true) : 12 }]}>
          <Text style={[ds.boxLabel, { color: colors.textSecondary, fontSize: boxLabelFs }]}>TOTAL</Text>
          <Text style={[ds.boxValue, { color: colors.text, fontSize: boxValueFs }]}>{totalContas} {totalContas === 1 ? 'conta' : 'contas'}</Text>
        </View>
        <View style={[ds.box, { backgroundColor: colors.primaryRgba?.(0.12), padding: webDesk ? scaleWebDesktop(10, true) : 12 }]}>
          <Text style={[ds.boxLabel, { color: colors.textSecondary, fontSize: boxLabelFs }]}>PAGAS</Text>
          <Text style={[ds.boxValue, { color: colors.text, fontSize: boxValueFs }]}>{pagas.qty} · {m(fmt(pagas.valor))}</Text>
        </View>
        <View style={[ds.box, { backgroundColor: colors.primaryRgba?.(0.12), padding: webDesk ? scaleWebDesktop(10, true) : 12 }]}>
          <Text style={[ds.boxLabel, { color: colors.textSecondary, fontSize: boxLabelFs }]}>A VENCER</Text>
          <Text style={[ds.boxValue, { color: colors.text, fontSize: boxValueFs }]}>{aVencer.qty} · {m(fmt(aVencer.valor))}</Text>
        </View>
        <View style={[ds.box, { backgroundColor: colors.primaryRgba?.(0.12), padding: webDesk ? scaleWebDesktop(10, true) : 12 }]}>
          <Text style={[ds.boxLabel, { color: colors.textSecondary, fontSize: boxLabelFs }]}>VENCIDAS</Text>
          <Text style={[ds.boxValue, { color: lightBackground ? '#dc2626' : '#fecaca', fontSize: boxValueFs }]}>{vencidas.qty} · {m(fmt(vencidas.valor))}</Text>
        </View>
      </View>

      {hasFilter && (
        <Modal visible={showPeriodModal} transparent animationType="fade">
          <TouchableOpacity style={ds.modalOverlay} activeOpacity={1} onPress={() => setShowPeriodModal(false)}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[ds.modalBox, { backgroundColor: colors?.card }]}>
              <Text style={[ds.modalTitle, { color: colors?.text }]}>Filtrar por período</Text>
              <View style={ds.modalRow}>
                <Text style={[ds.modalLabel, { color: colors?.textSecondary }]}>Data inicial</Text>
                <DatePickerInput value={tempStart} onChange={setTempStart} colors={colors} placeholder="01/01/2025" />
              </View>
              <View style={ds.modalRow}>
                <Text style={[ds.modalLabel, { color: colors?.textSecondary }]}>Data final</Text>
                <DatePickerInput value={tempEnd} onChange={setTempEnd} colors={colors} placeholder="31/12/2025" />
              </View>
              <TouchableOpacity style={[ds.modalBtn, { backgroundColor: btnColor }]} onPress={applyPeriodo}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Aplicar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ds.modalBtn, { backgroundColor: colors?.border }]} onPress={() => setShowPeriodModal(false)}>
                <Text style={{ color: colors?.text, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </GlassCard>
  );
}
