import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../../contexts/FinanceContext';
import { GlassCard } from '../../components/GlassCard';
import { OrcamentoItensList } from './OrcamentoItensList';
import { OrcamentoResumo } from './OrcamentoResumo';
import { DatePickerInput } from '../../components/DatePickerInput';
import { TimePickerInput } from '../../components/TimePickerInput';
import { playTapSound } from '../../utils/sounds';
import { formatCurrency, parseMoney } from '../../utils/format';

function formatDateStr(d) {
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function NovoOrcamentoScreen({ editingOrcamento, onBack, onSaved }) {
  const { colors } = useTheme();
  const { clients, products, services, addOrcamento, updateOrcamento, getNextOrcamentoNumero } = useFinance();
  const [clientId, setClientId] = useState(editingOrcamento?.clientId || '');
  const [clientSearch, setClientSearch] = useState('');
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [items, setItems] = useState(editingOrcamento?.items || []);
  const [observacoes, setObservacoes] = useState(editingOrcamento?.observacoes || '');
  const [validade, setValidade] = useState(editingOrcamento?.validade || '');
  const [termos, setTermos] = useState(editingOrcamento?.termos || '');
  const [agendaData, setAgendaData] = useState(editingOrcamento?.agendaData || '');
  const [agendaHora, setAgendaHora] = useState(editingOrcamento?.agendaHora || '');
  const [agendaObs, setAgendaObs] = useState(editingOrcamento?.agendaObs || '');
  const [desconto, setDesconto] = useState(editingOrcamento?.desconto ?? 0);
  const [saving, setSaving] = useState(false);

  const cliente = clients?.find((c) => c.id === clientId);
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients || [];
    const q = clientSearch.trim().toLowerCase();
    return (clients || []).filter((c) => (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').replace(/\D/g, '').includes(q));
  }, [clients, clientSearch]);

  const { subtotal, total } = useMemo(() => {
    const st = items.reduce((s, i) => s + ((i.price || 0) - (i.discount || 0)) * (i.qty || 1), 0);
    return { subtotal: st, total: Math.max(0, st - (desconto || 0)) };
  }, [items, desconto]);

  const handleSave = async () => {
    if (items.length === 0) return Alert.alert('Atenção', 'Adicione ao menos um item ao orçamento.');
    setSaving(true);
    try {
      const payload = {
        clientId: clientId || null,
        items,
        subtotal,
        desconto,
        total,
        observacoes: observacoes.trim() || null,
        validade: validade.trim() || null,
        termos: termos.trim() || null,
        agendaData: agendaData.trim() || null,
        agendaHora: agendaHora.trim() || null,
        agendaObs: agendaObs.trim() || null,
        status: editingOrcamento?.status || 'rascunho',
      };
      if (editingOrcamento?.id) {
        await updateOrcamento(editingOrcamento.id, { ...payload, numero: editingOrcamento.numero });
        playTapSound();
        onSaved?.(editingOrcamento);
      } else {
        const numero = await getNextOrcamentoNumero();
        await addOrcamento({ ...payload, numero });
        playTapSound();
        onSaved?.({ ...payload, numero });
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar o orçamento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => { playTapSound(); onBack?.(); }} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>{editingOrcamento ? 'Editar Orçamento' : 'Novo Orçamento'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={[s.saveBtn, { backgroundColor: saving ? colors.textSecondary : colors.primary }]}>
          <Text style={s.saveBtnText}>{saving ? '...' : 'Salvar'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={[s.sectionTitle, { color: colors.primary }]}>CLIENTE</Text>
          <TouchableOpacity
            onPress={() => { playTapSound(); setClientPickerOpen(true); }}
            style={[s.clientCard, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            {cliente ? (
              <View>
                <Text style={[s.clientName, { color: colors.text }]}>{cliente.name}</Text>
                {cliente.phone ? <Text style={[s.clientInfo, { color: colors.textSecondary }]}>{cliente.phone}</Text> : null}
                {cliente.email ? <Text style={[s.clientInfo, { color: colors.textSecondary }]}>{cliente.email}</Text> : null}
                {cliente.cpf ? <Text style={[s.clientInfo, { color: colors.textSecondary }]}>CPF/CNPJ: {cliente.cpf}</Text> : null}
                {cliente.address ? <Text style={[s.clientInfo, { color: colors.textSecondary }]}>{cliente.address}</Text> : null}
              </View>
            ) : (
              <Text style={[s.clientPlaceholder, { color: colors.textSecondary }]}>Toque para selecionar cliente</Text>
            )}
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <Text style={[s.sectionTitle, { color: colors.primary, marginTop: 20 }]}>ITENS DO ORÇAMENTO</Text>
          <OrcamentoItensList items={items} setItems={setItems} products={products} services={services} colors={colors} />

          <OrcamentoResumo subtotal={subtotal} desconto={desconto} total={total} colors={colors} onDescontoChange={setDesconto} />

          <Text style={[s.sectionTitle, { color: colors.primary, marginTop: 20 }]}>OBSERVAÇÕES E VALIDADE</Text>
          <TextInput
            style={[s.textArea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
            placeholder="Observações..."
            placeholderTextColor={colors.textSecondary}
            value={observacoes}
            onChangeText={setObservacoes}
            multiline
          />
          <Text style={[s.label, { color: colors.textSecondary }]}>Validade do orçamento</Text>
          <DatePickerInput
            value={validade}
            onChange={setValidade}
            placeholder="Data de validade"
            colors={colors}
          />
          <Text style={[s.label, { color: colors.textSecondary }]}>Termos e condições</Text>
          <TextInput
            style={[s.textArea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
            placeholder="Termos..."
            placeholderTextColor={colors.textSecondary}
            value={termos}
            onChangeText={setTermos}
            multiline
          />

          <Text style={[s.sectionTitle, { color: colors.primary, marginTop: 20 }]}>AGENDAMENTO (OPCIONAL)</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Data</Text>
              <DatePickerInput value={agendaData} onChange={setAgendaData} placeholder="dd/mm/aaaa" colors={colors} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Hora</Text>
              <TimePickerInput value={agendaHora} onChange={setAgendaHora} placeholder="00:00" colors={colors} />
            </View>
          </View>
          <Text style={[s.label, { color: colors.textSecondary }]}>Observação do agendamento</Text>
          <TextInput
            style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
            placeholder="Ex: Retirar peças..."
            placeholderTextColor={colors.textSecondary}
            value={agendaObs}
            onChangeText={setAgendaObs}
          />

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={clientPickerOpen} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setClientPickerOpen(false)} />
        <View style={[s.modalContent, { backgroundColor: colors.card }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Selecionar cliente</Text>
            <TouchableOpacity onPress={() => setClientPickerOpen(false)}>
              <Ionicons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[s.searchInput, { borderColor: colors.border, color: colors.text }]}
            placeholder="Buscar por nome, e-mail ou telefone..."
            placeholderTextColor={colors.textSecondary}
            value={clientSearch}
            onChangeText={setClientSearch}
          />
          <ScrollView style={s.clientList}>
            <TouchableOpacity style={s.clientItem} onPress={() => { setClientId(''); setClientPickerOpen(false); playTapSound(); }}>
              <Text style={{ color: colors.textSecondary }}>Nenhum cliente</Text>
            </TouchableOpacity>
            {filteredClients.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[s.clientItem, clientId === c.id && { backgroundColor: colors.primaryRgba?.(0.15) }]}
                onPress={() => { setClientId(c.id); setClientPickerOpen(false); playTapSound(); }}
              >
                <Text style={[s.clientItemName, { color: colors.text }]}>{c.name}</Text>
                {c.phone ? <Text style={[s.clientItemInfo, { color: colors.textSecondary }]}>{c.phone}</Text> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  scroll: { padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  label: { fontSize: 12, marginBottom: 6 },
  clientCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
  clientName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  clientInfo: { fontSize: 12, marginTop: 2 },
  clientPlaceholder: { flex: 1, fontSize: 14 },
  textArea: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: 'top' },
  input: { borderWidth: 1, borderRadius: 12, padding: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  searchInput: { margin: 16, borderWidth: 1, borderRadius: 12, padding: 12 },
  clientList: { maxHeight: 300 },
  clientItem: { padding: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.08)' },
  clientItemName: { fontSize: 15, fontWeight: '600' },
  clientItemInfo: { fontSize: 12, marginTop: 2 },
});
