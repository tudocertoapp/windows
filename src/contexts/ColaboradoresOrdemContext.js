import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLABORADORES_KEY = '@tudocerto_colaboradores';
const ORDENS_SERVICO_KEY = '@tudocerto_ordens_servico';

const ColaboradoresOrdemContext = createContext(undefined);

export function ColaboradoresOrdemProvider({ children }) {
  const [colaboradores, setColaboradores] = useState([]);
  const [ordensServico, setOrdensServico] = useState([]);

  const loadColaboradores = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(COLABORADORES_KEY);
      const data = raw ? JSON.parse(raw) : [];
      setColaboradores(Array.isArray(data) ? data : []);
    } catch {
      setColaboradores([]);
    }
  }, []);

  const loadOrdensServico = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(ORDENS_SERVICO_KEY);
      const data = raw ? JSON.parse(raw) : [];
      setOrdensServico(Array.isArray(data) ? data : []);
    } catch {
      setOrdensServico([]);
    }
  }, []);

  useEffect(() => {
    loadColaboradores();
    loadOrdensServico();
  }, [loadColaboradores, loadOrdensServico]);

  const saveColaboradores = useCallback(async (list) => {
    setColaboradores(list);
    await AsyncStorage.setItem(COLABORADORES_KEY, JSON.stringify(list));
  }, []);

  const saveOrdensServico = useCallback(async (list) => {
    setOrdensServico(list);
    await AsyncStorage.setItem(ORDENS_SERVICO_KEY, JSON.stringify(list));
  }, []);

  const addColaborador = useCallback(
    async (item) => {
      const c = {
        id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        nome: item.nome?.trim() || '',
        cargo: item.cargo?.trim() || '',
        cpf: item.cpf?.trim() || '',
        rg: item.rg?.trim() || '',
        dataNascimento: item.dataNascimento || '',
        telefone: item.telefone?.trim() || '',
        email: item.email?.trim() || '',
        endereco: item.endereco?.trim() || '',
        cidade: item.cidade?.trim() || '',
        cep: item.cep?.trim() || '',
        departamento: item.departamento?.trim() || '',
        salario: item.salario ?? 0,
        dataAdmissao: item.dataAdmissao || '',
        dataDemissao: item.dataDemissao || '',
        status: item.status || 'ativo',
        observacoes: item.observacoes?.trim() || '',
        createdAt: new Date().toISOString(),
      };
      const next = [c, ...colaboradores];
      await saveColaboradores(next);
      return c.id;
    },
    [colaboradores, saveColaboradores]
  );

  const updateColaborador = useCallback(
    async (id, updates) => {
      const next = colaboradores.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      );
      await saveColaboradores(next);
    },
    [colaboradores, saveColaboradores]
  );

  const deleteColaborador = useCallback(
    async (id) => {
      await saveColaboradores(colaboradores.filter((c) => c.id !== id));
    },
    [colaboradores, saveColaboradores]
  );

  const addOrdemServico = useCallback(
    async (item) => {
      const o = {
        id: `os-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        numero: item.numero || `OS${Date.now().toString().slice(-6)}`,
        clienteNome: item.clienteNome?.trim() || '',
        clienteTelefone: item.clienteTelefone?.trim() || '',
        clienteEmail: item.clienteEmail?.trim() || '',
        clienteEndereco: item.clienteEndereco?.trim() || '',
        colaboradorId: item.colaboradorId || null,
        equipamento: item.equipamento?.trim() || '',
        modelo: item.modelo?.trim() || '',
        serial: item.serial?.trim() || '',
        defeitoRelatado: item.defeitoRelatado?.trim() || '',
        servicoSolicitado: item.servicoSolicitado?.trim() || '',
        diagnostico: item.diagnostico?.trim() || '',
        servicoRealizado: item.servicoRealizado?.trim() || '',
        pecasUtilizadas: item.pecasUtilizadas?.trim() || '',
        valorOrcado: item.valorOrcado ?? 0,
        valorFinal: item.valorFinal ?? 0,
        prioridade: item.prioridade || 'media',
        status: item.status || 'aberta',
        dataAbertura: item.dataAbertura || new Date().toISOString().slice(0, 10),
        dataPrevisao: item.dataPrevisao || '',
        dataConclusao: item.dataConclusao || '',
        garantia: item.garantia?.trim() || '',
        observacoes: item.observacoes?.trim() || '',
        createdAt: new Date().toISOString(),
      };
      const next = [o, ...ordensServico];
      await saveOrdensServico(next);
      return o.id;
    },
    [ordensServico, saveOrdensServico]
  );

  const updateOrdemServico = useCallback(
    async (id, updates) => {
      const next = ordensServico.map((o) =>
        o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o
      );
      await saveOrdensServico(next);
    },
    [ordensServico, saveOrdensServico]
  );

  const deleteOrdemServico = useCallback(
    async (id) => {
      await saveOrdensServico(ordensServico.filter((o) => o.id !== id));
    },
    [ordensServico, saveOrdensServico]
  );

  const value = {
    colaboradores,
    ordensServico,
    addColaborador,
    updateColaborador,
    deleteColaborador,
    addOrdemServico,
    updateOrdemServico,
    deleteOrdemServico,
  };

  return <ColaboradoresOrdemContext.Provider value={value}>{children}</ColaboradoresOrdemContext.Provider>;
}

export function useColaboradoresOrdem() {
  const ctx = useContext(ColaboradoresOrdemContext);
  if (!ctx) throw new Error('useColaboradoresOrdem must be used within ColaboradoresOrdemProvider');
  return ctx;
}
