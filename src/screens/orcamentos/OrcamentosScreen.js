import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../../contexts/FinanceContext';
import { usePlan } from '../../contexts/PlanContext';
import { GlassCard } from '../../components/GlassCard';
import { OrcamentoItemRow } from './OrcamentoItemRow';
import { playTapSound } from '../../utils/sounds';
import { formatCurrency } from '../../utils/format';

const STATUS_OPTIONS = [
  { id: 'todos', label: 'Todos' },
  { id: 'rascunho', label: 'Rascunho' },
  { id: 'enviado', label: 'Enviado' },
  { id: 'aceito', label: 'Aceito' },
  { id: 'recusado', label: 'Recusado' },
  { id: 'faturado', label: 'Faturado' },
];

function formatDateStr(str) {
  if (!str) return '—';
  const d = typeof str === 'string' && str.includes('T') ? new Date(str) : (str.split?.('/') ? (() => {
    const p = str.split(/[/-]/);
    if (p.length >= 3) return new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
    return new Date(str);
  })() : new Date(str));
  return isNaN(d.getTime()) ? str : d.toLocaleDateString('pt-BR');
}

export function OrcamentosScreen({ onClose, onNewOrcamento, onViewOrcamento, onEditOrcamento, onPdfOrcamento, onFaturarOrcamento }) {
  const { colors } = useTheme();
  const { orcamentos, clients, loading } = useFinance();
  const { showEmpresaFeatures } = usePlan();
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = orcamentos || [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          (o.numero || '').toLowerCase().includes(q) ||
          ((clients?.find((c) => c.id === o.clientId)?.name) || '').toLowerCase().includes(q)
      );
    }
    if (filterClient) list = list.filter((o) => o.clientId === filterClient);
    if (filterStatus && filterStatus !== 'todos') list = list.filter((o) => o.status === filterStatus);
    if (filterDateFrom || filterDateTo) {
      list = list.filter((o) => {
        const d = o.createdAt ? new Date(o.createdAt) : null;
        if (!d || isNaN(d.getTime())) return true;
        if (filterDateFrom) {
          const from = new Date(filterDateFrom.split('/').reverse().join('-'));
          if (d < from) return false;
        }
        if (filterDateTo) {
          const to = new Date(filterDateTo.split('/').reverse().join('-'));
          to.setHours(23, 59, 59, 999);
          if (d > to) return false;
        }
        return true;
      });
    }
    return list;
  }, [orcamentos, search, filterClient, filterStatus, filterDateFrom, filterDateTo, clients]);

  const handleNew = () => {
    playTapSound();
    onNewOrcamento?.();
  };

  if (!showEmpresaFeatures) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <TouchableOpacity onPress={() => playTapSound() || onClose?.()} style={{ padding: 8, marginRight: 8 }}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Orçamentos</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.textSecondary} />
          <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginTop: 12 }}>
            Orçamentos disponível no plano Empresa
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <View style={[s.headerBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => { playTapSound(); onClose?.(); }} style={s.headerBack}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Orçamentos</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={[s.toolbar, { backgroundColor: colors.bg }]}>
        <View style={[s.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Buscar por número ou cliente..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity onPress={handleNew} style={[s.newBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={s.newBtnText}>Novo Orçamento</Text>
        </TouchableOpacity>
      </View>

      <View style={[s.filters, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[s.filterChip, { borderColor: colors.border, backgroundColor: filterClient ? colors.primaryRgba?.(0.15) : colors.card }]}
          onPress={() => { playTapSound(); setClientDropdownOpen(!clientDropdownOpen); setStatusDropdownOpen(false); }}
        >
          <Text style={[s.filterChipText, { color: colors.text }]} numberOfLines={1}>
            {filterClient ? (clients?.find((c) => c.id === filterClient)?.name || 'Cliente') : 'Cliente'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.filterChip, { borderColor: colors.border, backgroundColor: filterStatus !== 'todos' ? colors.primaryRgba?.(0.15) : colors.card }]}
          onPress={() => { playTapSound(); setStatusDropdownOpen(!statusDropdownOpen); setClientDropdownOpen(false); }}
        >
          <Text style={[s.filterChipText, { color: colors.text }]}>{STATUS_OPTIONS.find((x) => x.id === filterStatus)?.label || 'Status'}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {clientDropdownOpen && (
        <View style={[s.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={s.dropdownItem} onPress={() => { setFilterClient(''); setClientDropdownOpen(false); playTapSound(); }}>
            <Text style={{ color: colors.text }}>Todos</Text>
          </TouchableOpacity>
          {(clients || []).map((c) => (
            <TouchableOpacity key={c.id} style={s.dropdownItem} onPress={() => { setFilterClient(c.id); setClientDropdownOpen(false); playTapSound(); }}>
              <Text style={{ color: colors.text }} numberOfLines={1}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {statusDropdownOpen && (
        <View style={[s.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {STATUS_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.id} style={s.dropdownItem} onPress={() => { setFilterStatus(opt.id); setStatusDropdownOpen(false); playTapSound(); }}>
              <Text style={{ color: colors.text }}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="document-text-outline" size={56} color={colors.textSecondary} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>Nenhum orçamento</Text>
          <Text style={[s.emptySub, { color: colors.textSecondary }]}>Crie seu primeiro orçamento para enviar aos clientes</Text>
          <TouchableOpacity onPress={handleNew} style={[s.emptyBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={s.emptyBtnText}>Novo Orçamento</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          {filtered.map((o) => (
            <OrcamentoItemRow
              key={o.id}
              orcamento={o}
              cliente={clients?.find((c) => c.id === o.clientId)}
              colors={colors}
              onView={() => { playTapSound(); onViewOrcamento?.(o); }}
              onEdit={() => { playTapSound(); onEditOrcamento?.(o); }}
              onPdf={() => { playTapSound(); onPdfOrcamento?.(o); }}
              onFaturar={() => { playTapSound(); onFaturarOrcamento?.(o); }}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  headerBar: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  headerBack: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  toolbar: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  newBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, maxWidth: '48%' },
  filterChipText: { fontSize: 14, flex: 1 },
  dropdown: { marginHorizontal: 16, marginTop: 4, borderRadius: 12, borderWidth: 1, maxHeight: 200 },
  dropdownItem: { padding: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.08)' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  listContent: { padding: 16, paddingBottom: 100 },
});
