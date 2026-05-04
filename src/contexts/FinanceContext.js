import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useBanks } from './BanksContext';

const AGENDA_CACHE_KEY = 'tudocerto_agenda_cache';
const COLABORADORES_CACHE_KEY = 'tudocerto_colaboradores_cache';
const REALTIME_DEBOUNCE_MS = 700;
const REALTIME_TABLES = [
  'transactions',
  'agenda_events',
  'check_list_items',
  'clients',
  'products',
  'composite_products',
  'services',
  'suppliers',
  'a_receber',
  'orcamentos',
  'boletos',
  'collaborators',
];

function showDbError(error, context = 'salvar') {
  const msg = error?.message || String(error) || 'Erro desconhecido';
  Alert.alert('Erro ao ' + context, msg);
  console.warn('Supabase error:', error);
}

function isMissingTableError(error) {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  return error.code === '42P01' || (msg.includes('relation') && msg.includes('does not exist'));
}

const FinanceContext = createContext(undefined);

function toTransaction(r) {
  if (!r) return null;
  return {
    id: r.id,
    type: r.type,
    amount: Number(r.amount),
    description: r.description,
    category: r.category,
    date: r.date,
    createdAt: r.created_at || r.createdAt || null,
    formaPagamento: r.forma_pagamento,
    tipoVenda: r.tipo_venda,
    desconto: Number(r.desconto || 0),
  };
}
function toAgenda(r) {
  if (!r) return null;
  let preOrderItems = [];
  if (r.pre_order_items) {
    if (Array.isArray(r.pre_order_items)) preOrderItems = r.pre_order_items;
    else if (typeof r.pre_order_items === 'string') try { preOrderItems = JSON.parse(r.pre_order_items) || []; } catch { preOrderItems = []; }
  }
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    date: r.date,
    time: r.time,
    timeEnd: r.time_end,
    type: r.type,
    clientId: r.client_id,
    serviceId: r.service_id,
    amount: Number(r.amount || 0),
    tipo: r.tipo || 'pessoal',
    status: r.status || 'pendente',
    preOrderItems,
  };
}
function toCheckList(r) {
  if (!r) return null;
  return {
    id: r.id, title: r.title, checked: r.checked, date: r.date, important: r.important ?? false,
    priority: r.priority || 'media', timeStart: r.time_start, timeEnd: r.time_end,
    description: r.description, sortOrder: r.sort_order ?? 0,
  };
}
function toClient(r) {
  if (!r) return null;
  let tags = [];
  if (r.tags) {
    tags = Array.isArray(r.tags) ? r.tags : (typeof r.tags === 'string' ? (() => { try { return JSON.parse(r.tags) || []; } catch { return []; } })() : []);
  }
  return { id: r.id, name: r.name, email: r.email, phone: r.phone, address: r.address, cpf: r.cpf, linkInstagram: r.link_instagram || r.linkInstagram, foto: r.foto, nivel: r.nivel, birthDate: r.birth_date || r.birthDate, tipo: r.tipo || 'empresa', tags, createdAt: r.created_at };
}
function toProduct(r) {
  if (!r) return null;
  const data = r.data || {};
  const photoUris = data.photo_uris && Array.isArray(data.photo_uris) ? data.photo_uris : (r.photo_uri ? [r.photo_uri] : []);
  return {
    id: r.id, name: r.name, price: Number(r.price), costPrice: Number(r.cost_price || 0), discount: Number(r.discount || 0), unit: r.unit,
    photoUri: photoUris[0] || r.photo_uri, photoUris,
    code: data.code,
    barcode: data.barcode || data.bar_code || data.codigo_barras || null,
    allowDiscount: data.allow_discount !== false,
    stock: data.stock ?? 0,
    minStock: data.min_stock ?? 0,
    supplierId: data.supplier_id,
  };
}
function toService(r) {
  if (!r) return null;
  return { id: r.id, name: r.name, price: Number(r.price), discount: Number(r.discount || 0), photoUri: r.photo_uri };
}
function toSupplier(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    linkSite: r.link_site,
    linkInstagram: r.link_instagram,
    linkLoja: r.link_loja,
    cnpj: r.cnpj,
    estado: r.estado,
  };
}
function toAReceber(r) {
  if (!r) return null;
  return { id: r.id, description: r.description, amount: Number(r.amount), dueDate: r.due_date, parcel: r.parcel, total: r.total, status: r.status };
}
function toCollaborator(r) {
  if (!r) return null;
  const data = r.data || r;
  const rawOpAtivo = data.operadorCaixaAtivo ?? data.operador_caixa_ativo;
  const operadorCaixaAtivo =
    rawOpAtivo === true || rawOpAtivo === 'true' || rawOpAtivo === 1 || rawOpAtivo === '1';
  const operadorCaixaId = data.operadorCaixaId ?? data.operador_caixa_id ?? '';
  const operadorCaixaSenha = data.operadorCaixaSenha ?? data.operador_caixa_senha ?? '';
  return {
    id: r.id || data.id,
    nome: data.nome || data.name || '',
    funcao: data.funcao || data.role || 'Vendedor',
    salarioBase: Number(data.salarioBase ?? data.salaryBase ?? 0),
    comissaoPercent: Number(data.comissaoPercent ?? data.commissionPercent ?? 0),
    ativo: data.ativo !== false,
    pagamentos: Array.isArray(data.pagamentos) ? data.pagamentos : [],
    createdAt: r.created_at || data.createdAt || null,
    cpf: data.cpf || '',
    rg: data.rg || '',
    estadoCivil: data.estadoCivil || '',
    telefone: data.telefone || data.phone || '',
    email: data.email || '',
    endereco: data.endereco || data.address || '',
    cidade: data.cidade || '',
    cep: data.cep || '',
    complemento: data.complemento || '',
    dataNascimento: data.dataNascimento || '',
    habilitado: data.habilitado !== false,
    descricao: data.descricao || '',
    curriculoExperiencias: data.curriculoExperiencias || data.experiencias || '',
    observacoes: data.observacoes || '',
    operadorCaixaAtivo,
    operadorCaixaId: operadorCaixaId || '',
    operadorCaixaSenha: operadorCaixaSenha || '',
  };
}
function toOrcamento(r) {
  if (!r) return null;
  let items = [];
  if (r.items && Array.isArray(r.items)) items = r.items;
  else if (typeof r.items === 'string') try { items = JSON.parse(r.items) || []; } catch {}
  return {
    id: r.id,
    numero: r.numero || '',
    clientId: r.client_id,
    items,
    subtotal: Number(r.subtotal || 0),
    desconto: Number(r.desconto || 0),
    total: Number(r.total || 0),
    observacoes: r.observacoes || '',
    validade: r.validade || '',
    termos: r.termos || '',
    agendaData: r.agenda_data || '',
    agendaHora: r.agenda_hora || '',
    agendaObs: r.agenda_obs || '',
    status: r.status || 'rascunho',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const INITIAL_TRANSACTIONS = [
  { id: '1', type: 'income', amount: 5200, description: 'Salário', category: 'Salário', date: '2026-02-01' },
  { id: '2', type: 'expense', amount: 1200, description: 'Aluguel', category: 'Aluguel', date: '2026-02-03' },
  { id: '3', type: 'expense', amount: 450, description: 'Supermercado', category: 'Alimentação', date: '2026-02-05' },
  { id: '4', type: 'expense', amount: 89.90, description: 'Netflix + Spotify', category: 'Assinaturas', date: '2026-02-07' },
  { id: '5', type: 'expense', amount: 150, description: 'Uber + Gasolina', category: 'Transporte', date: '2026-02-10' },
  { id: '6', type: 'expense', amount: 200, description: 'Cinema + Jantar', category: 'Lazer', date: '2026-02-12' },
  { id: '7', type: 'income', amount: 800, description: 'Freelance', category: 'Freelance', date: '2026-02-15' },
  { id: '8', type: 'expense', amount: 350, description: 'Farmácia', category: 'Saúde', date: '2026-02-18' },
];

export function FinanceProvider({ children }) {
  const { user } = useAuth();
  const { banks, cards, deductFromBank, addToBank, deductFromCardBalance, addToCardBalance } = useBanks();
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [budgets, setBudgets] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [compositeProducts, setCompositeProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [boletos, setBoletos] = useState([]);
  const [aReceber, setAReceber] = useState([]);
  const [agendaEvents, setAgendaEvents] = useState([]);
  const [checkListItems, setCheckListItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const realtimeReloadTimerRef = useRef(null);
  const realtimeReloadInFlightRef = useRef(false);

  const loadAll = useCallback(async () => {
    if (!user) {
      setTransactions(INITIAL_TRANSACTIONS);
      setOrcamentos([]);
      setClients([]);
      setProducts([]);
      setCompositeProducts([]);
      setServices([]);
      setSuppliers([]);
      setCollaborators([]);
      setBoletos([]);
      setAReceber([]);
      setAgendaEvents([]);
      setCheckListItems([]);
      setLoading(false);
      AsyncStorage.removeItem(AGENDA_CACHE_KEY).catch(() => {});
      return;
    }
    const cacheKey = `${AGENDA_CACHE_KEY}_${user.id}`;
    const collabCacheKey = `${COLABORADORES_CACHE_KEY}_${user.id}`;
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length >= 0) {
            setAgendaEvents(parsed);
          }
        } catch (_) {}
      }
    } catch (_) {}
    setLoading(true);
    try {
      const safeQuery = async (queryPromise, label) => {
        try {
          const { data, error } = await queryPromise;
          if (error) {
            if (isMissingTableError(error) || error.status === 404) {
              console.warn(`[Supabase] ${label} indisponível (${error.code || error.status}). Usando fallback vazio.`);
              return [];
            }
            console.warn(`[Supabase] erro em ${label}:`, error.message || error);
            return [];
          }
          return data || [];
        } catch (e) {
          console.warn(`[Supabase] falha inesperada em ${label}:`, e?.message || e);
          return [];
        }
      };

      const [txData, agData, chData, clData, prData, compData, svData, suData, arData, orcData, blData] = await Promise.all([
        safeQuery(supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }), 'transactions'),
        safeQuery(supabase.from('agenda_events').select('*').eq('user_id', user.id).order('date'), 'agenda_events'),
        safeQuery(supabase.from('check_list_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }), 'check_list_items'),
        safeQuery(supabase.from('clients').select('*').eq('user_id', user.id), 'clients'),
        safeQuery(supabase.from('products').select('*').eq('user_id', user.id), 'products'),
        safeQuery(supabase.from('composite_products').select('*').eq('user_id', user.id), 'composite_products'),
        safeQuery(supabase.from('services').select('*').eq('user_id', user.id), 'services'),
        safeQuery(supabase.from('suppliers').select('*').eq('user_id', user.id), 'suppliers'),
        safeQuery(supabase.from('a_receber').select('*').eq('user_id', user.id), 'a_receber'),
        safeQuery(supabase.from('orcamentos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }), 'orcamentos'),
        safeQuery(supabase.from('boletos').select('*').eq('user_id', user.id), 'boletos'),
      ]);

      setTransactions((txData || []).map(toTransaction));
      if (agData) {
        const events = (agData || []).map(toAgenda);
        setAgendaEvents(events);
        AsyncStorage.setItem(cacheKey, JSON.stringify(events)).catch(() => {});
      }
      setCheckListItems((chData || []).map(toCheckList));
      setClients((clData || []).map(toClient));
      setProducts((prData || []).map(toProduct));
      setCompositeProducts((compData || []).map((r) => ({ id: r.id, ...r.data })));
      setServices((svData || []).map(toService));
      setSuppliers((suData || []).map(toSupplier));
      try {
        const collaboratorsRemote = await safeQuery(supabase.from('collaborators').select('*').eq('user_id', user.id).order('created_at', { ascending: false }), 'collaborators');
        if (Array.isArray(collaboratorsRemote) && collaboratorsRemote.length) {
          const parsed = collaboratorsRemote.map(toCollaborator).filter(Boolean);
          setCollaborators(parsed);
          AsyncStorage.setItem(collabCacheKey, JSON.stringify(parsed)).catch(() => {});
        } else {
          const cachedCollabs = await AsyncStorage.getItem(collabCacheKey);
          setCollaborators(cachedCollabs ? (JSON.parse(cachedCollabs) || []) : []);
        }
      } catch {
        const cachedCollabs = await AsyncStorage.getItem(collabCacheKey);
        setCollaborators(cachedCollabs ? (JSON.parse(cachedCollabs) || []) : []);
      }
      setAReceber((arData || []).map(toAReceber));
      setOrcamentos((orcData || []).map(toOrcamento));
      setBoletos((blData || []).map((r) => ({ id: r.id, ...r.data })));
    } catch (e) {
      console.warn('Erro ao carregar dados Supabase:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const refreshAgendaEvents = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('agenda_events').select('*').eq('user_id', user.id).order('date');
      if (data) {
        const events = (data || []).map(toAgenda);
        setAgendaEvents(events);
        AsyncStorage.setItem(`${AGENDA_CACHE_KEY}_${user.id}`, JSON.stringify(events)).catch(() => {});
      }
    } catch (e) {
      console.warn('Erro ao atualizar agenda:', e);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const scheduleRealtimeReload = useCallback(() => {
    if (!user?.id) return;
    if (realtimeReloadTimerRef.current) {
      clearTimeout(realtimeReloadTimerRef.current);
    }
    realtimeReloadTimerRef.current = setTimeout(async () => {
      if (realtimeReloadInFlightRef.current) return;
      realtimeReloadInFlightRef.current = true;
      try {
        await loadAll();
      } finally {
        realtimeReloadInFlightRef.current = false;
      }
    }, REALTIME_DEBOUNCE_MS);
  }, [user?.id, loadAll]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const channelName = `finance-sync-${user.id}`;
    const channel = supabase.channel(channelName);

    REALTIME_TABLES.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          scheduleRealtimeReload();
        }
      );
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        scheduleRealtimeReload();
      }
    });

    return () => {
      if (realtimeReloadTimerRef.current) {
        clearTimeout(realtimeReloadTimerRef.current);
        realtimeReloadTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [user?.id, scheduleRealtimeReload]);

  const syncBankForAutoExpense = (tx, reverse) => {
    if (!tx) return;
    const isExpense = tx.type === 'expense' || tx.type === 'despesa';
    if (!isExpense) return;
    const amt = Math.max(0, Number(tx.amount) || 0);
    if (amt <= 0) return;
    const tipo = tx.tipoVenda || 'pessoal';
    const firstBank = (banks || []).find((b) => (b.tipo || 'pessoal') === tipo);
    const firstCard = firstBank ? (cards || []).find((c) => c.bankId === firstBank.id) : null;
    const fp = tx.formaPagamento || 'pix';
    if (reverse) {
      if ((fp === 'debito' || fp === 'pix' || fp === 'transferencia') && firstBank) addToBank(firstBank.id, amt);
      else if (fp === 'credito' && firstCard) deductFromCardBalance(firstCard.id, amt);
    } else {
      if ((fp === 'debito' || fp === 'pix' || fp === 'transferencia') && firstBank) deductFromBank(firstBank.id, amt);
      else if (fp === 'credito' && firstCard) addToCardBalance(firstCard.id, amt);
    }
  };

  const addTransaction = async (t) => {
    const txType = t.type === 'receita' ? 'income' : (t.type === 'despesa' ? 'expense' : (t.type || 'income'));
    if (!user) {
      const nid = Date.now().toString();
      const n = { ...t, id: nid, type: txType, createdAt: t.createdAt || new Date().toISOString() };
      setTransactions((prev) => [...prev, n]);
      return nid;
    }
    const { data, error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: txType,
      amount: t.amount,
      description: t.description,
      category: t.category,
      date: t.date,
      forma_pagamento: t.formaPagamento,
      tipo_venda: t.tipoVenda,
      desconto: t.desconto || 0,
    }).select('*').single();
    if (error) {
      showDbError(error, 'cadastrar transação');
      return null;
    }
    if (data) {
      const row = toTransaction(data);
      setTransactions((prev) => [row, ...prev]);
      return row.id;
    }
    return null;
  };
  const updateTransaction = async (id, data) => {
    if (!user) return setTransactions((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    await supabase.from('transactions').update({
      ...(data.amount != null && { amount: data.amount }),
      ...(data.description != null && { description: data.description }),
      ...(data.category != null && { category: data.category }),
      ...(data.date != null && { date: data.date }),
      ...(data.formaPagamento != null && { forma_pagamento: data.formaPagamento }),
      ...(data.tipoVenda != null && { tipo_venda: data.tipoVenda }),
      ...(data.desconto != null && { desconto: data.desconto }),
    }).eq('id', id);
    setTransactions((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
  };
  const deleteTransaction = async (id) => {
    if (!user) return setTransactions((prev) => prev.filter((t) => t.id !== id));
    await supabase.from('transactions').delete().eq('id', id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const addAgendaEvent = async (e) => {
    if (!user) {
      const ev = {
        id: Date.now().toString(),
        title: e.title || 'Evento',
        description: e.description,
        date: e.date,
        time: e.time,
        timeEnd: e.timeEnd,
        amount: e.amount ?? 0,
        tipo: e.tipo || 'pessoal',
        type: e.type || 'evento',
        clientId: e.clientId,
        serviceId: e.serviceId,
        status: e.status || 'pendente',
        preOrderItems: e.preOrderItems || [],
      };
      setAgendaEvents((prev) => [...prev, ev]);
      return;
    }
    const payload = {
      user_id: user.id,
      title: e.title || (e.clientId ? 'Evento' : 'Evento'),
      description: e.description || null,
      date: e.date,
      time: e.time,
      time_end: e.timeEnd || null,
      type: e.type || 'meeting',
      client_id: e.clientId || null,
      service_id: e.serviceId || null,
      amount: e.amount ?? 0,
      tipo: e.tipo || 'pessoal',
      status: e.status || 'pendente',
      pre_order_items: Array.isArray(e.preOrderItems) ? e.preOrderItems : [],
    };
    const { data, error } = await supabase.from('agenda_events').insert(payload).select('*').single();
    if (error) return showDbError(error, 'cadastrar evento');
    if (data) {
      const ev = toAgenda(data);
      setAgendaEvents((prev) => {
        const next = [...prev, ev];
        if (user?.id) AsyncStorage.setItem(`${AGENDA_CACHE_KEY}_${user.id}`, JSON.stringify(next)).catch(() => {});
        return next;
      });
    }
  };
  const updateAgendaEvent = async (id, data) => {
    if (!user) return setAgendaEvents((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    const up = {};
    if (data.title !== undefined) up.title = data.title;
    if (data.description !== undefined) up.description = data.description;
    if (data.date !== undefined) up.date = data.date;
    if (data.time !== undefined) up.time = data.time;
    if (data.timeEnd !== undefined) up.time_end = data.timeEnd;
    if (data.type !== undefined) up.type = data.type;
    if (data.clientId !== undefined) up.client_id = data.clientId;
    if (data.serviceId !== undefined) up.service_id = data.serviceId;
    if (data.amount !== undefined) up.amount = data.amount;
    if (data.tipo !== undefined) up.tipo = data.tipo;
    if (data.status !== undefined) up.status = data.status;
    if (data.preOrderItems !== undefined) up.pre_order_items = Array.isArray(data.preOrderItems) ? data.preOrderItems : [];
    await supabase.from('agenda_events').update(up).eq('id', id);
    setAgendaEvents((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, ...data } : x));
      if (user?.id) AsyncStorage.setItem(`${AGENDA_CACHE_KEY}_${user.id}`, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };
  const deleteAgendaEvent = async (id) => {
    if (!user) return setAgendaEvents((prev) => prev.filter((e) => e.id !== id));
    await supabase.from('agenda_events').delete().eq('id', id);
    setAgendaEvents((prev) => {
      const next = prev.filter((e) => e.id !== id);
      if (user?.id) AsyncStorage.setItem(`${AGENDA_CACHE_KEY}_${user.id}`, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const addCheckListItem = async (item) => {
    if (!user) {
      const maxOrder = Math.max(0, ...(checkListItems || []).map((i) => (i.sortOrder ?? 0)));
      setCheckListItems((prev) => [...prev, { ...item, id: Date.now().toString(), sortOrder: item.sortOrder ?? maxOrder + 1 }]);
      return;
    }
    const maxOrder = Math.max(0, ...checkListItems.map((i) => (i.sortOrder ?? 0)));
    const { data, error } = await supabase.from('check_list_items').insert({
      user_id: user.id,
      title: item.title,
      checked: item.checked ?? false,
      date: item.date,
      important: item.important ?? false,
      priority: item.priority || 'media',
      time_start: item.timeStart || null,
      time_end: item.timeEnd || null,
      description: item.description || null,
      sort_order: item.sortOrder ?? maxOrder + 1,
    }).select('*').single();
    if (error) return showDbError(error, 'cadastrar tarefa');
    if (data) setCheckListItems((prev) => [...prev, toCheckList(data)]);
  };
  const updateCheckListItem = async (id, data) => {
    if (!user) return setCheckListItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));
    const up = {};
    if (data.title !== undefined) up.title = data.title;
    if (data.checked !== undefined) up.checked = data.checked;
    if (data.date !== undefined) up.date = data.date;
    if (data.important !== undefined) up.important = data.important;
    if (data.priority !== undefined) up.priority = data.priority;
    if (data.timeStart !== undefined) up.time_start = data.timeStart;
    if (data.timeEnd !== undefined) up.time_end = data.timeEnd;
    if (data.description !== undefined) up.description = data.description;
    if (data.sortOrder !== undefined) up.sort_order = data.sortOrder;
    if (Object.keys(up).length > 0) await supabase.from('check_list_items').update(up).eq('id', id);
    setCheckListItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));
  };
  const deleteCheckListItem = async (id) => {
    if (!user) return setCheckListItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from('check_list_items').delete().eq('id', id);
    setCheckListItems((prev) => prev.filter((i) => i.id !== id));
  };

  const addClient = async (c) => {
    const tagsArr = Array.isArray(c.tags) ? c.tags : [];
    if (!user) {
      const id = Date.now().toString();
      setClients((prev) => [...prev, { ...c, id, name: c.name, foto: c.foto || null, birthDate: c.birthDate || null, nivel: c.nivel || 'orcamento', tipo: c.tipo || 'empresa', cpf: c.cpf || null, address: c.address || null, tags: tagsArr }]);
      return id;
    }
    const { data, error } = await supabase.from('clients').insert({
      user_id: user.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address || null,
      cpf: c.cpf || null,
      link_instagram: c.linkInstagram || null,
      foto: c.foto || null,
      birth_date: c.birthDate || null,
      nivel: c.nivel || 'orcamento',
      tipo: c.tipo || 'empresa',
      tags: tagsArr,
    }).select('*').single();
    if (error) { showDbError(error, 'cadastrar cliente'); return null; }
    if (data) { setClients((prev) => [...prev, toClient(data)]); return data.id; }
    return null;
  };
  const updateClient = async (id, data) => {
    if (!user) return setClients((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    const up = { ...data };
    if (data.birthDate !== undefined) { up.birth_date = data.birthDate; delete up.birthDate; }
    if (data.linkInstagram !== undefined) { up.link_instagram = data.linkInstagram; delete up.linkInstagram; }
    await supabase.from('clients').update(up).eq('id', id);
    setClients((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
  };
  const deleteClient = async (id) => {
    if (!user) return setClients((prev) => prev.filter((x) => x.id !== id));
    await supabase.from('clients').delete().eq('id', id);
    setClients((prev) => prev.filter((x) => x.id !== id));
  };

  const addProduct = async (p) => {
    if (!user) {
      const prod = { ...p, id: Date.now().toString() };
      if (p.photoUris?.length > 0 && !prod.photoUri) prod.photoUri = p.photoUris[0];
      setProducts((prev) => [...prev, prod]);
      return;
    }
    const photoUris = (p.photoUris && p.photoUris.length > 0) ? p.photoUris : (p.photoUri ? [p.photoUri] : []);
    const dataJson = {
      ...(p.code != null && { code: p.code }),
      ...(p.barcode != null && { barcode: p.barcode }),
      ...(p.allowDiscount != null && { allow_discount: p.allowDiscount }),
      ...(p.stock != null && { stock: p.stock }),
      ...(p.minStock != null && { min_stock: p.minStock }),
      ...(p.supplierId != null && { supplier_id: p.supplierId }),
      ...(photoUris.length > 0 && { photo_uris: photoUris }),
    };
    const { data, error } = await supabase.from('products').insert({
      user_id: user.id,
      name: p.name,
      price: p.price ?? 0,
      cost_price: p.costPrice ?? 0,
      discount: p.discount ?? 0,
      unit: p.unit || 'un',
      photo_uri: photoUris[0] || p.photoUri,
      data: Object.keys(dataJson).length ? dataJson : undefined,
    }).select('*').single();
    if (error) return showDbError(error, 'cadastrar produto');
    if (data) setProducts((prev) => [...prev, toProduct(data)]);
  };
  const updateProduct = async (id, data) => {
    if (!user) return setProducts((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    const up = {};
    if (data.name != null) up.name = data.name;
    if (data.price != null) up.price = data.price;
    if (data.costPrice != null) up.cost_price = data.costPrice;
    if (data.discount != null) up.discount = data.discount;
    if (data.unit != null) up.unit = data.unit;
    if (data.photoUri != null) up.photo_uri = data.photoUri;
    if (data.code !== undefined || data.barcode !== undefined || data.allowDiscount !== undefined || data.stock !== undefined || data.minStock !== undefined || data.supplierId !== undefined || data.photoUris !== undefined) {
      const curr = (await supabase.from('products').select('data').eq('id', id).single()).data?.data || {};
      const photoUris = data.photoUris !== undefined ? (data.photoUris?.length ? data.photoUris : []) : undefined;
      up.data = {
        ...curr,
        ...(data.code !== undefined && { code: data.code }),
        ...(data.barcode !== undefined && { barcode: data.barcode }),
        ...(data.allowDiscount !== undefined && { allow_discount: data.allowDiscount }),
        ...(data.stock !== undefined && { stock: data.stock }),
        ...(data.minStock !== undefined && { min_stock: data.minStock }),
        ...(data.supplierId !== undefined && { supplier_id: data.supplierId }),
        ...(photoUris !== undefined && { photo_uris: photoUris }),
      };
    }
    if (data.photoUris !== undefined) up.photo_uri = data.photoUris?.length > 0 ? data.photoUris[0] : null;
    await supabase.from('products').update(up).eq('id', id);
    const merged = { ...data };
    if (data.photoUris?.length > 0 && !merged.photoUri) merged.photoUri = data.photoUris[0];
    setProducts((prev) => prev.map((x) => (x.id === id ? { ...x, ...merged } : x)));
  };
  const deleteProduct = async (id) => {
    if (!user) return setProducts((prev) => prev.filter((x) => x.id !== id));
    await supabase.from('products').delete().eq('id', id);
    setProducts((prev) => prev.filter((x) => x.id !== id));
  };

  const addCompositeProduct = async (p) => {
    if (!user) {
      setCompositeProducts((prev) => [...prev, { ...p, id: Date.now().toString() }]);
      return;
    }
    const { data, error } = await supabase.from('composite_products').insert({
      user_id: user.id,
      name: p.name,
      data: p.data || p,
    }).select('*').single();
    if (error) return showDbError(error, 'cadastrar produto composto');
    if (data) setCompositeProducts((prev) => [...prev, { id: data.id, ...data.data }]);
  };
  const updateCompositeProduct = async (id, data) => {
    if (!user) return setCompositeProducts((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    await supabase.from('composite_products').update({ data }).eq('id', id);
    setCompositeProducts((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
  };
  const deleteCompositeProduct = async (id) => {
    if (!user) return setCompositeProducts((prev) => prev.filter((x) => x.id !== id));
    await supabase.from('composite_products').delete().eq('id', id);
    setCompositeProducts((prev) => prev.filter((x) => x.id !== id));
  };

  const addService = async (s) => {
    if (!user) {
      setServices((prev) => [...prev, { ...s, id: Date.now().toString() }]);
      return;
    }
    const { data, error } = await supabase.from('services').insert({
      user_id: user.id,
      name: s.name,
      price: s.price ?? 0,
      discount: s.discount ?? 0,
      photo_uri: s.photoUri,
    }).select('*').single();
    if (error) return showDbError(error, 'cadastrar serviço');
    if (data) setServices((prev) => [...prev, toService(data)]);
  };
  const updateService = async (id, data) => {
    if (!user) return setServices((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    await supabase.from('services').update({
      ...(data.name != null && { name: data.name }),
      ...(data.price != null && { price: data.price }),
      ...(data.discount != null && { discount: data.discount }),
      ...(data.photoUri != null && { photo_uri: data.photoUri }),
    }).eq('id', id);
    setServices((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
  };
  const deleteService = async (id) => {
    if (!user) return setServices((prev) => prev.filter((x) => x.id !== id));
    await supabase.from('services').delete().eq('id', id);
    setServices((prev) => prev.filter((x) => x.id !== id));
  };

  const addSupplier = async (s) => {
    if (!user) {
      const id = Date.now().toString();
      setSuppliers((prev) => [...prev, { id, name: s.name, email: s.email, phone: s.phone, linkSite: s.linkSite, linkInstagram: s.linkInstagram, linkLoja: s.linkLoja, cnpj: s.cnpj, estado: s.estado }]);
      return id;
    }
    const { data, error } = await supabase.from('suppliers').insert({
      user_id: user.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      link_site: s.linkSite || null,
      link_instagram: s.linkInstagram || null,
      link_loja: s.linkLoja || null,
      cnpj: s.cnpj || null,
      estado: s.estado || null,
    }).select('*').single();
    if (error) return showDbError(error, 'cadastrar fornecedor');
    if (data) {
      setSuppliers((prev) => [...prev, toSupplier(data)]);
      return data.id;
    }
  };
  const toSupplierUpdate = (data) => {
    const out = {};
    if (data.name !== undefined) out.name = data.name;
    if (data.email !== undefined) out.email = data.email;
    if (data.phone !== undefined) out.phone = data.phone;
    if (data.linkSite !== undefined) out.link_site = data.linkSite;
    if (data.linkInstagram !== undefined) out.link_instagram = data.linkInstagram;
    if (data.linkLoja !== undefined) out.link_loja = data.linkLoja;
    if (data.cnpj !== undefined) out.cnpj = data.cnpj;
    if (data.estado !== undefined) out.estado = data.estado;
    return out;
  };
  const updateSupplier = async (id, data) => {
    const payload = toSupplierUpdate(data);
    if (!user) return setSuppliers((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    if (Object.keys(payload).length === 0) return;
    await supabase.from('suppliers').update(payload).eq('id', id);
    setSuppliers((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
  };
  const deleteSupplier = async (id) => {
    if (!user) return setSuppliers((prev) => prev.filter((x) => x.id !== id));
    await supabase.from('suppliers').delete().eq('id', id);
    setSuppliers((prev) => prev.filter((x) => x.id !== id));
  };

  const saveCollaboratorsCache = async (nextList) => {
    const key = `${COLABORADORES_CACHE_KEY}_${user?.id || 'guest'}`;
    try { await AsyncStorage.setItem(key, JSON.stringify(nextList || [])); } catch {}
  };

  const addCollaborator = async (c) => {
    const collaborator = {
      id: Date.now().toString(),
      nome: c.nome || '',
      funcao: c.funcao || 'Vendedor',
      salarioBase: Number(c.salarioBase || 0),
      comissaoPercent: Number(c.comissaoPercent || 0),
      ativo: c.ativo !== false,
      pagamentos: Array.isArray(c.pagamentos) ? c.pagamentos : [],
      createdAt: new Date().toISOString(),
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
    };
    if (!user) {
      const next = [...collaborators, collaborator];
      setCollaborators(next);
      saveCollaboratorsCache(next);
      return collaborator.id;
    }
    const { data, error } = await supabase.from('collaborators').insert({
      user_id: user.id,
      data: collaborator,
    }).select('*').single();
    if (error && !isMissingTableError(error)) return showDbError(error, 'cadastrar colaborador');
    const saved = data ? toCollaborator(data) : collaborator;
    const next = [...collaborators, saved];
    setCollaborators(next);
    saveCollaboratorsCache(next);
    return saved.id;
  };

  const updateCollaborator = async (id, patch) => {
    const next = collaborators.map((x) => (x.id === id ? { ...x, ...patch } : x));
    setCollaborators(next);
    saveCollaboratorsCache(next);
    if (!user) return;
    const target = next.find((x) => x.id === id);
    if (!target) return;
    const { error } = await supabase.from('collaborators').update({ data: target }).eq('id', id);
    if (error && !isMissingTableError(error)) showDbError(error, 'atualizar colaborador');
  };

  const deleteCollaborator = async (id) => {
    const next = collaborators.filter((x) => x.id !== id);
    setCollaborators(next);
    saveCollaboratorsCache(next);
    if (!user) return;
    const { error } = await supabase.from('collaborators').delete().eq('id', id);
    if (error && !isMissingTableError(error)) showDbError(error, 'excluir colaborador');
  };

  const addCollaboratorPayment = async (collaboratorId, payment) => {
    const normalized = {
      id: Date.now().toString(),
      tipo: payment?.tipo || 'salario',
      valor: Number(payment?.valor || 0),
      data: payment?.data || new Date().toISOString().slice(0, 10),
      observacao: payment?.observacao || '',
      pago: payment?.pago !== false,
    };
    const next = collaborators.map((x) =>
      x.id === collaboratorId
        ? { ...x, pagamentos: [...(x.pagamentos || []), normalized] }
        : x
    );
    setCollaborators(next);
    saveCollaboratorsCache(next);
    if (!user) return;
    const target = next.find((x) => x.id === collaboratorId);
    if (!target) return;
    const { error } = await supabase.from('collaborators').update({ data: target }).eq('id', collaboratorId);
    if (error && !isMissingTableError(error)) showDbError(error, 'registrar pagamento');
  };

  const addBoleto = async (b) => {
    const base = { ...b };
    delete base.id;
    delete base.paidTransactionId;
    const amount = Number(base.amount) || 0;
    const dateVal = new Date().toISOString().slice(0, 10);

    if (!user) {
      const nid = Date.now().toString();
      let item = { ...base, id: nid };
      if (base.paid && amount > 0) {
        const txId = await addTransaction({
          type: 'despesa',
          amount,
          description: `Conta: ${base.name || 'Fatura'}`,
          date: dateVal,
          category: 'Contas',
          tipoVenda: base.tipo || 'pessoal',
          formaPagamento: 'pix',
        });
        if (txId) {
          syncBankForAutoExpense({ type: 'expense', amount, formaPagamento: 'pix', tipoVenda: base.tipo || 'pessoal' }, false);
          item = { ...item, paidTransactionId: txId };
        }
      }
      setBoletos((prev) => [...prev, item]);
      return;
    }
    const { data, error } = await supabase.from('boletos').insert({ user_id: user.id, data: base }).select('*').single();
    if (error) return showDbError(error, 'cadastrar boleto');
    if (!data) return;
    let item = { id: data.id, ...(data.data || {}) };
    if (item.paid && amount > 0) {
      const txId = await addTransaction({
        type: 'despesa',
        amount,
        description: `Conta: ${item.name || 'Fatura'}`,
        date: dateVal,
        category: 'Contas',
        tipoVenda: item.tipo || 'pessoal',
        formaPagamento: 'pix',
      });
      if (txId) {
        syncBankForAutoExpense({ type: 'expense', amount, formaPagamento: 'pix', tipoVenda: item.tipo || 'pessoal' }, false);
        item = { ...item, paidTransactionId: txId };
        const { id: _rid, ...dataOnly } = item;
        const { error: upErr } = await supabase.from('boletos').update({ data: dataOnly }).eq('id', data.id);
        if (upErr) showDbError(upErr, 'atualizar boleto');
      }
    }
    setBoletos((prev) => [...prev, item]);
  };

  const updateBoleto = async (id, patch) => {
    const prev = boletos.find((x) => x.id === id);
    if (!prev) return;

    let next = { ...prev, ...patch };
    const rowId = prev.id;
    const wasPaid = !!prev.paid;
    const nowPaid = !!next.paid;
    const amount = Number(next.amount) || 0;
    const dateVal = new Date().toISOString().slice(0, 10);

    if (!wasPaid && nowPaid && amount > 0) {
      const txId = await addTransaction({
        type: 'despesa',
        amount,
        description: `Conta: ${next.name || 'Fatura'}`,
        date: dateVal,
        category: 'Contas',
        tipoVenda: next.tipo || 'pessoal',
        formaPagamento: 'pix',
      });
      if (txId) {
        syncBankForAutoExpense({ type: 'expense', amount, formaPagamento: 'pix', tipoVenda: next.tipo || 'pessoal' }, false);
        next = { ...next, paidTransactionId: txId };
      }
    } else if (wasPaid && !nowPaid && prev.paidTransactionId) {
      const tx = transactions.find((t) => t.id === prev.paidTransactionId);
      if (tx) syncBankForAutoExpense(tx, true);
      await deleteTransaction(prev.paidTransactionId);
      const { paidTransactionId: _pt, ...rest } = next;
      next = { ...rest, paid: false };
    }

    const { id: _omit, ...dataForDb } = next;
    if (!user) {
      setBoletos((p) => p.map((x) => (x.id === rowId ? next : x)));
      return;
    }
    const { error } = await supabase.from('boletos').update({ data: dataForDb }).eq('id', rowId);
    if (error) return showDbError(error, 'atualizar boleto');
    setBoletos((p) => p.map((x) => (x.id === rowId ? next : x)));
  };

  const deleteBoleto = async (id) => {
    const prev = boletos.find((x) => x.id === id);
    if (prev?.paidTransactionId) {
      const tx = transactions.find((t) => t.id === prev.paidTransactionId);
      if (tx) syncBankForAutoExpense(tx, true);
      await deleteTransaction(prev.paidTransactionId);
    }
    if (!user) {
      setBoletos((p) => p.filter((x) => x.id !== id));
      return;
    }
    await supabase.from('boletos').delete().eq('id', id);
    setBoletos((p) => p.filter((x) => x.id !== id));
  };

  const addAReceber = async (r) => {
    if (!user) {
      setAReceber((prev) => [...prev, { ...r, id: Date.now().toString() }]);
      return;
    }
    const { data, error } = await supabase.from('a_receber').insert({
      user_id: user.id,
      description: r.description,
      amount: r.amount,
      due_date: r.dueDate,
      parcel: r.parcel ?? 1,
      total: r.total ?? 1,
      status: r.status ?? 'pendente',
    }).select('*').single();
    if (error) return showDbError(error, 'cadastrar a receber');
    if (data) setAReceber((prev) => [...prev, toAReceber(data)]);
  };
  const updateAReceber = async (id, data) => {
    if (!user) return setAReceber((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    const up = {};
    if (data.description != null) up.description = data.description;
    if (data.amount != null) up.amount = data.amount;
    if (data.dueDate != null) up.due_date = data.dueDate;
    if (data.parcel != null) up.parcel = data.parcel;
    if (data.total != null) up.total = data.total;
    if (data.status != null) up.status = data.status;
    await supabase.from('a_receber').update(up).eq('id', id);
    setAReceber((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
  };
  const deleteAReceber = async (id) => {
    if (!user) return setAReceber((prev) => prev.filter((x) => x.id !== id));
    await supabase.from('a_receber').delete().eq('id', id);
    setAReceber((prev) => prev.filter((x) => x.id !== id));
  };

  const getNextOrcamentoNumero = useCallback(async () => {
    if (!user?.id) return `ORC-${String(Date.now() % 100000).padStart(5, '0')}`;
    const list = orcamentos.length ? orcamentos.map((o) => o.numero) : (await supabase.from('orcamentos').select('numero').eq('user_id', user.id).order('created_at', { ascending: false })).data?.map((r) => r.numero) || [];
    const nums = list.map((n) => parseInt((n || '').replace(/^ORC-?/i, ''), 10)).filter((x) => !isNaN(x) && x > 0);
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return `ORC-${String(next).padStart(5, '0')}`;
  }, [user?.id, orcamentos]);

  const addOrcamento = async (o) => {
    if (!user) {
      const num = `ORC-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`;
      const n = { ...o, id: Date.now().toString(), numero: o.numero || num };
      setOrcamentos((prev) => [n, ...prev]);
      return n;
    }
    const numero = o.numero || (await getNextOrcamentoNumero());
    const { data, error } = await supabase.from('orcamentos').insert({
      user_id: user.id,
      numero,
      client_id: o.clientId || null,
      items: o.items || [],
      subtotal: Number(o.subtotal || 0),
      desconto: Number(o.desconto || 0),
      total: Number(o.total || 0),
      observacoes: o.observacoes || null,
      validade: o.validade || null,
      termos: o.termos || null,
      agenda_data: o.agendaData || null,
      agenda_hora: o.agendaHora || null,
      agenda_obs: o.agendaObs || null,
      status: o.status || 'rascunho',
    }).select('*').single();
    if (error) return showDbError(error, 'criar orçamento');
    if (data) setOrcamentos((prev) => [toOrcamento(data), ...prev]);
    return toOrcamento(data);
  };
  const updateOrcamento = async (id, data) => {
    if (!user) {
      setOrcamentos((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
      return;
    }
    const up = {};
    if (data.numero != null) up.numero = data.numero;
    if (data.clientId !== undefined) up.client_id = data.clientId;
    if (data.items !== undefined) up.items = data.items;
    if (data.subtotal != null) up.subtotal = data.subtotal;
    if (data.desconto != null) up.desconto = data.desconto;
    if (data.total != null) up.total = data.total;
    if (data.observacoes !== undefined) up.observacoes = data.observacoes;
    if (data.validade !== undefined) up.validade = data.validade;
    if (data.termos !== undefined) up.termos = data.termos;
    if (data.agendaData !== undefined) up.agenda_data = data.agendaData;
    if (data.agendaHora !== undefined) up.agenda_hora = data.agendaHora;
    if (data.agendaObs !== undefined) up.agenda_obs = data.agendaObs;
    if (data.status != null) up.status = data.status;
    up.updated_at = new Date().toISOString();
    await supabase.from('orcamentos').update(up).eq('id', id);
    setOrcamentos((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
  };
  const deleteOrcamento = async (id) => {
    if (!user) return setOrcamentos((prev) => prev.filter((x) => x.id !== id));
    await supabase.from('orcamentos').delete().eq('id', id);
    setOrcamentos((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        budgets,
        orcamentos,
        addOrcamento,
        updateOrcamento,
        deleteOrcamento,
        getNextOrcamentoNumero,
        clients,
        products,
        compositeProducts,
        addCompositeProduct,
        updateCompositeProduct,
        deleteCompositeProduct,
        services,
        suppliers,
        collaborators,
        boletos,
        aReceber,
        agendaEvents,
        checkListItems,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addAgendaEvent,
        updateAgendaEvent,
        deleteAgendaEvent,
        refreshAgendaEvents,
        addCheckListItem,
        updateCheckListItem,
        deleteCheckListItem,
        addClient,
        updateClient,
        deleteClient,
        addProduct,
        updateProduct,
        deleteProduct,
        addService,
        updateService,
        deleteService,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addCollaborator,
        updateCollaborator,
        deleteCollaborator,
        addCollaboratorPayment,
        addBoleto,
        updateBoleto,
        deleteBoleto,
        addAReceber,
        deleteAReceber,
        updateAReceber,
        loading,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance fora do provider');
  return ctx;
}
