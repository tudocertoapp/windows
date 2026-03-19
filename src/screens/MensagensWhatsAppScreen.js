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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useFinance } from '../contexts/FinanceContext';
import { usePlan } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { openWhatsApp as openWhatsAppUtil, formatPhoneForWhatsApp } from '../utils/whatsapp';
import { ClienteModal } from '../components/ClienteModal';
import { ClienteDetalheModal } from '../components/ClienteDetalheModal';
import { CatalogoScreen } from './CatalogoScreen';
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

const NIVEL_OPTIONS = [
  { id: 'novo_cliente', label: 'Novo cliente', color: '#84cc16' },
  { id: 'orcamento', label: 'Orçamento', color: '#6b7280' },
  { id: 'proposta', label: 'Proposta', color: '#8b5cf6' },
  { id: 'agendado', label: 'Agendado', color: '#0ea5e9' },
  { id: 'fixo', label: 'Fixo', color: '#10b981' },
  { id: 'lead', label: 'Lead', color: '#f59e0b' },
  { id: 'fechou', label: 'Fechou', color: '#10b981' },
];

export function MensagensWhatsAppScreen({ onClose, isModal }) {
  const { colors } = useTheme();
  const { clients, addClient, updateClient, deleteClient, agendaEvents, services, products } = useFinance();
  const { showEmpresaFeatures, viewMode } = usePlan();
  const { user } = useAuth();
  const [tab, setTab] = useState('crm');
  const [nivelFilter, setNivelFilter] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [editingTemplateIndex, setEditingTemplateIndex] = useState(null);
  const [editingTemplateText, setEditingTemplateText] = useState('');
  const [whatsappModalPhrase, setWhatsappModalPhrase] = useState(null);
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [search, setSearch] = useState('');
  const [searchFrases, setSearchFrases] = useState('');
  const [frasesDropdownOpen, setFrasesDropdownOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [newClientFromContact, setNewClientFromContact] = useState(null);
  const [cadastroLinkUrl, setCadastroLinkUrl] = useState('');
  const [conversarClientModal, setConversarClientModal] = useState(null);
  const [conversarFraseFilter, setConversarFraseFilter] = useState('');
  const [nivelFilterDropdownOpen, setNivelFilterDropdownOpen] = useState(false);
  const [nivelPickerClient, setNivelPickerClient] = useState(null);
  const [verClienteDetalhe, setVerClienteDetalhe] = useState(null);

  const normalizeTemplate = (t) => (typeof t === 'string' ? { text: t, photos: [] } : { text: t?.text || '', photos: Array.isArray(t?.photos) ? t.photos.slice(0, 2) : [] });
  const loadTemplates = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(TEMPLATES_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      const list = arr.length ? arr : SUGGESTED_TEMPLATES;
      setTemplates(list.map((t) => normalizeTemplate(t)));
    } catch {
      setTemplates(SUGGESTED_TEMPLATES.map((t) => ({ text: t, photos: [] })));
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
    const obj = { text: t, photos: [] };
    const norm = templates.map(normalizeTemplate);
    const exists = norm.some((x) => x.text === t);
    const next = exists ? norm : [obj, ...norm];
    saveTemplates(next);
    setNewTemplate('');
  };

  const deleteTemplate = (index) => {
    playTapSound();
    const txt = typeof templates[index] === 'string' ? templates[index] : templates[index]?.text;
    Alert.alert('Excluir', 'Remover esta frase?', [
      { text: 'Cancelar' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          const next = templates.filter((_, i) => i !== index);
          saveTemplates(next);
          if (selectedTemplate === txt) setSelectedTemplate('');
        },
      },
    ]);
  };

  const [editingTemplatePhotos, setEditingTemplatePhotos] = useState([]);

  const startEditTemplate = (index) => {
    playTapSound();
    const item = templates[index];
    const obj = normalizeTemplate(item);
    setEditingTemplateIndex(index);
    setEditingTemplateText(obj.text);
    setEditingTemplatePhotos(obj.photos || []);
  };

  const pickTemplatePhoto = async () => {
    if (editingTemplatePhotos.length >= 2) return Alert.alert('Limite', 'Máximo 2 fotos por mensagem.');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão', 'Precisamos de acesso à galeria.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setEditingTemplatePhotos((prev) => [...prev.slice(0, 1), result.assets[0].uri].slice(0, 2));
    }
  };

  const removeTemplatePhoto = (idx) => {
    setEditingTemplatePhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveEditTemplate = () => {
    const t = editingTemplateText.trim();
    if (!t || editingTemplateIndex == null) return;
    playTapSound();
    const oldTxt = typeof templates[editingTemplateIndex] === 'string' ? templates[editingTemplateIndex] : templates[editingTemplateIndex]?.text;
    const next = templates.map((x, i) =>
      i === editingTemplateIndex ? { text: t, photos: editingTemplatePhotos.slice(0, 2) } : normalizeTemplate(x)
    );
    saveTemplates(next);
    if (selectedTemplate === oldTxt) setSelectedTemplate(t);
    setEditingTemplateIndex(null);
    setEditingTemplateText('');
    setEditingTemplatePhotos([]);
  };

  const openWhatsappModal = (template) => {
    playTapSound();
    const txt = typeof template === 'string' ? template : template?.text || '';
    setWhatsappModalPhrase(txt);
    setSelectedClientIds([]);
  };

  const toggleClientSelection = (id) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const enviarParaClientes = () => {
    if (!whatsappModalPhrase) return;
    const clientsToSend = clientsWithPhone.filter((c) => selectedClientIds.includes(c.id));
    clientsToSend.forEach((c, i) => {
      setTimeout(() => openWhatsApp(c.phone, whatsappModalPhrase), i * 300);
    });
    setWhatsappModalPhrase(null);
  };

  const copiarFrase = async () => {
    if (!whatsappModalPhrase) return;
    try {
      await Clipboard.setStringAsync(whatsappModalPhrase);
      Alert.alert('Copiado!', 'A frase foi copiada para a área de transferência.');
      setWhatsappModalPhrase(null);
    } catch {
      Alert.alert('Erro', 'Não foi possível copiar.');
    }
  };

  const clientsWithPhone = clients.filter((c) => c.phone?.trim() && (c.tipo || 'empresa') === (viewMode === 'empresa' ? 'empresa' : 'pessoal'));
  const searchLower = search.toLowerCase().trim();
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
  const tipoFiltro = showEmpresaFeatures ? 'empresa' : (viewMode === 'empresa' ? 'empresa' : 'pessoal');
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
    if ((c.tipo || 'empresa') !== tipoFiltro) return false;
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
    let list = clientesComAgenda.filter((c) => (c.tipo || 'empresa') === tipoFiltro);
    if (nivelFilter) list = list.filter((c) => (c.nivel || '') === nivelFilter);
    return list;
  }, [clientesComAgenda, nivelFilter, tipoFiltro]);

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
          <Text style={[s.tabText, { color: tab === 'conversar' ? '#fff' : colors.text }]} numberOfLines={1}>Mensagens</Text>
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
        {showEmpresaFeatures && (
        <TouchableOpacity
          style={[s.tabEqual, tab === 'catalogo' && { backgroundColor: colors.primary }]}
          onPress={() => { playTapSound(); setTab('catalogo'); }}
        >
          <Ionicons name="grid-outline" size={18} color={tab === 'catalogo' ? '#fff' : colors.primary} />
          <Text style={[s.tabText, { color: tab === 'catalogo' ? '#fff' : colors.text }]} numberOfLines={1}>Catálogo</Text>
        </TouchableOpacity>
        )}
        </View>
      </View>

      {tab === 'catalogo' ? (
        <CatalogoScreen isModal={false} />
      ) : tab === 'contatos' ? (
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
                style={[s.search, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, marginTop: 12, marginBottom: 12 }]}
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
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>{tipoFiltro === 'empresa' ? 'Clientes (CRM)' : 'Família e amigos'} · {clientesCrm.length}</Text>
              <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={() => { playTapSound(); setEditingClient(null); setNewClientFromContact({}); }}>
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={[s.filterDropdownWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[s.filterDropdownBtn, { borderColor: colors.border }]}
                onPress={() => { playTapSound(); setNivelFilterDropdownOpen(!nivelFilterDropdownOpen); }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  {!nivelFilter ? 'Filtrar: Todos' : `Filtrar: ${NIVEL_OPTIONS.find((o) => o.id === nivelFilter)?.label || nivelFilter}`}
                </Text>
                <Ionicons name={nivelFilterDropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {nivelFilterDropdownOpen && (
                <View style={[s.filterDropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[s.filterDropdownItem, { borderBottomColor: colors.border }]}
                    onPress={() => { playTapSound(); setNivelFilter(null); setNivelFilterDropdownOpen(false); }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Todos</Text>
                  </TouchableOpacity>
                  {NIVEL_OPTIONS.map((o) => (
                    <TouchableOpacity
                      key={o.id}
                      style={[s.filterDropdownItem, { borderBottomColor: colors.border }]}
                      onPress={() => { playTapSound(); setNivelFilter(o.id); setNivelFilterDropdownOpen(false); }}
                    >
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: o.color, marginRight: 8 }} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            {clientesCrm.length === 0 ? (
              <View style={[s.empty, { paddingVertical: 48, alignItems: 'center', gap: 12 }]}>
                <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                <Text style={{ fontSize: 15, color: colors.textSecondary }}>Nenhum cliente{nivelFilter ? ` como ${NIVEL_OPTIONS.find((o) => o.id === nivelFilter)?.label || nivelFilter}` : ''}</Text>
              </View>
            ) : (
              clientesCrm.map((c) => (
                <View key={c.id} style={[s.crmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={s.crmLeftCol}>
                    {c.foto ? (
                      <Image source={{ uri: c.foto }} style={[s.crmAvatar, { backgroundColor: colors.primaryRgba?.(0.2) }]} resizeMode="cover" />
                    ) : (
                      <View style={[s.crmAvatar, { backgroundColor: colors.primaryRgba?.(0.2), justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="person" size={24} color={colors.primary} />
                      </View>
                    )}
                  </View>
                  <View style={s.crmCardBody}>
                    <View style={s.crmNameRow}>
                      <Text style={[s.crmCardName, s.crmCardNameFlex, { color: colors.text }]} numberOfLines={1}>{c.name}</Text>
                      <View style={s.crmNameRight}>
                        <TouchableOpacity onPress={() => { playTapSound(); setVerClienteDetalhe(c); }} style={[s.actionBtn, { backgroundColor: 'transparent' }]}>
                          <Ionicons name="eye-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { playTapSound(); setNewClientFromContact(null); setEditingClient(c); }} style={[s.actionBtn, { backgroundColor: 'transparent' }]}>
                          <Ionicons name="pencil" size={18} color={colors.primary} />
                        </TouchableOpacity>
                        {c.phone?.trim() ? (
                          <TouchableOpacity onPress={() => { playTapSound(); setConversarClientModal(c); }} style={[s.actionBtn, { backgroundColor: 'transparent' }]}>
                            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                          </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                          onPress={() => Alert.alert('Excluir', 'Remover este cliente?', [{ text: 'Cancelar' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteClient(c.id) }])}
                          style={[s.actionBtn, { backgroundColor: 'transparent' }]}
                        >
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {c.email ? <Text style={[s.crmCardInfo, { color: colors.textSecondary }]}>{c.email}</Text> : null}
                    {c.phone ? <Text style={[s.crmCardInfo, { color: colors.textSecondary }]}>{c.phone}</Text> : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
                      <TouchableOpacity
                        style={[s.crmNivelChip, { backgroundColor: ((NIVEL_OPTIONS.find((o) => o.id === c.nivel))?.color || colors.border) + '30', flexDirection: 'row', alignItems: 'center', flexShrink: 0 }]}
                        onPress={() => { playTapSound(); setNivelPickerClient(c); }}
                      >
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: (NIVEL_OPTIONS.find((o) => o.id === c.nivel))?.color || colors.border, marginRight: 6 }} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: (NIVEL_OPTIONS.find((o) => o.id === c.nivel))?.color || colors.text }}>
                          {(NIVEL_OPTIONS.find((o) => o.id === c.nivel))?.label || c.nivel || 'Definir'}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}
        {tab === 'conversar' && (
          <>
            <View style={[s.modelosCard, { backgroundColor: colors.primaryRgba?.(0.12), borderColor: colors.primary + '60', borderWidth: 2 }]}>
              <Text style={[s.modelosTitle, { color: colors.text }]}>Mensagens automáticas</Text>
              <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Busque ou selecione uma frase para enviar</Text>
              <View style={[s.frasesSearchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[s.frasesSearchInput, { color: colors.text }]}
                  placeholder="Buscar frase..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchFrases}
                  onChangeText={(v) => { setSearchFrases(v); setFrasesDropdownOpen(true); }}
                  onFocus={() => setFrasesDropdownOpen(true)}
                />
                <TouchableOpacity
                  onPress={() => { playTapSound(); setFrasesDropdownOpen(!frasesDropdownOpen); }}
                  style={[s.frasesChevronBtn, { borderLeftColor: colors.border }]}
                >
                  <Ionicons name={frasesDropdownOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
              {frasesDropdownOpen && (
              <View style={[s.frasesListbox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ScrollView style={s.frasesListboxScroll} showsVerticalScrollIndicator>
                {templates.length === 0 ? (
                  <Text style={[s.emptyFrase, { color: colors.textSecondary }]}>Nenhuma frase salva. Crie uma abaixo.</Text>
                ) : (() => {
                  const filtered = templates.filter((t) => !searchFrases.trim() || (typeof t === 'string' ? t : t?.text || '').toLowerCase().includes(searchFrases.trim().toLowerCase()));
                  return filtered.length === 0 ? (
                    <Text style={[s.emptyFrase, { color: colors.textSecondary }]}>Nenhuma frase encontrada{searchFrases.trim() ? ' com esse termo' : ''}.</Text>
                  ) : (
                  filtered.map((t, fi) => {
                      const txt = typeof t === 'string' ? t : t?.text || '';
                      const idx = templates.findIndex((x) => (typeof x === 'string' ? x : x?.text) === txt);
                      return (
                    <View key={`${idx}-${txt}`} style={[s.fraseRow, { borderBottomColor: colors.border }]}>
                      <TouchableOpacity
                        style={s.fraseTextWrap}
                        onPress={() => { playTapSound(); setSelectedTemplate(selectedTemplate === txt ? '' : txt); setFrasesDropdownOpen(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.fraseText, { color: colors.text }]} numberOfLines={2}>
                          {selectedTemplate === txt ? '✓ ' : ''}{txt}{(typeof t === 'object' && t?.photos?.length) ? ` 📷${t.photos.length}` : ''}
                        </Text>
                      </TouchableOpacity>
                      <View style={s.fraseActions}>
                        <TouchableOpacity onPress={() => startEditTemplate(idx)} style={s.fraseActionBtn}>
                          <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openWhatsappModal(t)} style={s.fraseActionBtn}>
                          <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteTemplate(idx)} style={s.fraseActionBtn}>
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                    })
                  );
                })()}
                </ScrollView>
              </View>
              )}
              <Text style={[s.sectionTitle, { color: colors.textSecondary, marginTop: 12 }]}>Nova mensagem padrão</Text>
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
                <Text style={s.addTemplateBtnText}>Criar mensagem automática</Text>
              </TouchableOpacity>
            </View>
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
                <Text style={[s.sectionTitle, { color: colors.primary }]}>🎂 Aniversariantes da semana{tipoFiltro === 'empresa' ? '' : ' (família/amigos)'}</Text>
                {aniversariantesSemana.map((c) => (
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
                        onPress={() => { playTapSound(); setConversarClientModal(c); }}
                      >
                        <Ionicons name="logo-whatsapp" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
      )}
      <Modal visible={editingTemplateIndex != null} transparent animationType="fade">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setEditingTemplateIndex(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalCenter}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[s.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Editar frase</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                placeholder="Frase"
                placeholderTextColor={colors.textSecondary}
                value={editingTemplateText}
                onChangeText={setEditingTemplateText}
                multiline
              />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 12, marginBottom: 6 }}>Fotos (máx. 2)</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {editingTemplatePhotos.map((uri, i) => (
                  <View key={i} style={{ position: 'relative' }}>
                    <Image source={{ uri }} style={{ width: 56, height: 56, borderRadius: 8 }} resizeMode="cover" />
                    <TouchableOpacity onPress={() => removeTemplatePhoto(i)} style={{ position: 'absolute', top: -4, right: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {editingTemplatePhotos.length < 2 && (
                  <TouchableOpacity onPress={pickTemplatePhoto} style={{ width: 56, height: 56, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="add" size={24} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.border }]} onPress={() => { setEditingTemplateIndex(null); setEditingTemplatePhotos([]); }}>
                  <Text style={[s.modalBtnText, { color: colors.text }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.primary }]} onPress={saveEditTemplate}>
                  <Text style={[s.modalBtnText, { color: '#fff' }]}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
      <Modal visible={!!whatsappModalPhrase} transparent animationType="slide">
        <View style={[s.modalOverlay, { justifyContent: 'flex-end' }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setWhatsappModalPhrase(null)} />
          <View style={[s.whatsappModalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text, marginBottom: 8 }]}>Enviar ou copiar frase</Text>
            <Text style={[s.whatsappModalPhrasePreview, { color: colors.textSecondary }]} numberOfLines={3}>{whatsappModalPhrase}</Text>
            <Text style={[s.sectionTitle, { color: colors.textSecondary, marginTop: 16 }]}>Escolha o(s) cliente(s) para enviar</Text>
            <ScrollView style={s.clientesScroll} showsVerticalScrollIndicator={false}>
              {clientsWithPhone.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.clienteCheckRow, { borderColor: colors.border }]}
                  onPress={() => { playTapSound(); toggleClientSelection(c.id); }}
                >
                  <Ionicons name={selectedClientIds.includes(c.id) ? 'checkbox' : 'square-outline'} size={22} color={selectedClientIds.includes(c.id) ? colors.primary : colors.textSecondary} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.rowTitle, { color: colors.text }]}>{c.name}</Text>
                    <Text style={[s.rowSub, { color: colors.textSecondary }]}>{c.phone}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {clientsWithPhone.length === 0 && <Text style={[s.emptyFrase, { color: colors.textSecondary }]}>Nenhum cliente com WhatsApp cadastrado.</Text>}
            </ScrollView>
            <View style={s.whatsappModalButtons}>
              <TouchableOpacity style={[s.addTemplateBtn, { backgroundColor: '#25D366', flex: 1 }]} onPress={enviarParaClientes} disabled={selectedClientIds.length === 0}>
                <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                <Text style={s.addTemplateBtnText}>Enviar para {selectedClientIds.length} cliente(s)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.addTemplateBtn, { backgroundColor: colors.primary, flex: 1 }]} onPress={copiarFrase}>
                <Ionicons name="copy-outline" size={22} color="#fff" />
                <Text style={s.addTemplateBtnText}>Copiar frase</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.border, marginTop: 8 }]} onPress={() => setWhatsappModalPhrase(null)}>
              <Text style={[s.modalBtnText, { color: colors.text }]}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={!!conversarClientModal} transparent animationType="slide">
        <View style={[s.modalOverlay, { justifyContent: 'flex-end' }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { setConversarClientModal(null); setConversarFraseFilter(''); }} />
          <View style={[s.whatsappModalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>
              {conversarClientModal ? `Conversar com ${conversarClientModal.name}` : ''}
            </Text>
            <TouchableOpacity
              style={[s.conversarChamarBtn, { borderColor: colors.border }]}
              onPress={() => {
                playTapSound();
                if (conversarClientModal?.phone) openWhatsApp(conversarClientModal.phone);
                setConversarClientModal(null);
                setConversarFraseFilter('');
              }}
            >
              <Ionicons name="logo-whatsapp" size={20} color={colors.primary} />
              <Text style={[s.conversarChamarText, { color: colors.text }]}>Apenas conversar</Text>
            </TouchableOpacity>
            <Text style={[s.sectionTitle, { color: colors.textSecondary, marginTop: 16 }]}>Ou escolha uma frase</Text>
            <TextInput
              style={[s.frasesSearchInput, { color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 12, marginTop: 8, paddingHorizontal: 12 }]}
              placeholder="Digite para filtrar as mensagens..."
              placeholderTextColor={colors.textSecondary}
              value={conversarFraseFilter}
              onChangeText={setConversarFraseFilter}
            />
            <ScrollView style={s.conversarFrasesScroll} showsVerticalScrollIndicator>
              {(conversarFraseFilter.trim() ? templates.filter((t) => {
                const txt = typeof t === 'string' ? t : t?.text || '';
                return txt.toLowerCase().includes(conversarFraseFilter.trim().toLowerCase());
              }) : templates).map((t, idx) => {
                const txt = typeof t === 'string' ? t : t?.text || '';
                return (
                <TouchableOpacity
                  key={`${idx}-${txt}`}
                  style={[s.clienteCheckRow, { borderColor: colors.border }]}
                  onPress={() => {
                    playTapSound();
                    if (conversarClientModal?.phone) openWhatsApp(conversarClientModal.phone, txt);
                    setConversarClientModal(null);
                    setConversarFraseFilter('');
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                  <Text style={[s.fraseText, { flex: 1, color: colors.text }]} numberOfLines={2}>{txt}{(typeof t === 'object' && t?.photos?.length) ? ` 📷` : ''}</Text>
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                </TouchableOpacity>
              );
              })}
              {(conversarFraseFilter.trim() ? templates.filter((t) => (typeof t === 'string' ? t : t?.text || '').toLowerCase().includes(conversarFraseFilter.trim().toLowerCase())) : templates).length === 0 && (
                <Text style={[s.emptyFrase, { color: colors.textSecondary }]}>
                  {templates.length === 0 ? 'Nenhuma frase salva. Crie nas mensagens automáticas.' : 'Nenhuma mensagem encontrada com esse filtro.'}
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.border, marginTop: 12 }]} onPress={() => { setConversarClientModal(null); setConversarFraseFilter(''); }}>
              <Text style={[s.modalBtnText, { color: colors.text }]}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ClienteDetalheModal
        visible={!!verClienteDetalhe}
        cliente={clients?.find((x) => x.id === verClienteDetalhe?.id) || verClienteDetalhe}
        agendaEvents={agendaEvents}
        services={services}
        colors={colors}
        onClose={() => setVerClienteDetalhe(null)}
        onEdit={() => { setVerClienteDetalhe(null); setEditingClient(verClienteDetalhe); }}
        onConversar={() => { setVerClienteDetalhe(null); setConversarClientModal(verClienteDetalhe); }}
        onIdentificar={(c) => { playTapSound(); setNivelPickerClient(c); }}
      />
      <Modal visible={!!nivelPickerClient} transparent animationType="fade">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setNivelPickerClient(null)}>
          <View style={[s.nivelPickerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text, marginBottom: 12 }]}>Identificação de {nivelPickerClient?.name}</Text>
            {NIVEL_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.id}
                style={[s.nivelPickerItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  playTapSound();
                  if (nivelPickerClient?.id) updateClient(nivelPickerClient.id, { ...nivelPickerClient, nivel: o.id });
                  setNivelPickerClient(null);
                }}
              >
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: o.color, marginRight: 12 }} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{o.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.border, marginTop: 12 }]} onPress={() => setNivelPickerClient(null)}>
              <Text style={[s.modalBtnText, { color: colors.text }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <ClienteModal
        visible={!!editingClient}
        cliente={editingClient}
        defaultTipo={viewMode}
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
        defaultTipo={viewMode}
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
  nivelChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  filterDropdownWrap: { borderWidth: 1, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  filterDropdownBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0 },
  filterDropdownList: { borderTopWidth: 1, paddingVertical: 4 },
  filterDropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1 },
  nivelPickerBox: { marginHorizontal: 24, padding: 20, borderRadius: 16, borderWidth: 1 },
  nivelPickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  crmCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, overflow: 'visible' },
  crmLeftCol: { flexDirection: 'column', alignItems: 'center', gap: 8 },
  crmAvatar: { width: 52, height: 52, borderRadius: 26 },
  crmCardBody: { flex: 1, minWidth: 0 },
  crmCardName: { fontSize: 15, fontWeight: '700' },
  crmCardNameFlex: { flex: 1, minWidth: 0 },
  crmNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  crmNameRight: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  crmNivelChip: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  crmActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  verClienteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  verClienteBtnText: { fontSize: 13, fontWeight: '600' },
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
  frasesSearchWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, marginBottom: 8 },
  frasesSearchInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },
  frasesChevronBtn: { paddingHorizontal: 12, paddingVertical: 10, borderLeftWidth: 1, justifyContent: 'center', alignItems: 'center' },
  frasesListbox: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', height: 200, marginTop: 4 },
  frasesListboxScroll: { flex: 1 },
  fraseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1 },
  fraseTextWrap: { flex: 1, minWidth: 0 },
  fraseText: { fontSize: 14, fontWeight: '500' },
  fraseActions: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  fraseActionBtn: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  emptyFrase: { fontSize: 13, paddingVertical: 20, paddingHorizontal: 12, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalCenter: { width: '100%' },
  modalBox: { padding: 20, borderRadius: 16, borderWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  modalBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontSize: 14, fontWeight: '600' },
  whatsappModalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 20, paddingBottom: 32 },
  whatsappModalPhrasePreview: { fontSize: 13 },
  conversarChamarBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  conversarChamarText: { fontSize: 15, fontWeight: '600' },
  conversarFrasesScroll: { maxHeight: 240, marginTop: 8 },
  clientesScroll: { maxHeight: 200, marginVertical: 8 },
  clienteCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  whatsappModalButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
});
