import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActionSheetIOS, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../components/GlassCard';
import { formatCurrency } from '../../utils/format';
import { playTapSound } from '../../utils/sounds';

const STATUS_LABEL = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aceito: 'Aceito',
  recusado: 'Recusado',
  faturado: 'Faturado',
};
const STATUS_COLOR = {
  rascunho: '#6b7280',
  enviado: '#3b82f6',
  aceito: '#22c55e',
  recusado: '#ef4444',
  faturado: '#8b5cf6',
};

function formatDate(str) {
  if (!str) return '—';
  const d = typeof str === 'string' && str.includes('T') ? new Date(str) : new Date(str);
  return isNaN(d.getTime()) ? str : d.toLocaleDateString('pt-BR');
}

export function OrcamentoItemRow({ orcamento, cliente, colors, onView, onEdit, onPdf, onFaturar }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusLabel = STATUS_LABEL[orcamento.status] || orcamento.status;
  const statusColor = STATUS_COLOR[orcamento.status] || colors.textSecondary;

  const handleAction = (action) => {
    setMenuOpen(false);
    playTapSound();
    if (action === 'view') onView?.();
    else if (action === 'edit') onEdit?.();
    else if (action === 'pdf') onPdf?.();
    else if (action === 'faturar') onFaturar?.();
  };

  return (
    <GlassCard colors={colors} style={[s.card, { borderColor: colors.border, marginBottom: 12 }]}>
      <TouchableOpacity activeOpacity={0.7} onPress={() => handleAction('view')} style={s.main}>
        <View style={s.header}>
          <Text style={[s.numero, { color: colors.primary }]}>{orcamento.numero || '—'}</Text>
          <View style={[s.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <Text style={[s.cliente, { color: colors.text }]} numberOfLines={1}>{cliente?.name || 'Sem cliente'}</Text>
        <View style={s.footer}>
          <Text style={[s.valor, { color: colors.primary }]}>{formatCurrency(orcamento.total || 0)}</Text>
          <Text style={[s.data, { color: colors.textSecondary }]}>{formatDate(orcamento.createdAt)}</Text>
        </View>
      </TouchableOpacity>
      <View style={s.actions}>
        <TouchableOpacity onPress={() => handleAction('view')} style={[s.actionBtn, { backgroundColor: colors.primaryRgba?.(0.15) }]}>
          <Ionicons name="eye-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
        {orcamento.status !== 'faturado' && (
          <TouchableOpacity onPress={() => handleAction('edit')} style={[s.actionBtn, { backgroundColor: colors.primaryRgba?.(0.15) }]}>
            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => handleAction('pdf')} style={[s.actionBtn, { backgroundColor: colors.primaryRgba?.(0.15) }]}>
          <Ionicons name="document-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
        {orcamento.status !== 'faturado' && (
          <TouchableOpacity onPress={() => handleAction('faturar')} style={[s.actionBtn, { backgroundColor: '#22c55e20' }]}>
            <Ionicons name="cash-outline" size={18} color="#22c55e" />
          </TouchableOpacity>
        )}
      </View>
    </GlassCard>
  );
}

const s = StyleSheet.create({
  card: { padding: 14 },
  main: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  numero: { fontSize: 15, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cliente: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  valor: { fontSize: 15, fontWeight: '700' },
  data: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  actionBtn: { padding: 8, borderRadius: 8 },
});
