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
import { DatePickerInput } from '../components/DatePickerInput';
import { playTapSound } from '../utils/sounds';
import { formatCurrency, parseMoney } from '../utils/format';
import { useIsDesktopLayout } from '../utils/platformLayout';
import { ModalFormRow, ModalFormCell } from '../components/ModalFormLayout';

function todayStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const STATUS_OPCOES = ['aberta', 'em_andamento', 'aguardando_peca', 'concluida', 'entregue', 'cancelada'];
const PRIORIDADE_OPCOES = ['baixa', 'media', 'alta', 'urgente'];

const statusLabel = (s) => ({
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  aguardando_peca: 'Aguardando peça',
  concluida: 'Concluída',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
}[s] || s);

const prioridadeLabel = (p) => ({
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
}[p] || p);

export function OrdemServicoScreen({ onClose }) {
  const { colors } = useTheme();
  const useDesktopModal = Platform.OS === 'web' && useIsDesktopLayout();
  const { ordensServico, colaboradores, addOrdemServico, deleteOrdemServico } = useColaboradoresOrdem();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    numero: `OS${Date.now().toString().slice(-6)}`,
    clienteNome: '',
    clienteTelefone: '',
    clienteEmail: '',
    clienteEndereco: '',
    colaboradorId: '',
    equipamento: '',
    modelo: '',
    serial: '',
    defeitoRelatado: '',
    servicoSolicitado: '',
    diagnostico: '',
    servicoRealizado: '',
    pecasUtilizadas: '',
    valorOrcado: '',
    valorFinal: '',
    prioridade: 'media',
    status: 'aberta',
    dataAbertura: todayStr(),
    dataPrevisao: '',
    dataConclusao: '',
    garantia: '',
    observacoes: '',
  });

  const handleBack = () => {
    playTapSound();
    onClose?.();
  };

  const openAdd = () => {
    playTapSound();
    setForm({
      numero: `OS${Date.now().toString().slice(-6)}`,
      clienteNome: '',
      clienteTelefone: '',
      clienteEmail: '',
      clienteEndereco: '',
      colaboradorId: '',
      equipamento: '',
      modelo: '',
      serial: '',
      defeitoRelatado: '',
      servicoSolicitado: '',
      diagnostico: '',
      servicoRealizado: '',
      pecasUtilizadas: '',
      valorOrcado: '',
      valorFinal: '',
      prioridade: 'media',
      status: 'aberta',
      dataAbertura: todayStr(),
      dataPrevisao: '',
      dataConclusao: '',
      garantia: '',
      observacoes: '',
    });
    setShowForm(true);
  };

  const updateForm = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!form.clienteNome?.trim()) return Alert.alert('Erro', 'Preencha o nome do cliente.');
    if (!form.equipamento?.trim()) return Alert.alert('Erro', 'Informe o equipamento.');
    Keyboard.dismiss();
    const valorOrc = parseMoney(form.valorOrcado);
    const valorFin = parseMoney(form.valorFinal);
    await addOrdemServico({
      ...form,
      colaboradorId: form.colaboradorId || null,
      valorOrcado: valorOrc,
      valorFinal: valorFin,
    });
    setShowForm(false);
  };

  const handleDelete = (o) => {
    Alert.alert('Excluir', `Excluir ordem de serviço ${o.numero}?`, [
      { text: 'Cancelar' },
      { text: 'Excluir', style: 'destructive', onPress: () => { playTapSound(); deleteOrdemServico(o.id); } },
    ]);
  };

  const input = (label, key, opts = {}, layout = {}) => {
    const { style: optStyle, ...restOpts } = opts;
    return (
      <View key={key} style={[s.field, layout.noMargin && { marginBottom: 0 }]}>
        <Text style={[s.label, { color: colors.textSecondary }]}>{label}</Text>
        <TextInput
          style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }, optStyle]}
          placeholderTextColor={colors.textSecondary}
          value={form[key]}
          onChangeText={(t) => updateForm(key, t)}
          {...restOpts}
        />
      </View>
    );
  };

  const getStatusColor = (st) => {
    switch (st) {
      case 'concluida':
      case 'entregue': return '#10b981';
      case 'cancelada': return '#ef4444';
      case 'em_andamento':
      case 'aguardando_peca': return colors.primary;
      default: return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Ordem de Serviço</Text>
        <TouchableOpacity onPress={openAdd} style={[s.addBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {ordensServico.length === 0 ? (
          <GlassCard colors={colors} style={[s.card, { borderColor: colors.border }]}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="document-text-outline" size={56} color={colors.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>Nenhuma ordem de serviço</Text>
            <Text style={[s.emptySub, { color: colors.textSecondary }]}>Cadastre ordens para controlar os serviços prestados</Text>
            <TouchableOpacity onPress={openAdd} style={[s.emptyBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={s.emptyBtnText}>Nova ordem de serviço</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : (
          ordensServico.map((o) => (
            <GlassCard key={o.id} colors={colors} style={[s.item, { borderColor: colors.border }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={s.itemHeader}>
                  <Text style={[s.itemNumero, { color: colors.primary }]}>{o.numero}</Text>
                  <View style={[s.statusBadge, { backgroundColor: getStatusColor(o.status) + '25' }]}>
                    <Text style={[s.statusText, { color: getStatusColor(o.status) }]}>{statusLabel(o.status)}</Text>
                  </View>
                </View>
                <Text style={[s.itemTitle, { color: colors.text }]}>{o.clienteNome || '—'}</Text>
                <Text style={[s.itemSub, { color: colors.textSecondary }]}>{o.equipamento || '—'}</Text>
                {o.modelo ? <Text style={[s.itemInfo, { color: colors.textSecondary }]}>Modelo: {o.modelo}</Text> : null}
                <View style={s.rowMeta}>
                  <Text style={[s.itemValor, { color: colors.primary }]}>{formatCurrency(o.valorFinal ?? o.valorOrcado ?? 0)}</Text>
                  <Text style={[s.itemData, { color: colors.textSecondary }]}>{o.dataAbertura || '—'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDelete(o)} style={s.actionBtn}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </GlassCard>
          ))
        )}
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[s.modalWrap, useDesktopModal && s.modalWrapDesktop]}
        >
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowForm(false)} />
          <View
            style={[
              s.modalContent,
              { backgroundColor: colors.card, borderColor: colors.border },
              useDesktopModal && s.modalContentDesktop,
            ]}
          >
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Nova Ordem de Serviço</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} style={[s.closeBtn, { backgroundColor: colors.primaryRgba(0.15) }]}>
                <Ionicons name="close" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={[s.modalScroll, useDesktopModal && s.modalScrollDesktop]}
              contentContainerStyle={s.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <Text style={[s.sectionTitle, { color: colors.primary }]}>Nº DA OS E ABERTURA</Text>
              {useDesktopModal ? (
                <ModalFormRow>
                  <ModalFormCell flex={1} minWidth={120} maxWidth={200}>
                    {input('Número', 'numero', { placeholder: 'Ex: OS001234' }, { noMargin: true })}
                  </ModalFormCell>
                  <ModalFormCell flex={1} minWidth={140}>
                    <View style={[s.field, { marginBottom: 0 }]}>
                      <Text style={[s.label, { color: colors.textSecondary }]}>Data de abertura</Text>
                      <DatePickerInput value={form.dataAbertura} onChange={(v) => updateForm('dataAbertura', v)} colors={colors} style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border }]} placeholder="DD/MM/AAAA" />
                    </View>
                  </ModalFormCell>
                </ModalFormRow>
              ) : (
                <>
                  {input('Número', 'numero', { placeholder: 'Ex: OS001234' })}
                  <View style={s.field}>
                    <Text style={[s.label, { color: colors.textSecondary }]}>Data de abertura</Text>
                    <DatePickerInput value={form.dataAbertura} onChange={(v) => updateForm('dataAbertura', v)} colors={colors} style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border }]} placeholder="DD/MM/AAAA" />
                  </View>
                </>
              )}

              <Text style={[s.sectionTitle, { color: colors.primary, marginTop: 16 }]}>CLIENTE</Text>
              {useDesktopModal ? (
                <>
                  <ModalFormRow>
                    <ModalFormCell flex={2} minWidth={200}>
                      {input('Nome do cliente *', 'clienteNome', { placeholder: 'Nome completo' }, { noMargin: true })}
                    </ModalFormCell>
                    <ModalFormCell flex={1} minWidth={130}>
                      {input('Telefone', 'clienteTelefone', { placeholder: '(00) 00000-0000', keyboardType: 'phone-pad' }, { noMargin: true })}
                    </ModalFormCell>
                  </ModalFormRow>
                  <ModalFormRow>
                    <ModalFormCell flex={2} minWidth={180}>
                      {input('E-mail', 'clienteEmail', { placeholder: 'email@exemplo.com', keyboardType: 'email-address' }, { noMargin: true })}
                    </ModalFormCell>
                    <ModalFormCell flex={1} minWidth={100} maxWidth={220}>
                      {input('Garantia', 'garantia', { placeholder: 'Ex: 90 dias' }, { noMargin: true })}
                    </ModalFormCell>
                  </ModalFormRow>
                  <ModalFormRow>
                    <ModalFormCell fullWidth>
                      {input('Endereço', 'clienteEndereco', { placeholder: 'Endereço para retirada/entrega' }, { noMargin: true })}
                    </ModalFormCell>
                  </ModalFormRow>
                </>
              ) : (
                <>
                  {input('Nome do cliente *', 'clienteNome', { placeholder: 'Nome completo' })}
                  {input('Telefone', 'clienteTelefone', { placeholder: '(00) 00000-0000', keyboardType: 'phone-pad' })}
                  {input('E-mail', 'clienteEmail', { placeholder: 'email@exemplo.com', keyboardType: 'email-address' })}
                  {input('Endereço', 'clienteEndereco', { placeholder: 'Endereço para retirada/entrega' })}
                </>
              )}

              <Text style={[s.sectionTitle, { color: colors.primary, marginTop: 16 }]}>EQUIPAMENTO</Text>
              {useDesktopModal ? (
                <>
                  <ModalFormRow>
                    <ModalFormCell flex={2} minWidth={160}>
                      {input('Equipamento *', 'equipamento', { placeholder: 'Ex: Notebook, Celular' }, { noMargin: true })}
                    </ModalFormCell>
                    <ModalFormCell flex={1} minWidth={120}>
                      {input('Modelo', 'modelo', { placeholder: 'Modelo' }, { noMargin: true })}
                    </ModalFormCell>
                    <ModalFormCell flex={1} minWidth={100} maxWidth={160}>
                      {input('Nº de Série', 'serial', { placeholder: 'Serial' }, { noMargin: true })}
                    </ModalFormCell>
                  </ModalFormRow>
                  {input('Defeito relatado', 'defeitoRelatado', { placeholder: 'O que o cliente relatou', multiline: true }, { noMargin: useDesktopModal })}
                  {input('Serviço solicitado', 'servicoSolicitado', { placeholder: 'Descrição do serviço', multiline: true }, { noMargin: useDesktopModal })}
                </>
              ) : (
                <>
                  {input('Equipamento *', 'equipamento', { placeholder: 'Ex: Notebook, Celular, Geladeira' })}
                  {input('Modelo', 'modelo', { placeholder: 'Modelo do equipamento' })}
                  {input('Nº de Série', 'serial', { placeholder: 'Serial ou identificação' })}
                  {input('Defeito relatado', 'defeitoRelatado', { placeholder: 'O que o cliente relatou', multiline: true })}
                  {input('Serviço solicitado', 'servicoSolicitado', { placeholder: 'Descrição do serviço', multiline: true })}
                </>
              )}

              <Text style={[s.sectionTitle, { color: colors.primary, marginTop: 16 }]}>DIAGNÓSTICO E SERVIÇO</Text>
              {input('Diagnóstico', 'diagnostico', { placeholder: 'Problema identificado', multiline: true })}
              {input('Serviço realizado', 'servicoRealizado', { placeholder: 'O que foi feito', multiline: true })}
              {input('Peças utilizadas', 'pecasUtilizadas', { placeholder: 'Lista de peças e materiais', multiline: true })}

              <Text style={[s.sectionTitle, { color: colors.primary, marginTop: 16 }]}>RESPONSÁVEL</Text>
              <View style={[s.field, useDesktopModal && { marginBottom: 10 }]}>
                <Text style={[s.label, { color: colors.textSecondary }]}>Técnico / Colaborador</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.colabScroll}>
                  <TouchableOpacity
                    onPress={() => { playTapSound(); updateForm('colaboradorId', ''); }}
                    style={[s.colabChip, !form.colaboradorId && { backgroundColor: colors.primary }, { borderColor: colors.border }]}
                  >
                    <Text style={[s.colabChipText, { color: !form.colaboradorId ? '#fff' : colors.text }]}>Nenhum</Text>
                  </TouchableOpacity>
                  {colaboradores.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => { playTapSound(); updateForm('colaboradorId', c.id); }}
                      style={[s.colabChip, form.colaboradorId === c.id && { backgroundColor: colors.primary }, { borderColor: colors.border }]}
                    >
                      <Text style={[s.colabChipText, { color: form.colaboradorId === c.id ? '#fff' : colors.text }]}>{c.nome}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={[s.sectionTitle, { color: colors.primary, marginTop: 16 }]}>VALORES</Text>
              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: colors.textSecondary }]}>Valor orçado (R$)</Text>
                  <MoneyInput value={form.valorOrcado} onChange={(v) => updateForm('valorOrcado', v)} colors={colors} containerStyle={[s.moneyWrap, { backgroundColor: colors.bg, borderColor: colors.border }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: colors.textSecondary }]}>Valor final (R$)</Text>
                  <MoneyInput value={form.valorFinal} onChange={(v) => updateForm('valorFinal', v)} colors={colors} containerStyle={[s.moneyWrap, { backgroundColor: colors.bg, borderColor: colors.border }]} />
                </View>
              </View>

              <Text style={[s.sectionTitle, { color: colors.primary, marginTop: 16 }]}>PRIORIDADE E STATUS</Text>
              {useDesktopModal ? (
                <ModalFormRow>
                  <ModalFormCell flex={1} minWidth={220}>
                    <View style={[s.field, { marginBottom: 0 }]}>
                      <Text style={[s.label, { color: colors.textSecondary }]}>Prioridade</Text>
                      <View style={s.chipRow}>
                        {PRIORIDADE_OPCOES.map((p) => (
                          <TouchableOpacity
                            key={p}
                            onPress={() => { playTapSound(); updateForm('prioridade', p); }}
                            style={[s.chip, form.prioridade === p && { backgroundColor: colors.primary }, { borderColor: colors.border }]}
                          >
                            <Text style={[s.chipText, { color: form.prioridade === p ? '#fff' : colors.text }]}>{prioridadeLabel(p)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </ModalFormCell>
                  <ModalFormCell flex={1} minWidth={220}>
                    <View style={[s.field, { marginBottom: 0 }]}>
                      <Text style={[s.label, { color: colors.textSecondary }]}>Status</Text>
                      <View style={s.chipRow}>
                        {STATUS_OPCOES.map((st) => (
                          <TouchableOpacity
                            key={st}
                            onPress={() => { playTapSound(); updateForm('status', st); }}
                            style={[s.chip, form.status === st && { backgroundColor: colors.primary }, { borderColor: colors.border }]}
                          >
                            <Text style={[s.chipText, { color: form.status === st ? '#fff' : colors.text }]}>{statusLabel(st)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </ModalFormCell>
                </ModalFormRow>
              ) : (
                <>
                  <View style={s.field}>
                    <Text style={[s.label, { color: colors.textSecondary }]}>Prioridade</Text>
                    <View style={s.chipRow}>
                      {PRIORIDADE_OPCOES.map((p) => (
                        <TouchableOpacity
                          key={p}
                          onPress={() => { playTapSound(); updateForm('prioridade', p); }}
                          style={[s.chip, form.prioridade === p && { backgroundColor: colors.primary }, { borderColor: colors.border }]}
                        >
                          <Text style={[s.chipText, { color: form.prioridade === p ? '#fff' : colors.text }]}>{prioridadeLabel(p)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={s.field}>
                    <Text style={[s.label, { color: colors.textSecondary }]}>Status</Text>
                    <View style={s.chipRow}>
                      {STATUS_OPCOES.map((st) => (
                        <TouchableOpacity
                          key={st}
                          onPress={() => { playTapSound(); updateForm('status', st); }}
                          style={[s.chip, form.status === st && { backgroundColor: colors.primary }, { borderColor: colors.border }]}
                        >
                          <Text style={[s.chipText, { color: form.status === st ? '#fff' : colors.text }]}>{statusLabel(st)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}

              <Text style={[s.sectionTitle, { color: colors.primary, marginTop: 16 }]}>DATAS</Text>
              {useDesktopModal ? (
                <ModalFormRow>
                  <ModalFormCell flex={1} minWidth={140}>
                    <View style={[s.field, { marginBottom: 0 }]}>
                      <Text style={[s.label, { color: colors.textSecondary }]}>Previsão de conclusão</Text>
                      <DatePickerInput value={form.dataPrevisao} onChange={(v) => updateForm('dataPrevisao', v)} colors={colors} style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border }]} placeholder="Opcional" />
                    </View>
                  </ModalFormCell>
                  <ModalFormCell flex={1} minWidth={140}>
                    <View style={[s.field, { marginBottom: 0 }]}>
                      <Text style={[s.label, { color: colors.textSecondary }]}>Data de conclusão</Text>
                      <DatePickerInput value={form.dataConclusao} onChange={(v) => updateForm('dataConclusao', v)} colors={colors} style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border }]} placeholder="Quando finalizado" />
                    </View>
                  </ModalFormCell>
                </ModalFormRow>
              ) : (
                <>
                  <View style={s.field}>
                    <Text style={[s.label, { color: colors.textSecondary }]}>Previsão de conclusão</Text>
                    <DatePickerInput value={form.dataPrevisao} onChange={(v) => updateForm('dataPrevisao', v)} colors={colors} style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border }]} placeholder="Opcional" />
                  </View>
                  <View style={s.field}>
                    <Text style={[s.label, { color: colors.textSecondary }]}>Data de conclusão</Text>
                    <DatePickerInput value={form.dataConclusao} onChange={(v) => updateForm('dataConclusao', v)} colors={colors} style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border }]} placeholder="Quando finalizado" />
                  </View>
                </>
              )}

              <Text style={[s.sectionTitle, { color: colors.primary, marginTop: 16 }]}>OUTROS</Text>
              {!useDesktopModal ? input('Garantia', 'garantia', { placeholder: 'Ex: 90 dias' }) : null}
              {input('Observações', 'observacoes', { placeholder: 'Informações adicionais', multiline: true, style: [s.textArea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }] })}
            </ScrollView>
            <TouchableOpacity onPress={handleSave} style={[s.saveBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark-done-outline" size={22} color="#fff" />
              <Text style={s.saveBtnText}>Cadastrar ordem de serviço</Text>
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
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  itemNumero: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemSub: { fontSize: 13, marginTop: 2 },
  itemInfo: { fontSize: 12, marginTop: 2 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  itemValor: { fontSize: 14, fontWeight: '700' },
  itemData: { fontSize: 11 },
  actionBtn: { padding: 8 },
  field: { marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: 12 },
  moneyWrap: { borderWidth: 1, borderRadius: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  colabScroll: { flexGrow: 0, marginBottom: 4 },
  colabChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginRight: 8 },
  colabChipText: { fontSize: 12, fontWeight: '600' },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalWrapDesktop: { justifyContent: 'center', paddingVertical: 20 },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { maxHeight: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, overflow: 'hidden' },
  modalContentDesktop: {
    maxWidth: 900,
    width: '94%',
    alignSelf: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    maxHeight: '88%',
    minHeight: 280,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  modalScroll: { maxHeight: 480 },
  modalScrollDesktop: { maxHeight: 580, flexGrow: 0 },
  modalScrollContent: { padding: 20, paddingBottom: 24 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginHorizontal: 20, marginBottom: 24, borderRadius: 14 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
