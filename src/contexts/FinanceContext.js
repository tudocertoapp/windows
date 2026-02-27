import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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
  return { id: r.id, title: r.title, description: r.description, date: r.date, time: r.time, type: r.type };
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
  return {
    id: r.id, name: r.name, price: Number(r.price), costPrice: Number(r.cost_price || 0), discount: Number(r.discount || 0), unit: r.unit, photoUri: r.photo_uri,
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
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('agenda_events').select('*').order('date'),
        supabase.from('check_list_items').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*'),
        supabase.from('products').select('*'),
        supabase.from('composite_products').select('*'),
        supabase.from('services').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('a_receber').select('*'),
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
      const bl = await supabase.from('boletos').select('*');
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
    const { data, error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      category: t.category,
      date: t.date,
      forma_pagamento: t.formaPagamento,
      tipo_venda: t.tipoVenda,
      desconto: t.desconto || 0,
    }).select('*').single();
    if (!error && data) setTransactions((prev) => [toTransaction(data), ...prev]);
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
      setAgendaEvents((prev) => [...prev, { ...e, id: Date.now().toString() }]);
      return;
    }
    const { data } = await supabase.from('agenda_events').insert({
      user_id: user.id,
      title: e.title,
      description: e.description,
      date: e.date,
      time: e.time,
      type: e.type || 'meeting',
    }).select('*').single();
    if (data) setAgendaEvents((prev) => [...prev, toAgenda(data)]);
  };
  const updateAgendaEvent = async (id, data) => {
    if (!user) return setAgendaEvents((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    await supabase.from('agenda_events').update(data).eq('id', id);
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
    const { data } = await supabase.from('check_list_items').insert({
      user_id: user.id,
      title: item.title,
      checked: item.checked ?? false,
      date: item.date,
    }).select('*').single();
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
      setClients((prev) => [...prev, { ...c, id: Date.now().toString(), name: c.name, foto: c.foto || null, nivel: c.nivel || 'orcamento' }]);
      return;
    }
    const { data } = await supabase.from('clients').insert({
      user_id: user.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      foto: c.foto || null,
      nivel: c.nivel || 'orcamento',
    }).select('*').single();
    if (data) setClients((prev) => [...prev, toClient(data)]);
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
    const dataJson = {
      ...(p.code != null && { code: p.code }),
      ...(p.allowDiscount != null && { allow_discount: p.allowDiscount }),
      ...(p.stock != null && { stock: p.stock }),
      ...(p.minStock != null && { min_stock: p.minStock }),
      ...(p.supplierId != null && { supplier_id: p.supplierId }),
    };
    const { data } = await supabase.from('products').insert({
      user_id: user.id,
      name: p.name,
      price: p.price ?? 0,
      cost_price: p.costPrice ?? 0,
      discount: p.discount ?? 0,
      unit: p.unit || 'un',
      photo_uri: p.photoUri,
      data: Object.keys(dataJson).length ? dataJson : undefined,
    }).select('*').single();
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
    if (data.code !== undefined || data.allowDiscount !== undefined || data.stock !== undefined || data.minStock !== undefined || data.supplierId !== undefined) {
      const curr = (await supabase.from('products').select('data').eq('id', id).single()).data?.data || {};
      up.data = {
        ...curr,
        ...(data.code !== undefined && { code: data.code }),
        ...(data.allowDiscount !== undefined && { allow_discount: data.allowDiscount }),
        ...(data.stock !== undefined && { stock: data.stock }),
        ...(data.minStock !== undefined && { min_stock: data.minStock }),
        ...(data.supplierId !== undefined && { supplier_id: data.supplierId }),
      };
    }
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
    const { data } = await supabase.from('composite_products').insert({
      user_id: user.id,
      name: p.name,
      data: p.data || p,
    }).select('*').single();
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
    const { data } = await supabase.from('services').insert({
      user_id: user.id,
      name: s.name,
      price: s.price ?? 0,
      discount: s.discount ?? 0,
      photo_uri: s.photoUri,
    }).select('*').single();
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
    const { data } = await supabase.from('suppliers').insert({
      user_id: user.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
    }).select('*').single();
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
    const { data } = await supabase.from('boletos').insert({ user_id: user.id, data: b }).select('*').single();
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
    const { data } = await supabase.from('a_receber').insert({
      user_id: user.id,
      description: r.description,
      amount: r.amount,
      due_date: r.dueDate,
      parcel: r.parcel ?? 1,
      total: r.total ?? 1,
      status: r.status ?? 'pendente',
    }).select('*').single();
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
