import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useColaboradoresOrdem } from '../contexts/ColaboradoresOrdemContext';
import { GlassCard } from '../components/GlassCard';
import { MoneyInput } from '../components/MoneyInput';
import { playTapSound } from '../utils/sounds';
import { formatCurrency, parseMoney } from '../utils/format';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_OPCOES = ['ativo', 'afastado', 'ferias', 'demitido'];
const DEPARTAMENTOS = ['Administrativo', 'Operacional', 'Técnico', 'Comercial', 'Atendimento', 'Financeiro', 'Outro'];

export function ColaboradoresScreen({ onClose }) {
  const { colors } = useTheme();
  const { colaboradores, addColaborador, deleteColaborador } = useColaboradoresOrdem();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    cargo: '',
    cpf: '',
    rg: '',
    dataNascimento: '',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    cep: '',
    departamento: '',
    salario: '',
    dataAdmissao: todayStr(),
    dataDemissao: '',
    status: 'ativo',
    observacoes: '',
  });

  const handleBack = () => {
    playTapSound();
    onClose?.();
  };

  const openAdd = () => {
    playTapSound();
    setForm({
      nome: '',
      cargo: '',
      cpf: '',
      rg: '',
      dataNascimento: '',
      telefone: '',
      email: '',
      endereco: '',
      cidade: '',
      cep: '',
      departamento: '',
      salario: '',
      dataAdmissao: todayStr(),
      dataDemissao: '',
      status: 'ativo',
      observacoes: '',
    });
    setShowForm(true);
  };

  const updateForm = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!form.nome?.trim()) return Alert.alert('Erro', 'Preencha o nome do colaborador.');
    const sal = parseMoney(form.salario) || 0;
    Keyboard.dismiss();
    await addColaborador({
      ...form,
      salario: sal,
    });
    setShowForm(false);
  };

  const handleDelete = (c) => {
    Alert.alert('Excluir', `Remover ${c.nome}?`, [
      { text: 'Cancelar' },
      { text: 'Excluir', style: 'destructive', onPress: () => { playTapSound(); deleteColaborador(c.id); } },
    ]);
  };

  const statusLabel = (s) => ({ ativo: 'Ativo', afastado: 'Afastado', ferias: 'Férias', demitido: 'Demitido' }[s] || s);

  const input = (label, key, opts = {}) => (
    <View key={key} style={s.field}>
      <Text style={[s.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
        placeholderTextColor={colors.textSecondary}
        value={form[key]}
        onChangeText={(t) => updateForm(key, t)}
        {...opts}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Colaboradores</Text>
        <TouchableOpacity onPress={openAdd} style={[s.addBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {colaboradores.length === 0 ? (
          <GlassCard colors={colors} style={[s.card, { borderColor: colors.border }]}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="people-outline" size={56} color={colors.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>Nenhum colaborador</Text>
            <Text style={[s.emptySub, { color: colors.textSecondary }]}>Cadastre funcionários para vincular às ordens de serviço</Text>
            <TouchableOpacity onPress={openAdd} style={[s.emptyBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="person-add-outline" size={20} color="#fff" />
              <Text style={s.emptyBtnText}>Cadastrar colaborador</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : (
          colaboradores.map((c) => (
            <GlassCard key={c.id} colors={colors} style={[s.item, { borderColor: colors.border }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.itemTitle, { color: colors.text }]}>{c.nome || '—'}</Text>
                <Text style={[s.itemSub, { color: colors.textSecondary }]}>{c.cargo || '—'} · {c.departamento || '—'}</Text>
                {c.telefone ? <Text style={[s.itemInfo, { color: colors.textSecondary }]}>{c.telefone}</Text> : null}
                {c.email ? <Text style={[s.itemInfo, { color: colors.textSecondary }]}>{c.email}</Text> : null}
                <View style={[s.rowMeta, { marginTop: 8 }]}>
                  <Text style={[s.itemSalario, { color: colors.primary }]}>{formatCurrency(c.salario ?? 0)}</Text>
                  <View style={[s.statusBadge, { backgroundColor: (c.status === 'ativo' ? '#10b981' : c.status === 'demitido' ? '#ef4444' : colors.primary) + '25' }]}>
                    <Text style={[s.statusText, { color: c.status === 'ativo' ? '#10b981' : c.status === 'demitido' ? '#ef4444' : colors.primary }]}>{statusLabel(c.status)}</Text>
                  </View>
                </View>
                <Text style={[s.itemData, { color: colors.textSecondary }]}>Admissão: {c.dataAdmissao || '—'}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(c)} style={s.actionBtn}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </GlassCard>
          ))
        )}
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalWrap}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowForm(false)} />
          <View style={[s.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Novo Colaborador</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} style={[s.closeBtn, { backgroundColor: colors.primaryRgba(0.15) }]}>
                <Ionicons name="close" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalScroll} contentContainerStyle={s.modalScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              <Text style={[s.sectionTitle, { color: colors.primary }]}>DADOS PESSOAIS</Text>
              {input('Nome completo *', 'nome', { placeholder: 'Ex: João Silva' })}
              {input('CPF', 'cpf', { placeholder: '000.000.000-00', keyboardType: 'numeric' })}
              {input('RG', 'rg', { placeholder: 'Número do RG' })}
              {input('Data de nascimento', 'dataNascimento', { placeholder: 'DD/MM/AAAA' })}
              {input('Telefone', 'telefone', { placeholder: '(00) 00000-0000', keyboardType: 'phone-pad' })}
              {input('E-mail', 'email', { placeholder: 'email@exemplo.com', keyboardType: 'email-address' })}

              <Text style={[s.sectionTitle, { color: colors.primary, marginTop: 16 }]}>ENDEREÇO</Text>
              {input('Endereço', 'endereco', { placeholder: 'Rua, número, complemento' })}
              <View style={s.row2}>
                <View style={{ flex: 1 }}>{input('Cidade', 'cidade', { placeholder: 'Cidade' })}</View>
                <View style={{ flex: 0.6 }}>{input('CEP', 'cep', { placeholder: '00000-000', keyboardType: 'numeric' })}</View>
              </View>

              <Text style={[s.sectionTitle, { color: colors.primary, marginTop: 16 }]}>DADOS PROFISSIONAIS</Text>
              {input('Cargo', 'cargo', { placeholder: 'Ex: Técnico, Atendente' })}
              {input('Departamento', 'departamento', { placeholder: 'Ou selecione abaixo' })}
              <View style={s.chipRow}>
                {DEPARTAMENTOS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => { playTapSound(); updateForm('departamento', d); }}
                    style={[s.chip, form.departamento === d && { backgroundColor: colors.primary }, { borderColor: colors.border }]}
                  >
                    <Text style={[s.chipText, { color: form.departamento === d ? '#fff' : colors.text }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.field}>
                <Text style={[s.label, { color: colors.textSecondary }]}>Salário (R$)</Text>
                <MoneyInput value={form.salario} onChange={(v) => updateForm('salario', v)} colors={colors} containerStyle={[s.moneyWrap, { backgroundColor: colors.bg, borderColor: colors.border }]} />
              </View>
              {input('Data de admissão', 'dataAdmissao', { placeholder: 'AAAA-MM-DD' })}
              {input('Data de demissão', 'dataDemissao', { placeholder: 'Opcional' })}
              <View style={s.field}>
                <Text style={[s.label, { color: colors.textSecondary }]}>Status</Text>
                <View style={s.statusRow}>
                  {STATUS_OPCOES.map((st) => (
                    <TouchableOpacity
                      key={st}
                      onPress={() => { playTapSound(); updateForm('status', st); }}
                      style={[s.statusBtn, form.status === st && { backgroundColor: colors.primary }, { borderColor: colors.border }]}
                    >
                      <Text style={[s.statusBtnText, { color: form.status === st ? '#fff' : colors.text }]}>{statusLabel(st)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {input('Observações', 'observacoes', { placeholder: 'Informações adicionais', multiline, numberOfLines: 3, style: [s.textArea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }] })}
            </ScrollView>
            <TouchableOpacity onPress={handleSave} style={[s.saveBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
              <Text style={s.saveBtnText}>Cadastrar colaborador</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  addBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 120 },
  card: { padding: 28, alignItems: 'center' },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(34,197,94,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  emptySub: { fontSize: 13, marginBottom: 20, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, marginBottom: 12 },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemSub: { fontSize: 13, marginTop: 2 },
  itemInfo: { fontSize: 12, marginTop: 2 },
  itemSalario: { fontSize: 14, fontWeight: '700' },
  itemData: { fontSize: 11, marginTop: 4 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  actionBtn: { padding: 8 },
  field: { marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: 12 },
  moneyWrap: { borderWidth: 1, borderRadius: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  statusBtnText: { fontSize: 12, fontWeight: '600' },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { maxHeight: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  modalScroll: { maxHeight: 420 },
  modalScrollContent: { padding: 20, paddingBottom: 24 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginHorizontal: 20, marginBottom: 24, borderRadius: 14 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
