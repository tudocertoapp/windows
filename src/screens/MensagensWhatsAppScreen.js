import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  InteractionManager,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useFinance } from '../contexts/FinanceContext';
import { usePlan } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import { openWhatsApp as openWhatsAppUtil, formatPhoneForWhatsApp } from '../utils/whatsapp';
import { ClienteModal } from '../components/ClienteModal';
import { playTapSound } from '../utils/sounds';
import { formatCurrency } from '../utils/format';

const TEMPLATES_KEY = '@tudocerto_msg_templates';
const CADASTRO_LINK_KEY = '@tudocerto_cadastro_link_url';
const SUGGESTED_TEMPLATES = [
  'Como está a cicatrização da tatuagem?',
  'Bora fazer outra tattoo? Estou com promoção!',
  'Feliz aniversário! Desejo um dia especial!',
  'Olá! Temos novidades. Quer agendar?',
];

const openWhatsApp = openWhatsAppUtil;

const NIVEL_LABELS = { orcamento: 'Orçamento', lead: 'Lead', fechou: 'Fechou' };
const NIVEL_COLORS = { orcamento: '#6b7280', lead: '#f59e0b', fechou: '#10b981' };

export function MensagensWhatsAppScreen({ onClose, isModal }) {
  const { colors } = useTheme();
  const { clients, addClient, updateClient, deleteClient, agendaEvents } = useFinance();
  const { showEmpresaFeatures, viewMode } = usePlan();
  const { user } = useAuth();
  const [tab, setTab] = useState('crm');
  const [nivelFilter, setNivelFilter] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [search, setSearch] = useState('');
  const [editingClient, setEditingClient] = useState(null);
  const [newClientFromContact, setNewClientFromContact] = useState(null);
  const [cadastroLinkUrl, setCadastroLinkUrl] = useState('');

  const loadTemplates = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(TEMPLATES_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      setTemplates(arr.length ? arr : SUGGESTED_TEMPLATES);
    } catch {
      setTemplates(SUGGESTED_TEMPLATES);
    }
  }, []);

  const saveTemplates = useCallback(async (list) => {
    setTemplates(list);
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(list));
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    AsyncStorage.getItem(CADASTRO_LINK_KEY).then((v) => setCadastroLinkUrl(v || ''));
  }, []);

  useEffect(() => {
    if (tab === 'contatos' && contacts.length === 0 && !loadingContacts) {
      loadContacts();
    }
  }, [tab]);

  const loadContacts = async () => {
    playTapSound();
    setLoadingContacts(true);
    setContacts([]);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão', 'Permita acesso aos contatos para importar.');
        setLoadingContacts(false);
        return;
      }
      const BATCH = 10;
      const DELAY_MS = 80;
      let pageOffset = 0;
      let hasNext = true;
      while (hasNext) {
        const { data, hasNextPage } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
          pageSize: BATCH,
          pageOffset,
        });
        const batch = (data || []).filter((c) => c.phoneNumbers?.length > 0);
        setContacts((prev) => [...prev, ...batch]);
        hasNext = !!hasNextPage && (data?.length === BATCH);
        pageOffset += BATCH;
        if (hasNext) {
          await new Promise((r) => setTimeout(r, DELAY_MS));
          await new Promise((resolve) => InteractionManager.runAfterInteractions(resolve));
        }
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar os contatos.');
    }
    setLoadingContacts(false);
  };

  const addTemplate = () => {
    const t = newTemplate.trim();
    if (!t) return;
    playTapSound();
    const next = templates.includes(t) ? templates : [t, ...templates];
    saveTemplates(next);
    setNewTemplate('');
  };

  const clientsWithPhone = clients.filter((c) => c.phone?.trim());
  const searchLower = search.toLowerCase().trim();
  const filteredClients = searchLower
    ? clientsWithPhone.filter((c) => (c.name || '').toLowerCase().includes(searchLower) || (c.phone || '').includes(search))
    : clientsWithPhone;
  const getContactPhone = (c) => (c.phoneNumbers && c.phoneNumbers[0] ? c.phoneNumbers[0].number : '');
  const formatPhoneDisplay = (phoneStr) => {
    const p = String(phoneStr || '').replace(/\D/g, '');
    if (p.length === 11 && p.startsWith('1')) return p.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if (p.length === 10) return p.replace(/^(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    return phoneStr;
  };
  const filteredContacts = useMemo(() => {
    if (!searchLower) return contacts;
    const list = contacts.filter(
      (c) => (c.name || '').toLowerCase().includes(searchLower) || getContactPhone(c).includes(search)
    );
    const q = searchLower;
    return list.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      const phoneA = getContactPhone(a);
      const phoneB = getContactPhone(b);
      const aStarts = nameA.startsWith(q) ? 2 : nameA.includes(q) ? 1 : phoneA.includes(search) ? 0 : -1;
      const bStarts = nameB.startsWith(q) ? 2 : nameB.includes(q) ? 1 : phoneB.includes(search) ? 0 : -1;
      if (bStarts !== aStarts) return bStarts - aStarts;
      return nameA.localeCompare(nameB);
    });
  }, [contacts, searchLower, search]);

  const parseBirthDate = (str) => {
    if (!str || !String(str).trim()) return null;
    const parts = String(str).trim().split(/[/\-]/);
    if (parts.length < 2) return null;
    const day = parseInt(parts[0], 10) || 1;
    const month = (parseInt(parts[1], 10) || 1) - 1;
    const year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear();
    return new Date(year, month, day);
  };
  const aniversariantes = clients.filter((c) => {
    const bd = c.birthDate || c.dataNascimento;
    if (!bd) return false;
    const d = parseBirthDate(bd) || new Date(bd);
    if (isNaN(d.getTime())) return false;
    const hoje = new Date();
    return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth();
  });
  const getWeekRange = () => {
    const h = new Date();
    const day = h.getDay();
    const diff = h.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(h);
    mon.setDate(diff);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: mon, end: sun };
  };
  const aniversariantesSemana = clients.filter((c) => {
    const bd = c.birthDate || c.dataNascimento;
    if (!bd) return false;
    const d = parseBirthDate(bd) || new Date(bd);
    if (isNaN(d.getTime())) return false;
    const { start, end } = getWeekRange();
    const bdThisYear = new Date(new Date().getFullYear(), d.getMonth(), d.getDate());
    return bdThisYear >= start && bdThisYear <= end;
  });

  const clientesComAgenda = useMemo(() => {
    return clients.map((c) => ({
      ...c,
      agendamentos: agendaEvents.filter((e) => e.clientId === c.id).length,
      concluidos: agendaEvents.filter((e) => e.clientId === c.id && e.status === 'concluido').length,
      totalRecebido: agendaEvents.filter((e) => e.clientId === c.id && e.status === 'concluido').reduce((s, e) => s + (e.amount || 0), 0),
    }));
  }, [clients, agendaEvents]);

  const clientesCrm = useMemo(() => {
    let list = clientesComAgenda;
    if (nivelFilter) list = list.filter((c) => (c.nivel || '') === nivelFilter);
    return list;
  }, [clientesComAgenda, nivelFilter]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>WhatsApp e CRM</Text>
          {isModal && onClose && (
              <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryRgba?.(0.2), justifyContent: 'center', alignItems: 'center' }} onPress={() => { playTapSound(); onClose(); }}>
                <Ionicons name="close" size={22} color={colors.primary} />
              </TouchableOpacity>
            )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'stretch', borderRadius: 10, backgroundColor: colors.primaryRgba?.(0.08), padding: 4 }}>
        <TouchableOpacity
          style={[s.tabEqual, tab === 'crm' && { backgroundColor: colors.primary }]}
          onPress={() => { playTapSound(); setTab('crm'); }}
        >
          <Ionicons name="briefcase-outline" size={18} color={tab === 'crm' ? '#fff' : colors.primary} />
          <Text style={[s.tabText, { color: tab === 'crm' ? '#fff' : colors.text }]} numberOfLines={1}>Clientes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabEqual, tab === 'conversar' && { backgroundColor: colors.primary }]}
          onPress={() => { playTapSound(); setTab('conversar'); }}
        >
          <Ionicons name="logo-whatsapp" size={20} color={tab === 'conversar' ? '#fff' : colors.primary} />
          <Text style={[s.tabText, { color: tab === 'conversar' ? '#fff' : colors.text }]} numberOfLines={1}>Conversar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabEqual, tab === 'contatos' && { backgroundColor: colors.primary }]}
          onPress={() => { playTapSound(); setTab('contatos'); }}
        >
          {loadingContacts ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="call-outline" size={18} color={tab === 'contatos' ? '#fff' : colors.primary} />
          )}
          <Text style={[s.tabText, { color: tab === 'contatos' ? '#fff' : colors.text }]} numberOfLines={1}>Contatos</Text>
        </TouchableOpacity>
        </View>
      </View>

      {tab === 'contatos' ? (
        <FlatList
          style={{ flex: 1 }}
          data={filteredContacts}
          keyExtractor={(c) => c.id || `${c.name}-${getContactPhone(c)}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <Text style={[s.sectionTitle, { color: colors.textSecondary, marginBottom: 8 }]}>
                Seus contatos (visualização). Toque em + para cadastrar como cliente.
              </Text>
              <TouchableOpacity
                style={[s.importBtn, { backgroundColor: colors.primaryRgba?.(0.1), borderColor: colors.primary }]}
                onPress={loadContacts}
                disabled={loadingContacts}
              >
                {loadingContacts ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={22} color={colors.primary} />}
                <Text style={[s.importBtnText, { color: colors.primary }]}>{contacts.length ? 'Atualizar lista' : 'Carregar contatos'}</Text>
              </TouchableOpacity>
              <TextInput
                style={[s.search, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, marginTop: 12 }]}
                placeholder="Buscar contato..."
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
              />
            </>
          }
          ListEmptyComponent={
            <Text style={[s.empty, { color: colors.textSecondary }]}>
              {contacts.length === 0 ? (loadingContacts ? 'Carregando...' : 'Toque em "Carregar contatos" para visualizar.') : 'Nenhum contato encontrado.'}
            </Text>
          }
          renderItem={({ item: cont }) => {
            const phone = getContactPhone(cont);
            const alreadyClient = clients.some((c) => formatPhoneForWhatsApp(c.phone) === formatPhoneForWhatsApp(phone));
            return (
              <View style={[s.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[s.rowTitle, { color: colors.text }]}>{cont.name || 'Sem nome'}</Text>
                  <Text style={[s.rowSub, { color: colors.textSecondary }]}>{phone}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {!alreadyClient && showEmpresaFeatures && (
                    <TouchableOpacity
                      style={[s.addBtn, { backgroundColor: colors.primaryRgba?.(0.2) }]}
                      onPress={() => {
                        playTapSound();
                        setNewClientFromContact({
                          name: cont.name || 'Contato',
                          phone: formatPhoneDisplay(phone) || phone,
                        });
                      }}
                    >
                      <Ionicons name="person-add" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                  {showEmpresaFeatures && user && cadastroLinkUrl && (
                    <TouchableOpacity
                      style={[s.linkBtn, { backgroundColor: colors.primaryRgba?.(0.15) }]}
                      onPress={() => {
                        playTapSound();
                        const sep = cadastroLinkUrl.includes('?') ? '&' : '?';
                        const fullUrl = `${cadastroLinkUrl}${sep}ref=${encodeURIComponent(user.id)}`;
                        openWhatsApp(phone, `Olá! Por favor preencha seu cadastro: ${fullUrl}`);
                      }}
                    >
                      <Ionicons name="link" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
      ) : (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {tab === 'crm' && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>Clientes (CRM) · {clients.length}</Text>
              <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={() => { playTapSound(); setEditingClient(null); setNewClientFromContact({}); }}>
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4, marginBottom: 12 }}>
              <TouchableOpacity
                style={[s.nivelChip, { borderColor: colors.border }, !nivelFilter && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => { playTapSound(); setNivelFilter(null); }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: !nivelFilter ? '#fff' : colors.text }}>Todos</Text>
              </TouchableOpacity>
              {(['lead', 'orcamento', 'fechou']).map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[s.nivelChip, nivelFilter === n && { backgroundColor: NIVEL_COLORS[n] }, { borderColor: NIVEL_COLORS[n] }]}
                  onPress={() => { playTapSound(); setNivelFilter(n); }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: nivelFilter === n ? '#fff' : NIVEL_COLORS[n] }}>{NIVEL_LABELS[n]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {clientesCrm.length === 0 ? (
              <View style={[s.empty, { paddingVertical: 48, alignItems: 'center', gap: 12 }]}>
                <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                <Text style={{ fontSize: 15, color: colors.textSecondary }}>Nenhum cliente{nivelFilter ? ` como ${NIVEL_LABELS[nivelFilter]}` : ''}</Text>
              </View>
            ) : (
              clientesCrm.map((c) => (
                <View key={c.id} style={[s.crmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {c.foto ? (
                    <Image source={{ uri: c.foto }} style={[s.crmAvatar, { backgroundColor: colors.primaryRgba?.(0.2) }]} resizeMode="cover" />
                  ) : (
                    <View style={[s.crmAvatar, { backgroundColor: colors.primaryRgba?.(0.2), justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="person" size={24} color={colors.primary} />
                    </View>
                  )}
                  <View style={s.crmCardBody}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={[s.crmCardName, { color: colors.text }]}>{c.name}</Text>
                      {c.nivel && (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: (NIVEL_COLORS[c.nivel] || colors.border) + '30' }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: NIVEL_COLORS[c.nivel] || colors.text }}>{NIVEL_LABELS[c.nivel] || c.nivel}</Text>
                        </View>
                      )}
                    </View>
                    {c.email ? <Text style={[s.crmCardInfo, { color: colors.textSecondary }]}>{c.email}</Text> : null}
                    {c.phone ? <Text style={[s.crmCardInfo, { color: colors.textSecondary }]}>{c.phone}</Text> : null}
                    <View style={s.crmRow}>
                      <View style={[s.crmBox, { backgroundColor: colors.primaryRgba?.(0.15) }]}>
                        <Text style={[s.crmNum, { color: colors.primary }]}>{c.agendamentos || 0}</Text>
                        <Text style={[s.crmLabel, { color: colors.textSecondary }]}>Agendados</Text>
                      </View>
                      <View style={[s.crmBox, { backgroundColor: colors.primaryRgba?.(0.15) }]}>
                        <Text style={[s.crmNum, { color: colors.primary }]}>{c.concluidos || 0}</Text>
                        <Text style={[s.crmLabel, { color: colors.textSecondary }]}>Concluídos</Text>
                      </View>
                      <View style={[s.crmBox, { backgroundColor: colors.primaryRgba?.(0.15) }]}>
                        <Text style={[s.crmNum, { color: colors.primary, fontSize: 14 }]} numberOfLines={1}>{formatCurrency(c.totalRecebido || 0)}</Text>
                        <Text style={[s.crmLabel, { color: colors.textSecondary }]}>Recebido</Text>
                      </View>
                    </View>
                    <View style={s.actionRow}>
                      <TouchableOpacity onPress={() => { playTapSound(); setNewClientFromContact(null); setEditingClient(c); }} style={[s.actionBtn, { backgroundColor: 'transparent' }]}>
                        <Ionicons name="pencil" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => Alert.alert('Excluir', 'Remover este cliente?', [{ text: 'Cancelar' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteClient(c.id) }])}
                        style={[s.actionBtn, { backgroundColor: 'transparent' }]}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {c.phone?.trim() ? (
                    <TouchableOpacity onPress={() => { playTapSound(); openWhatsApp(c.phone); }} style={[s.whatsappIconBtn, { backgroundColor: 'transparent' }]}>
                      <Ionicons name="logo-whatsapp" size={22} color={colors.primary} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  )}
                </View>
              ))
            )}
          </>
        )}
        {tab === 'conversar' && (
          <>
            <View style={[s.modelosCard, { backgroundColor: colors.primaryRgba?.(0.12), borderColor: colors.primary + '60', borderWidth: 2 }]}>
              <Text style={[s.modelosTitle, { color: colors.text }]}>Mensagens automáticas</Text>
              <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Modelo selecionado (usa ao enviar)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4, marginBottom: 12 }}>
                {templates.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[s.templateChip, selectedTemplate === t ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => { playTapSound(); setSelectedTemplate(selectedTemplate === t ? '' : t); }}
                  >
                    <Text style={[s.templateChipText, { color: selectedTemplate === t ? '#fff' : colors.text }]} numberOfLines={2}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Nova mensagem padrão</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="Ex: Como está a cicatrização?"
                placeholderTextColor={colors.textSecondary}
                value={newTemplate}
                onChangeText={setNewTemplate}
                multiline
              />
              <TouchableOpacity style={[s.addTemplateBtn, { backgroundColor: colors.primary }]} onPress={addTemplate}>
                <Ionicons name="add" size={22} color="#fff" />
                <Text style={s.addTemplateBtnText}>Criar mensagem automatica</Text>
              </TouchableOpacity>
              <Text style={[s.hint, { color: colors.textSecondary, marginTop: 12 }]}>Os modelos aparecem ao escolher um acima antes de enviar.</Text>
            </View>
            {showEmpresaFeatures && (
              <View style={[s.modelosCard, { backgroundColor: colors.primaryRgba?.(0.08), borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={[s.modelosTitle, { color: colors.text }]}>Link de cadastro para o cliente</Text>
                <Text style={[s.hint, { color: colors.textSecondary, marginBottom: 12 }]}>Envie o link por WhatsApp para o cliente preencher. Dados vão ao Supabase.</Text>
                <TextInput
                  style={[s.input, { minHeight: 44, backgroundColor: colors.card }]}
                  placeholder="https://seu-formulario.com/cadastro"
                  placeholderTextColor={colors.textSecondary}
                  value={cadastroLinkUrl}
                  onChangeText={setCadastroLinkUrl}
                />
                <TouchableOpacity
                  style={[s.addTemplateBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
                  onPress={async () => {
                    playTapSound();
                    await AsyncStorage.setItem(CADASTRO_LINK_KEY, cadastroLinkUrl);
                    Alert.alert('Salvo', 'Link configurado.');
                  }}
                >
                  <Text style={s.addTemplateBtnText}>Salvar link</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={[s.sectionTitle, { color: colors.textSecondary, marginTop: 20, marginBottom: 4 }]}>Clientes com WhatsApp</Text>
            <TextInput
              style={[s.search, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, marginTop: 12, marginBottom: 12 }]}
              placeholder="Buscar cliente..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            {filteredClients.length === 0 ? (
              <Text style={[s.empty, { color: colors.textSecondary }]}>
                {clientsWithPhone.length === 0 ? 'Nenhum cliente com WhatsApp. Cadastre clientes com número.' : 'Nenhum cliente encontrado.'}
              </Text>
            ) : (
              filteredClients.map((c) => (
                <View key={c.id} style={[s.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.rowTitle, { color: colors.text }]}>{c.name}</Text>
                    <Text style={[s.rowSub, { color: colors.textSecondary }]}>{c.phone}</Text>
                  </View>
                      {showEmpresaFeatures && (
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                          <TouchableOpacity
                            style={[s.editRoundBtn, { backgroundColor: 'transparent' }]}
                            onPress={() => { playTapSound(); setEditingClient(c); }}
                          >
                            <Ionicons name="pencil" size={20} color={colors.primary} />
                          </TouchableOpacity>
                          {user && cadastroLinkUrl && (
                            <TouchableOpacity
                              style={[s.linkBtn, { backgroundColor: colors.primaryRgba?.(0.15) }]}
                              onPress={() => {
                                playTapSound();
                                const sep = cadastroLinkUrl.includes('?') ? '&' : '?';
                                openWhatsApp(c.phone, `Olá! Por favor preencha seu cadastro: ${cadastroLinkUrl}${sep}ref=${encodeURIComponent(user.id)}`);
                              }}
                            >
                              <Ionicons name="link" size={20} color={colors.primary} />
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                      <TouchableOpacity
                        style={[s.whatsappRoundBtn, { backgroundColor: 'transparent', flexShrink: 0 }]}
                        onPress={() => { playTapSound(); openWhatsApp(c.phone, selectedTemplate || ''); }}
                      >
                        <Ionicons name="logo-whatsapp" size={20} color={colors.primary} />
                      </TouchableOpacity>
                </View>
              ))
            )}
            <View style={[s.birthdayBanner, { backgroundColor: aniversariantesSemana.length > 0 ? colors.primaryRgba?.(0.2) : colors.primaryRgba?.(0.08), borderColor: colors.primary, marginTop: 20 }]}>
              <Text style={[s.birthdayBannerText, { color: colors.text }]}>
                {aniversariantesSemana.length > 0
                  ? (showEmpresaFeatures && viewMode === 'empresa'
                    ? '🎂 Lembrete: clientes fazendo aniversário esta semana! Mande uma mensagem.'
                    : '🎂 Lembrete: amigos e familiares fazendo aniversário esta semana! Mande uma mensagem.')
                  : (showEmpresaFeatures && viewMode === 'empresa'
                    ? '🎂 Cadastre a data de nascimento dos clientes para receber avisos de aniversário da semana.'
                    : '🎂 Cadastre a data de nascimento para lembrar de amigos e familiares.')}
              </Text>
            </View>
            {aniversariantesSemana.length > 0 && (
              <View style={[s.section, { backgroundColor: colors.primaryRgba?.(0.1), borderColor: colors.primary + '40', marginTop: 12 }]}>
                <Text style={[s.sectionTitle, { color: colors.primary }]}>🎂 Aniversariantes da semana</Text>
                {aniversariantesSemana.map((c) => {
                  const msg = selectedTemplate || `Feliz aniversário, ${(c.name || '').split(' ')[0]}! Desejo um dia especial! 🎉`;
                  return (
                    <View key={c.id} style={[s.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[s.rowTitle, { color: colors.text }]}>{c.name}</Text>
                        <Text style={[s.rowSub, { color: colors.textSecondary }]}>{c.phone}</Text>
                      </View>
                      {showEmpresaFeatures && (
                        <TouchableOpacity
                          style={[s.editRoundBtn, { backgroundColor: 'transparent' }]}
                          onPress={() => { playTapSound(); setEditingClient(c); }}
                        >
                          <Ionicons name="pencil" size={20} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[s.whatsappRoundBtn, { backgroundColor: 'transparent' }]}
                        onPress={() => { playTapSound(); openWhatsApp(c.phone, msg); }}
                      >
                        <Ionicons name="logo-whatsapp" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
      )}
      <ClienteModal
        visible={!!editingClient}
        cliente={editingClient}
        onSave={(data) => {
          if (editingClient?.id) {
            updateClient(editingClient.id, data);
          }
          setEditingClient(null);
        }}
        onClose={() => setEditingClient(null)}
      />
      <ClienteModal
        visible={!!newClientFromContact}
        cliente={newClientFromContact}
        onSave={(data) => {
          addClient(data);
          setNewClientFromContact(null);
          Alert.alert('Sucesso', 'Cliente cadastrado.');
        }}
        onClose={() => setNewClientFromContact(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  tabEqual: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8 },
  tabText: { fontSize: 12, fontWeight: '600' },
  nivelChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginRight: 8 },
  crmCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, overflow: 'visible' },
  crmAvatar: { width: 44, height: 44, borderRadius: 22 },
  crmCardBody: { flex: 1, minWidth: 0 },
  crmCardName: { fontSize: 15, fontWeight: '700' },
  crmCardInfo: { fontSize: 12, marginTop: 1 },
  crmRow: { flexDirection: 'row', gap: 6, marginTop: 4, alignSelf: 'stretch' },
  crmBox: { flex: 1, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 6, alignItems: 'center', justifyContent: 'center', minHeight: 36 },
  crmNum: { fontSize: 14, fontWeight: '800' },
  crmLabel: { fontSize: 9, marginTop: 1 },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center' },
  actionBtn: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'visible' },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  importBtnText: { fontSize: 14, fontWeight: '600' },
  section: { padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  search: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginBottom: 6, overflow: 'visible' },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 1 },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  addBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', overflow: 'visible' },
  whatsappIconBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'visible' },
  whatsappRoundBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', overflow: 'visible' },
  editBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'visible' },
  editRoundBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', overflow: 'visible' },
  linkBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'visible' },
  birthdayBanner: { padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  birthdayBannerText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  templateSection: { padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  modelosCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  modelosTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  enviarBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, overflow: 'visible' },
  enviarBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  templateChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginRight: 8, borderWidth: 1, maxWidth: 200 },
  templateChipText: { fontSize: 12, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 72, textAlignVertical: 'top', marginBottom: 12 },
  addTemplateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, minHeight: 44 },
  addTemplateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 12, marginTop: 12 },
});
