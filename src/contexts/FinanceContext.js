import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

function showDbError(error, context = 'salvar') {
  const msg = error?.message || String(error) || 'Erro desconhecido';
  Alert.alert('Erro ao ' + context, msg);
  console.warn('Supabase error:', error);
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
    formaPagamento: r.forma_pagamento,
    tipoVenda: r.tipo_venda,
    desconto: Number(r.desconto || 0),
  };
}
function toAgenda(r) {
  if (!r) return null;
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
  };
}
function toCheckList(r) {
  if (!r) return null;
  return { id: r.id, title: r.title, checked: r.checked, date: r.date };
}
function toClient(r) {
  if (!r) return null;
  return { id: r.id, name: r.name, email: r.email, phone: r.phone, foto: r.foto, nivel: r.nivel };
}
function toProduct(r) {
  if (!r) return null;
  const data = r.data || {};
  const photoUris = data.photo_uris && Array.isArray(data.photo_uris) ? data.photo_uris : (r.photo_uri ? [r.photo_uri] : []);
  return {
    id: r.id, name: r.name, price: Number(r.price), costPrice: Number(r.cost_price || 0), discount: Number(r.discount || 0), unit: r.unit,
    photoUri: photoUris[0] || r.photo_uri, photoUris,
    code: data.code, allowDiscount: data.allow_discount !== false, stock: data.stock ?? 0, minStock: data.min_stock ?? 0, supplierId: data.supplier_id,
  };
}
function toService(r) {
  if (!r) return null;
  return { id: r.id, name: r.name, price: Number(r.price), discount: Number(r.discount || 0), photoUri: r.photo_uri };
}
function toSupplier(r) {
  if (!r) return null;
  return { id: r.id, name: r.name, email: r.email, phone: r.phone };
}
function toAReceber(r) {
  if (!r) return null;
  return { id: r.id, description: r.description, amount: Number(r.amount), dueDate: r.due_date, parcel: r.parcel, total: r.total, status: r.status };
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
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [budgets, setBudgets] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [compositeProducts, setCompositeProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [boletos, setBoletos] = useState([]);
  const [aReceber, setAReceber] = useState([]);
  const [agendaEvents, setAgendaEvents] = useState([]);
  const [checkListItems, setCheckListItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!user) {
      setTransactions(INITIAL_TRANSACTIONS);
      setClients([]);
      setProducts([]);
      setCompositeProducts([]);
      setServices([]);
      setSuppliers([]);
      setBoletos([]);
      setAReceber([]);
      setAgendaEvents([]);
      setCheckListItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [tx, ag, ch, cl, pr, comp, sv, su, ar] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('agenda_events').select('*').eq('user_id', user.id).order('date'),
        supabase.from('check_list_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('clients').select('*').eq('user_id', user.id),
        supabase.from('products').select('*').eq('user_id', user.id),
        supabase.from('composite_products').select('*').eq('user_id', user.id),
        supabase.from('services').select('*').eq('user_id', user.id),
        supabase.from('suppliers').select('*').eq('user_id', user.id),
        supabase.from('a_receber').select('*').eq('user_id', user.id),
      ]);
      if (tx.data) setTransactions((tx.data || []).map(toTransaction));
      if (ag.data) setAgendaEvents((ag.data || []).map(toAgenda));
      if (ch.data) setCheckListItems((ch.data || []).map(toCheckList));
      if (cl.data) setClients((cl.data || []).map(toClient));
      if (pr.data) setProducts((pr.data || []).map(toProduct));
      if (comp.data) setCompositeProducts((comp.data || []).map((r) => ({ id: r.id, ...r.data })));
      if (sv.data) setServices((sv.data || []).map(toService));
      if (su.data) setSuppliers((su.data || []).map(toSupplier));
      if (ar.data) setAReceber((ar.data || []).map(toAReceber));
      const bl = await supabase.from('boletos').select('*').eq('user_id', user.id);
      if (bl.data) setBoletos((bl.data || []).map((r) => ({ id: r.id, ...r.data })));
    } catch (e) {
      console.warn('Erro ao carregar dados Supabase:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const addTransaction = async (t) => {
    if (!user) {
      const n = { ...t, id: Date.now().toString() };
      setTransactions((prev) => [...prev, n]);
      return;
    }
    const txType = t.type === 'receita' ? 'income' : (t.type === 'despesa' ? 'expense' : (t.type || 'income'));
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
    if (error) return showDbError(error, 'cadastrar transação');
    if (data) setTransactions((prev) => [toTransaction(data), ...prev]);
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
        clientId: e.clientId,
        serviceId: e.serviceId,
        status: e.status || 'pendente',
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
    };
    const { data, error } = await supabase.from('agenda_events').insert(payload).select('*').single();
    if (error) return showDbError(error, 'cadastrar evento');
    if (data) setAgendaEvents((prev) => [...prev, toAgenda(data)]);
  };
  const updateAgendaEvent = async (id, data) => {
    if (!user) return setAgendaEvents((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    const up = {};
    if (data.title != null) up.title = data.title;
    if (data.description != null) up.description = data.description;
    if (data.date != null) up.date = data.date;
    if (data.time != null) up.time = data.time;
    if (data.timeEnd != null) up.time_end = data.timeEnd;
    if (data.type != null) up.type = data.type;
    if (data.clientId != null) up.client_id = data.clientId;
    if (data.serviceId != null) up.service_id = data.serviceId;
    if (data.amount != null) up.amount = data.amount;
    if (data.tipo != null) up.tipo = data.tipo;
    if (data.status != null) up.status = data.status;
    await supabase.from('agenda_events').update(up).eq('id', id);
    setAgendaEvents((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
  };
  const deleteAgendaEvent = async (id) => {
    if (!user) return setAgendaEvents((prev) => prev.filter((e) => e.id !== id));
    await supabase.from('agenda_events').delete().eq('id', id);
    setAgendaEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const addCheckListItem = async (item) => {
    if (!user) {
      setCheckListItems((prev) => [...prev, { ...item, id: Date.now().toString() }]);
      return;
    }
    const { data, error } = await supabase.from('check_list_items').insert({
      user_id: user.id,
      title: item.title,
      checked: item.checked ?? false,
      date: item.date,
    }).select('*').single();
    if (error) return showDbError(error, 'cadastrar tarefa');
    if (data) setCheckListItems((prev) => [...prev, toCheckList(data)]);
  };
  const updateCheckListItem = async (id, data) => {
    if (!user) return setCheckListItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));
    await supabase.from('check_list_items').update(data).eq('id', id);
    setCheckListItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));
  };
  const deleteCheckListItem = async (id) => {
    if (!user) return setCheckListItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from('check_list_items').delete().eq('id', id);
    setCheckListItems((prev) => prev.filter((i) => i.id !== id));
  };

  const addClient = async (c) => {
    if (!user) {
      const id = Date.now().toString();
      setClients((prev) => [...prev, { ...c, id, name: c.name, foto: c.foto || null, nivel: c.nivel || 'orcamento' }]);
      return id;
    }
    const { data, error } = await supabase.from('clients').insert({
      user_id: user.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      foto: c.foto || null,
      nivel: c.nivel || 'orcamento',
    }).select('*').single();
    if (error) { showDbError(error, 'cadastrar cliente'); return null; }
    if (data) { setClients((prev) => [...prev, toClient(data)]); return data.id; }
    return null;
  };
  const updateClient = async (id, data) => {
    if (!user) return setClients((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    await supabase.from('clients').update(data).eq('id', id);
    setClients((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
  };
  const deleteClient = async (id) => {
    if (!user) return setClients((prev) => prev.filter((x) => x.id !== id));
    await supabase.from('clients').delete().eq('id', id);
    setClients((prev) => prev.filter((x) => x.id !== id));
  };

  const addProduct = async (p) => {
    if (!user) {
      setProducts((prev) => [...prev, { ...p, id: Date.now().toString() }]);
      return;
    }
    const photoUris = (p.photoUris && p.photoUris.length > 0) ? p.photoUris : (p.photoUri ? [p.photoUri] : []);
    const dataJson = {
      ...(p.code != null && { code: p.code }),
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
    if (data.code !== undefined || data.allowDiscount !== undefined || data.stock !== undefined || data.minStock !== undefined || data.supplierId !== undefined || data.photoUris !== undefined) {
      const curr = (await supabase.from('products').select('data').eq('id', id).single()).data?.data || {};
      const photoUris = data.photoUris !== undefined ? (data.photoUris?.length ? data.photoUris : []) : undefined;
      up.data = {
        ...curr,
        ...(data.code !== undefined && { code: data.code }),
        ...(data.allowDiscount !== undefined && { allow_discount: data.allowDiscount }),
        ...(data.stock !== undefined && { stock: data.stock }),
        ...(data.minStock !== undefined && { min_stock: data.minStock }),
        ...(data.supplierId !== undefined && { supplier_id: data.supplierId }),
        ...(photoUris !== undefined && { photo_uris: photoUris }),
      };
    }
    if (data.photoUris !== undefined) up.photo_uri = data.photoUris?.length > 0 ? data.photoUris[0] : null;
    await supabase.from('products').update(up).eq('id', id);
    setProducts((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
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
      setSuppliers((prev) => [...prev, { ...s, id: Date.now().toString() }]);
      return;
    }
    const { data, error } = await supabase.from('suppliers').insert({
      user_id: user.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
    }).select('*').single();
    if (error) return showDbError(error, 'cadastrar fornecedor');
    if (data) setSuppliers((prev) => [...prev, toSupplier(data)]);
  };
  const updateSupplier = async (id, data) => {
    if (!user) return setSuppliers((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    await supabase.from('suppliers').update(data).eq('id', id);
    setSuppliers((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
  };
  const deleteSupplier = async (id) => {
    if (!user) return setSuppliers((prev) => prev.filter((x) => x.id !== id));
    await supabase.from('suppliers').delete().eq('id', id);
    setSuppliers((prev) => prev.filter((x) => x.id !== id));
  };

  const addBoleto = async (b) => {
    if (!user) {
      setBoletos((prev) => [...prev, { ...b, id: Date.now().toString() }]);
      return;
    }
    const { data, error } = await supabase.from('boletos').insert({ user_id: user.id, data: b }).select('*').single();
    if (error) return showDbError(error, 'cadastrar boleto');
    if (data) setBoletos((prev) => [...prev, { id: data.id, ...data.data }]);
  };
  const updateBoleto = async (id, data) => {
    if (!user) return setBoletos((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    await supabase.from('boletos').update({ data }).eq('id', id);
    setBoletos((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
  };
  const deleteBoleto = async (id) => {
    if (!user) return setBoletos((prev) => prev.filter((x) => x.id !== id));
    await supabase.from('boletos').delete().eq('id', id);
    setBoletos((prev) => prev.filter((x) => x.id !== id));
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

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        budgets,
        clients,
        products,
        compositeProducts,
        addCompositeProduct,
        updateCompositeProduct,
        deleteCompositeProduct,
        services,
        suppliers,
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
