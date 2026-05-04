import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useFinance } from '../contexts/FinanceContext';
import { TopBar } from '../components/TopBar';
import { playTapSound } from '../utils/sounds';
import { useIsDesktopLayout } from '../utils/platformLayout';

const FUNCOES = ['Vendedor', 'Gerente', 'Serviços gerais', 'Atendimento', 'Administrativo', 'Caixa', 'Outro'];
const ESTADO_CIVIL = ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)', 'Outro'];

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginHorizontal: 16, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, marginBottom: 6 },
  sectionTitle: { fontSize: 12, fontWeight: '800', marginTop: 14, marginBottom: 8 },
});

function toMoney(v) {
  const n = Number(v || 0);
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

const emptyForm = () => ({
  nome: '',
  funcao: 'Vendedor',
  salarioBase: '',
  comissaoPercent: '',
  cpf: '',
  rg: '',
  estadoCivil: '',
  telefone: '',
  email: '',
  endereco: '',
  cidade: '',
  cep: '',
  complemento: '',
  dataNascimento: '',
  habilitado: true,
  descricao: '',
  curriculoExperiencias: '',
  observacoes: '',
  operadorCaixaAtivo: false,
  operadorCaixaId: '',
  operadorCaixaSenha: '',
});

export function ColaboradoresScreen({ onClose, isModal }) {
  const { colors } = useTheme();
  const isDesktopWeb = Platform.OS === 'web' && useIsDesktopLayout();
  const { collaborators, addCollaborator, updateCollaborator, deleteCollaborator, addCollaboratorPayment } = useFinance();
  const [formOpen, setFormOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [payTipo, setPayTipo] = useState('salario');
  const [payValor, setPayValor] = useState('');
  const [payObs, setPayObs] = useState('');

  const setF = useCallback((key, val) => setForm((p) => ({ ...p, [key]: val })), []);

  const ordered = useMemo(() => [...(collaborators || [])].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''))), [collaborators]);

  const openCreate = () => {
    playTapSound();
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (c) => {
    playTapSound();
    setEditing(c);
    setForm({
      nome: c.nome || '',
      funcao: c.funcao || 'Vendedor',
      salarioBase: String(c.salarioBase ?? ''),
      comissaoPercent: String(c.comissaoPercent ?? ''),
      cpf: c.cpf || '',
      rg: c.rg || '',
      estadoCivil: c.estadoCivil || '',
      telefone: c.telefone || '',
      email: c.email || '',
      endereco: c.endereco || '',
      cidade: c.cidade || '',
      cep: c.cep || '',
      complemento: c.complemento || '',
      dataNascimento: c.dataNascimento || '',
      habilitado: c.habilitado !== false,
      descricao: c.descricao || '',
      curriculoExperiencias: c.curriculoExperiencias || '',
      observacoes: c.observacoes || '',
      operadorCaixaAtivo: c.operadorCaixaAtivo === true,
      operadorCaixaId: c.operadorCaixaId || '',
      operadorCaixaSenha: c.operadorCaixaSenha || '',
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim()) return Alert.alert('Atenção', 'Informe o nome do colaborador.');
    const payload = {
      nome: form.nome.trim(),
      funcao: form.funcao || 'Vendedor',
      salarioBase: Number(String(form.salarioBase).replace(',', '.')) || 0,
      comissaoPercent: Number(String(form.comissaoPercent).replace(',', '.')) || 0,
      cpf: form.cpf.trim(),
      rg: form.rg.trim(),
      estadoCivil: form.estadoCivil,
      telefone: form.telefone.trim(),
      email: form.email.trim(),
      endereco: form.endereco.trim(),
      cidade: form.cidade.trim(),
      cep: form.cep.trim(),
      complemento: form.complemento.trim(),
      dataNascimento: form.dataNascimento.trim(),
      habilitado: form.habilitado,
      descricao: form.descricao.trim(),
      curriculoExperiencias: form.curriculoExperiencias.trim(),
      observacoes: form.observacoes.trim(),
      operadorCaixaAtivo: form.operadorCaixaAtivo === true,
      operadorCaixaId: form.operadorCaixaId.trim(),
      operadorCaixaSenha: form.operadorCaixaSenha.trim(),
    };
    if (payload.operadorCaixaAtivo && (!payload.operadorCaixaId || !payload.operadorCaixaSenha)) {
      return Alert.alert('Atenção', 'Para operador de caixa, informe ID e senha.');
    }
    if (editing?.id) await updateCollaborator(editing.id, payload);
    else await addCollaborator(payload);
    setFormOpen(false);
  };

  const openPayment = (c) => {
    playTapSound();
    setSelected(c);
    setPayTipo('salario');
    setPayValor('');
    setPayObs('');
    setPayOpen(true);
  };

  const savePayment = async () => {
    if (!selected?.id) return;
    const valor = Number(String(payValor).replace(',', '.')) || 0;
    if (valor <= 0) return Alert.alert('Atenção', 'Informe um valor válido.');
    await addCollaboratorPayment(selected.id, {
      tipo: payTipo,
      valor,
      data: new Date().toISOString().slice(0, 10),
      observacao: payObs || '',
      pago: true,
    });
    setPayOpen(false);
  };

  const header = isModal ? (
    <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Colaboradores</Text>
      <TouchableOpacity onPress={() => { playTapSound(); onClose?.(); }}><Ionicons name="close" size={24} color={colors.primary} /></TouchableOpacity>
    </View>
  ) : (
    <TopBar title="Colaboradores" colors={colors} hideOrganize />
  );

  const inputStyle = [s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {header}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <TouchableOpacity onPress={openCreate} style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary + '70', borderRadius: 12, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Cadastrar colaborador</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        {ordered.length === 0 ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary }}>Nenhum colaborador cadastrado</Text>
          </View>
        ) : ordered.map((c) => {
          const pagos = (c.pagamentos || []).reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
          return (
            <View key={c.id} style={[s.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{c.nome}</Text>
                  <Text style={{ color: colors.textSecondary, marginTop: 2 }}>{c.funcao}{c.habilitado === false ? ' · Sem habilitação' : ''}</Text>
                  {c.operadorCaixaAtivo ? (
                    <Text style={{ color: colors.primary, marginTop: 2, fontWeight: '600' }}>
                      Operador de caixa: {c.operadorCaixaId || '(sem ID)'}
                    </Text>
                  ) : null}
                  {c.telefone ? <Text style={{ color: colors.textSecondary, marginTop: 2 }}>{c.telefone}</Text> : null}
                  <Text style={{ color: colors.textSecondary, marginTop: 2 }}>Salário: {toMoney(c.salarioBase)} · Comissão: {Number(c.comissaoPercent || 0)}%</Text>
                  <Text style={{ color: colors.primary, marginTop: 4, fontWeight: '600' }}>Pagamentos registrados: {toMoney(pagos)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => openEdit(c)}><Ionicons name="pencil" size={20} color={colors.primary} /></TouchableOpacity>
                  <TouchableOpacity onPress={() => openPayment(c)}><Ionicons name="cash-outline" size={20} color="#10b981" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    playTapSound();
                    Alert.alert('Excluir', 'Excluir colaborador?', [{ text: 'Cancelar' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteCollaborator(c.id) }]);
                  }}><Ionicons name="trash-outline" size={20} color="#ef4444" /></TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={formOpen} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: isDesktopWeb ? 'flex-start' : 'center', padding: isDesktopWeb ? 0 : 12 }}>
            <View style={{ borderRadius: isDesktopWeb ? 0 : 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, maxHeight: isDesktopWeb ? '100%' : '92%', minHeight: isDesktopWeb ? '100%' : undefined }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{editing ? 'Editar colaborador' : 'Novo colaborador'}</Text>
                <TouchableOpacity onPress={() => setFormOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 14, paddingBottom: 28 }} showsVerticalScrollIndicator>
                <Text style={[s.label, { color: colors.textSecondary }]}>Nome completo *</Text>
                <TextInput value={form.nome} onChangeText={(t) => setF('nome', t)} placeholder="Nome" placeholderTextColor={colors.textSecondary} style={inputStyle} />

                <Text style={[s.sectionTitle, { color: colors.primary }]}>Documentos e contato</Text>
                <Text style={[s.label, { color: colors.textSecondary }]}>CPF</Text>
                <TextInput value={form.cpf} onChangeText={(t) => setF('cpf', t)} placeholder="000.000.000-00" placeholderTextColor={colors.textSecondary} style={inputStyle} keyboardType="numbers-and-punctuation" />
                <Text style={[s.label, { color: colors.textSecondary, marginTop: 10 }]}>RG</Text>
                <TextInput value={form.rg} onChangeText={(t) => setF('rg', t)} placeholder="Número do RG" placeholderTextColor={colors.textSecondary} style={inputStyle} />
                <Text style={[s.label, { color: colors.textSecondary, marginTop: 10 }]}>Estado civil</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {ESTADO_CIVIL.map((ec) => (
                    <TouchableOpacity key={ec} onPress={() => setF('estadoCivil', ec)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: form.estadoCivil === ec ? colors.primary : colors.border, backgroundColor: form.estadoCivil === ec ? colors.primary + '22' : 'transparent' }}>
                      <Text style={{ color: form.estadoCivil === ec ? colors.primary : colors.textSecondary, fontWeight: '600', fontSize: 12 }}>{ec}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={[s.label, { color: colors.textSecondary, marginTop: 10 }]}>Telefone / WhatsApp</Text>
                <TextInput value={form.telefone} onChangeText={(t) => setF('telefone', t)} placeholder="(00) 00000-0000" placeholderTextColor={colors.textSecondary} style={inputStyle} keyboardType="phone-pad" />
                <Text style={[s.label, { color: colors.textSecondary, marginTop: 10 }]}>E-mail</Text>
                <TextInput value={form.email} onChangeText={(t) => setF('email', t)} placeholder="email@exemplo.com" placeholderTextColor={colors.textSecondary} style={inputStyle} keyboardType="email-address" autoCapitalize="none" />
                <Text style={[s.label, { color: colors.textSecondary, marginTop: 10 }]}>Data de nascimento</Text>
                <TextInput value={form.dataNascimento} onChangeText={(t) => setF('dataNascimento', t)} placeholder="DD/MM/AAAA ou AAAA-MM-DD" placeholderTextColor={colors.textSecondary} style={inputStyle} />

                <Text style={[s.sectionTitle, { color: colors.primary }]}>Endereço</Text>
                <Text style={[s.label, { color: colors.textSecondary }]}>Logradouro</Text>
                <TextInput value={form.endereco} onChangeText={(t) => setF('endereco', t)} placeholder="Rua, número, bairro" placeholderTextColor={colors.textSecondary} style={inputStyle} />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: colors.textSecondary }]}>Cidade</Text>
                    <TextInput value={form.cidade} onChangeText={(t) => setF('cidade', t)} placeholder="Cidade" placeholderTextColor={colors.textSecondary} style={inputStyle} />
                  </View>
                  <View style={{ width: 120 }}>
                    <Text style={[s.label, { color: colors.textSecondary }]}>CEP</Text>
                    <TextInput value={form.cep} onChangeText={(t) => setF('cep', t)} placeholder="00000-000" placeholderTextColor={colors.textSecondary} style={inputStyle} keyboardType="numeric" />
                  </View>
                </View>
                <Text style={[s.label, { color: colors.textSecondary, marginTop: 10 }]}>Complemento</Text>
                <TextInput value={form.complemento} onChangeText={(t) => setF('complemento', t)} placeholder="Apto, bloco..." placeholderTextColor={colors.textSecondary} style={inputStyle} />

                <Text style={[s.sectionTitle, { color: colors.primary }]}>Função e remuneração</Text>
                <Text style={[s.label, { color: colors.textSecondary }]}>Função na empresa</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {FUNCOES.map((f) => (
                    <TouchableOpacity key={f} onPress={() => setF('funcao', f)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: form.funcao === f ? colors.primary : colors.border, backgroundColor: form.funcao === f ? colors.primary + '22' : 'transparent' }}>
                      <Text style={{ color: form.funcao === f ? colors.primary : colors.textSecondary, fontWeight: '600', fontSize: 12 }}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={[s.label, { color: colors.textSecondary, marginTop: 10 }]}>Salário base (R$)</Text>
                <TextInput value={form.salarioBase} onChangeText={(t) => setF('salarioBase', t)} placeholder="0,00" keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} style={inputStyle} />
                <Text style={[s.label, { color: colors.textSecondary, marginTop: 10 }]}>Comissão (%)</Text>
                <TextInput value={form.comissaoPercent} onChangeText={(t) => setF('comissaoPercent', t)} placeholder="0" keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} style={inputStyle} />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingVertical: 8 }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>Habilitado / credenciado</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>Marque se possui habilitação ou registro profissional exigido.</Text>
                  </View>
                  <Switch value={form.habilitado} onValueChange={(v) => setF('habilitado', v)} trackColor={{ false: colors.border, true: colors.primary + '88' }} thumbColor={form.habilitado ? colors.primary : '#f4f4f5'} />
                </View>

                <Text style={[s.sectionTitle, { color: colors.primary }]}>Operador de caixa (PDV)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>Habilitar como operador</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                      Quando ativo, este colaborador pode abrir caixa no PDV com ID e senha.
                    </Text>
                  </View>
                  <Switch
                    value={!!form.operadorCaixaAtivo}
                    onValueChange={(v) => setF('operadorCaixaAtivo', v)}
                    trackColor={{ false: colors.border, true: colors.primary + '88' }}
                    thumbColor={form.operadorCaixaAtivo ? colors.primary : '#f4f4f5'}
                  />
                </View>
                {form.operadorCaixaAtivo ? (
                  <>
                    <Text style={[s.label, { color: colors.textSecondary }]}>ID do operador</Text>
                    <TextInput
                      value={form.operadorCaixaId}
                      onChangeText={(t) => setF('operadorCaixaId', t)}
                      placeholder="ex: caixa01"
                      placeholderTextColor={colors.textSecondary}
                      style={inputStyle}
                      autoCapitalize="none"
                    />
                    <Text style={[s.label, { color: colors.textSecondary, marginTop: 10 }]}>Senha do operador</Text>
                    <TextInput
                      value={form.operadorCaixaSenha}
                      onChangeText={(t) => setF('operadorCaixaSenha', t)}
                      placeholder="Senha para abrir caixa"
                      placeholderTextColor={colors.textSecondary}
                      style={inputStyle}
                      secureTextEntry
                    />
                  </>
                ) : null}

                <Text style={[s.sectionTitle, { color: colors.primary }]}>Apresentação e experiência</Text>
                <Text style={[s.label, { color: colors.textSecondary }]}>Descrição / resumo profissional</Text>
                <TextInput value={form.descricao} onChangeText={(t) => setF('descricao', t)} placeholder="Breve resumo do perfil" placeholderTextColor={colors.textSecondary} style={[inputStyle, { minHeight: 72, textAlignVertical: 'top' }]} multiline />
                <Text style={[s.label, { color: colors.textSecondary, marginTop: 10 }]}>Currículo e experiências</Text>
                <TextInput value={form.curriculoExperiencias} onChangeText={(t) => setF('curriculoExperiencias', t)} placeholder="Experiências anteriores, cursos, certificações..." placeholderTextColor={colors.textSecondary} style={[inputStyle, { minHeight: 120, textAlignVertical: 'top' }]} multiline />
                <Text style={[s.label, { color: colors.textSecondary, marginTop: 10 }]}>Observações internas</Text>
                <TextInput value={form.observacoes} onChangeText={(t) => setF('observacoes', t)} placeholder="Anotações da empresa (opcional)" placeholderTextColor={colors.textSecondary} style={[inputStyle, { minHeight: 64, textAlignVertical: 'top' }]} multiline />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                  <TouchableOpacity onPress={() => setFormOpen(false)} style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: colors.border }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={save} style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: colors.primary }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={payOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 18 }}>
          <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 14, gap: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Pagamento de salário/comissão</Text>
            <Text style={{ color: colors.textSecondary }}>{selected?.nome || ''}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => setPayTipo('salario')} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: payTipo === 'salario' ? colors.primary : colors.border, backgroundColor: payTipo === 'salario' ? colors.primary + '26' : 'transparent', alignItems: 'center' }}><Text style={{ color: payTipo === 'salario' ? colors.primary : colors.textSecondary }}>Salário</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setPayTipo('comissao')} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: payTipo === 'comissao' ? colors.primary : colors.border, backgroundColor: payTipo === 'comissao' ? colors.primary + '26' : 'transparent', alignItems: 'center' }}><Text style={{ color: payTipo === 'comissao' ? colors.primary : colors.textSecondary }}>Comissão</Text></TouchableOpacity>
            </View>
            <TextInput value={payValor} onChangeText={setPayValor} placeholder="Valor (R$)" keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} style={[s.input, { borderColor: colors.border, color: colors.text }]} />
            <TextInput value={payObs} onChangeText={setPayObs} placeholder="Observação (opcional)" placeholderTextColor={colors.textSecondary} style={[s.input, { borderColor: colors.border, color: colors.text }]} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setPayOpen(false)} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: colors.border }}><Text style={{ color: colors.text }}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={savePayment} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: colors.primary }}><Text style={{ color: '#fff', fontWeight: '700' }}>Registrar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
