import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../../contexts/FinanceContext';
import { useProfile } from '../../contexts/ProfileContext';
import { GlassCard } from '../../components/GlassCard';
import { formatCurrency } from '../../utils/format';
import { shareOrcamentoPdf, buildOrcamentoHtml } from '../../utils/orcamentoPdf';
import { openWhatsApp } from '../../utils/whatsapp';
import { playTapSound } from '../../utils/sounds';

const STATUS_LABEL = { rascunho: 'Rascunho', enviado: 'Enviado', aceito: 'Aceito', recusado: 'Recusado', faturado: 'Faturado' };

function formatDate(str) {
  if (!str) return '—';
  const d = typeof str === 'string' && str.includes('T') ? new Date(str) : new Date(str);
  return isNaN(d.getTime()) ? str : d.toLocaleDateString('pt-BR');
}

export function OrcamentoDetalheScreen({ orcamento, cliente, onBack, onEdit, onFaturar }) {
  const { colors } = useTheme();
  const { updateOrcamento } = useFinance();
  const { profile } = useProfile();
  const [loadingPdf, setLoadingPdf] = useState(false);

  const handlePdf = async () => {
    setLoadingPdf(true);
    try {
      await shareOrcamentoPdf(orcamento, cliente, profile);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    }
    setLoadingPdf(false);
  };

  const handlePrint = async () => {
    setLoadingPdf(true);
    try {
      const html = buildOrcamentoHtml(orcamento, cliente, profile);
      await Print.printAsync({ html });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível imprimir.');
    }
    setLoadingPdf(false);
  };

  const handleWhatsApp = () => {
    if (cliente?.phone) {
      playTapSound();
      openWhatsApp(cliente.phone, `Olá! Segue o orçamento ${orcamento.numero || ''}.`);
      handlePdf();
    } else {
      Alert.alert('Atenção', 'Cliente não possui telefone cadastrado.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => { playTapSound(); onBack?.(); }} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Orçamento {orcamento.numero}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.row}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Status</Text>
          <View style={[s.statusBadge, { backgroundColor: colors.primaryRgba?.(0.2) }]}>
            <Text style={[s.statusText, { color: colors.primary }]}>{STATUS_LABEL[orcamento.status] || orcamento.status}</Text>
          </View>
        </View>
        <View style={s.row}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Data</Text>
          <Text style={[s.value, { color: colors.text }]}>{formatDate(orcamento.createdAt)}</Text>
        </View>
        <View style={s.row}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Cliente</Text>
          <Text style={[s.value, { color: colors.text }]}>{cliente?.name || '—'}</Text>
        </View>

        <Text style={[s.sectionTitle, { color: colors.primary }]}>ITENS</Text>
        <GlassCard colors={colors} style={[s.card, { borderColor: colors.border }]}>
          {(orcamento.items || []).map((i, idx) => (
            <View key={idx} style={[s.itemRow, idx < (orcamento.items?.length || 0) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.itemName, { color: colors.text }]}>{i.name}</Text>
                <Text style={[s.itemInfo, { color: colors.textSecondary }]}>
                  {i.qty || 1} x {formatCurrency(i.price || 0)}
                  {i.discount ? ` - ${formatCurrency(i.discount)}` : ''}
                </Text>
              </View>
              <Text style={[s.itemTotal, { color: colors.primary }]}>{formatCurrency(((i.price || 0) - (i.discount || 0)) * (i.qty || 1))}</Text>
            </View>
          ))}
        </GlassCard>

        <View style={[s.totals, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[s.totalValue, { color: colors.text }]}>{formatCurrency(orcamento.subtotal || 0)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { color: colors.textSecondary }]}>Desconto</Text>
            <Text style={[s.totalValue, { color: colors.text }]}>{formatCurrency(orcamento.desconto || 0)}</Text>
          </View>
          <View style={[s.totalRow, s.totalFinal]}>
            <Text style={[s.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[s.totalValue, { color: colors.primary }]}>{formatCurrency(orcamento.total || 0)}</Text>
          </View>
        </View>

        {orcamento.observacoes ? (
          <View style={s.obs}>
            <Text style={[s.label, { color: colors.textSecondary }]}>Observações</Text>
            <Text style={[s.obsText, { color: colors.text }]}>{orcamento.observacoes}</Text>
          </View>
        ) : null}
        {orcamento.validade ? (
          <View style={s.row}>
            <Text style={[s.label, { color: colors.textSecondary }]}>Validade</Text>
            <Text style={[s.value, { color: colors.text }]}>{orcamento.validade}</Text>
          </View>
        ) : null}

        <View style={s.actions}>
          <TouchableOpacity onPress={handlePdf} disabled={loadingPdf} style={[s.actionBtn, { backgroundColor: colors.primaryRgba?.(0.2) }]}>
            {loadingPdf ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="document-outline" size={22} color={colors.primary} />}
            <Text style={[s.actionText, { color: colors.primary }]}>Gerar PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePrint} disabled={loadingPdf} style={[s.actionBtn, { backgroundColor: colors.primaryRgba?.(0.2) }]}>
            <Ionicons name="print-outline" size={22} color={colors.primary} />
            <Text style={[s.actionText, { color: colors.primary }]}>Imprimir</Text>
          </TouchableOpacity>
          {orcamento.status !== 'faturado' && (
            <TouchableOpacity onPress={() => { playTapSound(); onEdit?.(); }} style={[s.actionBtn, { backgroundColor: colors.primaryRgba?.(0.2) }]}>
              <Ionicons name="pencil-outline" size={22} color={colors.primary} />
              <Text style={[s.actionText, { color: colors.primary }]}>Editar</Text>
            </TouchableOpacity>
          )}
          {orcamento.status !== 'faturado' && (
            <TouchableOpacity onPress={() => { playTapSound(); onFaturar?.(); }} style={[s.actionBtn, { backgroundColor: '#22c55e20' }]}>
              <Ionicons name="cash-outline" size={22} color="#22c55e" />
              <Text style={[s.actionText, { color: '#22c55e' }]}>Faturar</Text>
            </TouchableOpacity>
          )}
          {cliente?.phone && (
            <TouchableOpacity onPress={handleWhatsApp} style={[s.actionBtn, { backgroundColor: '#25D36620' }]}>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              <Text style={[s.actionText, { color: '#25D366' }]}>WhatsApp</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 100 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 12, marginBottom: 4 },
  value: { fontSize: 15, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 20, marginBottom: 8 },
  card: { padding: 12 },
  itemRow: { paddingVertical: 10 },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemInfo: { fontSize: 12, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  totals: { padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalFinal: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)' },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 15, fontWeight: '600' },
  obs: { marginTop: 16 },
  obsText: { fontSize: 14, marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 24 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
  actionText: { fontSize: 14, fontWeight: '600' },
});
