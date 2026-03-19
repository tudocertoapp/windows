import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useFinance } from './FinanceContext';

const EmpresaContext = createContext(undefined);

export function EmpresaProvider({ children }) {
  const { user } = useAuth();
  const { transactions, agendaEvents, clients } = useFinance();
  const [notasFiscais, setNotasFiscais] = useState([]);
  const [remuneracoes, setRemuneracoes] = useState([]);
  const [fluxo, setFluxo] = useState([]);
  const [comandas, setComandas] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [atendimentos, setAtendimentos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotasFiscais = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('empresa_notas_fiscais').select('*').eq('user_id', user.id).order('data', { ascending: false });
      setNotasFiscais(data || []);
    } catch (e) {
      setNotasFiscais([]);
    }
  }, [user?.id]);

  const loadRemuneracoes = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('empresa_remuneracoes').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setRemuneracoes(data || []);
    } catch { setRemuneracoes([]); }
  }, [user?.id]);

  const loadFluxo = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('empresa_fluxo').select('*').eq('user_id', user.id).order('data', { ascending: false });
      setFluxo(data || []);
    } catch { setFluxo([]); }
  }, [user?.id]);

  const loadComandas = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('empresa_comandas').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
      setComandas(data || []);
    } catch { setComandas([]); }
  }, [user?.id]);

  const loadVendas = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('empresa_vendas').select('*').eq('user_id', user.id).order('data', { ascending: false });
      setVendas(data || []);
    } catch { setVendas([]); }
  }, [user?.id]);

  const loadAtendimentos = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('empresa_atendimentos').select('*').eq('user_id', user.id).order('data', { ascending: false });
      setAtendimentos(data || []);
    } catch { setAtendimentos([]); }
  }, [user?.id]);

  const loadColaboradores = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('empresa_colaboradores').select('*').eq('user_id', user.id).order('nome');
      setColaboradores(data || []);
    } catch { setColaboradores([]); }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      loadNotasFiscais(),
      loadRemuneracoes(),
      loadFluxo(),
      loadComandas(),
      loadVendas(),
      loadAtendimentos(),
      loadColaboradores(),
    ]).finally(() => setLoading(false));
  }, [user?.id, loadNotasFiscais, loadRemuneracoes, loadFluxo, loadComandas, loadVendas, loadAtendimentos, loadColaboradores]);

  const addNotaFiscal = useCallback(async (item) => {
    if (!user?.id) return null;
    const { data, error } = await supabase.from('empresa_notas_fiscais').insert({
      user_id: user.id,
      numero: item.numero || `NF-${Date.now()}`,
      cliente_nome: item.clienteNome,
      produto: item.produto,
      valor: Number(item.valor) || 0,
      imposto: Number(item.imposto) || 0,
      data: item.data,
      status: item.status || 'pendente',
      observacao: item.observacao,
    }).select().single();
    if (!error) await loadNotasFiscais();
    return { data, error };
  }, [user?.id, loadNotasFiscais]);

  const updateNotaFiscal = useCallback(async (id, updates) => {
    const { error } = await supabase.from('empresa_notas_fiscais').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    if (!error) await loadNotasFiscais();
    return { error };
  }, [loadNotasFiscais]);

  const deleteNotaFiscal = useCallback(async (id) => {
    await supabase.from('empresa_notas_fiscais').delete().eq('id', id);
    await loadNotasFiscais();
  }, [loadNotasFiscais]);

  const addRemuneracao = useCallback(async (item) => {
    if (!user?.id) return null;
    const valorFinal = (Number(item.salario) || 0) + (Number(item.bonus) || 0) - (Number(item.descontos) || 0);
    const { data, error } = await supabase.from('empresa_remuneracoes').insert({
      user_id: user.id,
      colaborador_id: item.colaboradorId,
      colaborador_nome: item.colaboradorNome,
      salario: Number(item.salario) || 0,
      bonus: Number(item.bonus) || 0,
      descontos: Number(item.descontos) || 0,
      valor_final: valorFinal,
      status: item.status || 'pendente',
      data_pagamento: item.dataPagamento,
    }).select().single();
    if (!error) await loadRemuneracoes();
    return { data, error };
  }, [user?.id, loadRemuneracoes]);

  const addFluxo = useCallback(async (item) => {
    if (!user?.id) return null;
    const { data, error } = await supabase.from('empresa_fluxo').insert({
      user_id: user.id,
      tipo: item.tipo,
      descricao: item.descricao,
      categoria: item.categoria,
      valor: Number(item.valor) || 0,
      data: item.data,
    }).select().single();
    if (!error) await loadFluxo();
    return { data, error };
  }, [user?.id, loadFluxo]);

  const addComanda = useCallback(async (item) => {
    if (!user?.id) return null;
    const { data, error } = await supabase.from('empresa_comandas').insert({
      user_id: user.id,
      numero: item.numero,
      cliente_nome: item.clienteNome,
      itens: item.itens || [],
      valor_total: Number(item.valorTotal) || 0,
      status: item.status || 'aberta',
    }).select().single();
    if (!error) await loadComandas();
    return { data, error };
  }, [user?.id, loadComandas]);

  const updateComanda = useCallback(async (id, updates) => {
    const { error } = await supabase.from('empresa_comandas').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    if (!error) await loadComandas();
    return { error };
  }, [loadComandas]);

  const addVenda = useCallback(async (item) => {
    if (!user?.id) return null;
    const valorTotal = (Number(item.valorUnitario) || 0) * (Number(item.quantidade) || 1);
    const { data, error } = await supabase.from('empresa_vendas').insert({
      user_id: user.id,
      cliente_id: item.clienteId,
      cliente_nome: item.clienteNome,
      produto: item.produto,
      quantidade: Number(item.quantidade) || 1,
      valor_unitario: Number(item.valorUnitario) || 0,
      valor_total: valorTotal,
      data: item.data,
    }).select().single();
    if (!error) await loadVendas();
    return { data, error };
  }, [user?.id, loadVendas]);

  const addAtendimento = useCallback(async (item) => {
    if (!user?.id) return null;
    const { data, error } = await supabase.from('empresa_atendimentos').insert({
      user_id: user.id,
      cliente_id: item.clienteId,
      cliente_nome: item.clienteNome,
      tipo: item.tipo,
      colaborador_id: item.colaboradorId,
      colaborador_nome: item.colaboradorNome,
      data: item.data,
      status: item.status || 'agendado',
      observacao: item.observacao,
    }).select().single();
    if (!error) await loadAtendimentos();
    return { data, error };
  }, [user?.id, loadAtendimentos]);

  const updateAtendimento = useCallback(async (id, updates) => {
    await supabase.from('empresa_atendimentos').update(updates).eq('id', id);
    await loadAtendimentos();
  }, [loadAtendimentos]);

  const addColaborador = useCallback(async (item) => {
    if (!user?.id) return null;
    const { data, error } = await supabase.from('empresa_colaboradores').insert({
      user_id: user.id,
      nome: item.nome,
      cargo: item.cargo,
      telefone: item.telefone,
      email: item.email,
      salario: Number(item.salario) || 0,
      data_admissao: item.dataAdmissao,
      status: item.status || 'ativo',
    }).select().single();
    if (!error) await loadColaboradores();
    return { data, error };
  }, [user?.id, loadColaboradores]);

  const updateColaborador = useCallback(async (id, updates) => {
    await supabase.from('empresa_colaboradores').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    await loadColaboradores();
  }, [loadColaboradores]);

  const deleteColaborador = useCallback(async (id) => {
    await supabase.from('empresa_colaboradores').delete().eq('id', id);
    await loadColaboradores();
  }, [loadColaboradores]);

  const saldoFluxo = useCallback(() => {
    const entradas = fluxo.filter((f) => f.tipo === 'entrada').reduce((s, f) => s + Number(f.valor || 0), 0);
    const saidas = fluxo.filter((f) => f.tipo === 'saida').reduce((s, f) => s + Number(f.valor || 0), 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [fluxo]);

  const totalVendasPeriodo = useCallback((start, end) => {
    return vendas
      .filter((v) => {
        const d = new Date(v.data);
        return d >= new Date(start) && d <= new Date(end);
      })
      .reduce((s, v) => s + Number(v.valor_total || 0), 0);
  }, [vendas]);

  const lucroMensal = useCallback((year, month) => {
    const tx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month - 1;
    });
    const receitas = tx.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const despesas = tx.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    return receitas - despesas;
  }, [transactions]);

  const value = {
    loading,
    notasFiscais,
    remuneracoes,
    fluxo,
    comandas,
    vendas,
    atendimentos,
    colaboradores,
    loadNotasFiscais,
    loadRemuneracoes,
    loadFluxo,
    loadComandas,
    loadVendas,
    loadAtendimentos,
    loadColaboradores,
    addNotaFiscal,
    updateNotaFiscal,
    deleteNotaFiscal,
    addRemuneracao,
    addFluxo,
    addComanda,
    updateComanda,
    addVenda,
    addAtendimento,
    updateAtendimento,
    addColaborador,
    updateColaborador,
    deleteColaborador,
    saldoFluxo,
    totalVendasPeriodo,
    lucroMensal,
    clients,
  };

  return <EmpresaContext.Provider value={value}>{children}</EmpresaContext.Provider>;
}

export function useEmpresa() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error('useEmpresa must be used within EmpresaProvider');
  return ctx;
}
