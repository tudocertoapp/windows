import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const STORAGE_BASE = '@tudocerto_banks';

const LOGO_BASE = 'https://raw.githubusercontent.com/wesleyguirra/brazil-bank-data/main/bank-logos/256';
function logoUrl(compe) {
  if (compe == null || compe === '') return null;
  const s = String(compe).padStart(3, '0');
  return `${LOGO_BASE}/${s}.png`;
}

export const BANCOS_BRASIL = [
  { id: 'nubank', nome: 'Nubank', compe: 260, logo: logoUrl(260) },
  { id: 'itau', nome: 'Itaú', compe: 341, logo: logoUrl(341) },
  { id: 'bradesco', nome: 'Bradesco', compe: 237, logo: logoUrl(237) },
  { id: 'santander', nome: 'Santander', compe: 33, logo: logoUrl('033') },
  { id: 'caixa', nome: 'Caixa Econômica Federal', compe: 104, logo: logoUrl(104) },
  { id: 'bb', nome: 'Banco do Brasil', compe: 1, logo: logoUrl('001') },
  { id: 'inter', nome: 'Banco Inter', compe: 630, logo: logoUrl(630) },
  { id: 'c6', nome: 'C6 Bank', compe: 336, logo: logoUrl(336) },
  { id: 'btg', nome: 'BTG Pactual', compe: 208, logo: logoUrl(208) },
  { id: 'xp', nome: 'XP Investimentos', compe: 348, logo: logoUrl(348) },
  { id: 'safra', nome: 'Safra', compe: 422, logo: logoUrl(422) },
  { id: 'citi', nome: 'Citi', compe: 745, logo: logoUrl(745) },
  { id: 'sicoob', nome: 'Sicoob', compe: 756, logo: logoUrl(756) },
  { id: 'sicredi', nome: 'Sicredi', compe: 748, logo: logoUrl(748) },
  { id: 'pan', nome: 'Banco Pan', compe: 623, logo: logoUrl(623) },
  { id: 'neon', nome: 'Neon', compe: 655, logo: logoUrl(655) },
  { id: 'picpay', nome: 'PicPay', compe: 380, logo: logoUrl(380) },
  { id: 'mercadopago', nome: 'Mercado Pago', compe: 323, logo: logoUrl(323) },
  { id: 'original', nome: 'Banco Original', compe: 212, logo: logoUrl(212) },
  { id: 'daycoval', nome: 'Daycoval', compe: 707, logo: logoUrl(707) },
  { id: 'sofisa', nome: 'Sofisa', compe: 637, logo: logoUrl(637) },
  { id: 'bmg', nome: 'BMG', compe: 318, logo: logoUrl(318) },
  { id: 'pagseguro', nome: 'PagSeguro', compe: 290, logo: logoUrl(290) },
  { id: 'next', nome: 'Next', compe: 237, logo: logoUrl(237) },
  { id: 'will', nome: 'Will Bank', compe: 260, logo: logoUrl(260) },
  { id: 'banrisul', nome: 'Banrisul', compe: 41, logo: logoUrl(41) },
  { id: 'abc', nome: 'Banco ABC Brasil', compe: 246, logo: logoUrl(246) },
  { id: 'stone', nome: 'Stone', compe: 197, logo: logoUrl(197) },
  { id: 'agibank', nome: 'Agibank', compe: 121, logo: logoUrl(121) },
  { id: 'banestes', nome: 'Banestes', compe: 21, logo: logoUrl(21) },
  { id: 'brb', nome: 'BRB', compe: 70, logo: logoUrl(70) },
  { id: 'bs2', nome: 'BS2', compe: 218, logo: logoUrl(218) },
  { id: 'creditas', nome: 'Creditas', compe: 342, logo: logoUrl(342) },
  { id: 'digio', nome: 'Digio', compe: 380, logo: logoUrl(380) },
  { id: 'guarani', nome: 'Banco Guarani', compe: 740, logo: logoUrl(740) },
  { id: 'modal', nome: 'Modal', compe: 746, logo: logoUrl(746) },
  { id: 'portoseguro', nome: 'Porto Seguro', compe: 630, logo: logoUrl(630) },
  { id: 'renner', nome: 'Banco Renner', compe: 654, logo: logoUrl(654) },
  { id: 'santander_empresas', nome: 'Santander Empresas', compe: 33, logo: logoUrl(33) },
  { id: 'itau_empresas', nome: 'Itaú Empresas', compe: 341, logo: logoUrl(341) },
  { id: 'bb_empresas', nome: 'Banco do Brasil Empresas', compe: 1, logo: logoUrl(1) },
  { id: 'bradesco_empresas', nome: 'Bradesco Empresas', compe: 237, logo: logoUrl(237) },
  { id: 'caixa_empresas', nome: 'Caixa Empresas', compe: 104, logo: logoUrl(104) },
  { id: 'outro', nome: 'Outro', compe: null, logo: null },
];

function showDbError(error, context = 'salvar') {
  const msg = error?.message || String(error) || 'Erro desconhecido';
  Alert.alert('Erro ao ' + context, msg);
  console.warn('[Supabase banks]', error);
}

function isMissingTableError(error) {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  return error.code === '42P01' || (msg.includes('relation') && msg.includes('does not exist'));
}

function toBank(row) {
  if (!row) return null;
  return {
    id: row.id,
    bancoId: row.banco_id || 'outro',
    nomeCustom: row.nome_custom || null,
    tipo: row.tipo || 'pessoal',
    tipoConta: row.tipo_conta || 'ambos',
    saldo: Number(row.saldo) || 0,
    cor: row.cor || null,
    bandeira: row.bandeira || 'visa',
  };
}

function toCard(row) {
  if (!row) return null;
  return {
    id: row.id,
    bankId: row.bank_id || null,
    name: row.name || '',
    diaFechamento: Number(row.dia_fechamento) || 10,
    diaVencimento: Number(row.dia_vencimento) || 15,
    saldo: Number(row.saldo) || 0,
    bandeira: row.bandeira || 'visa',
  };
}

function bankToRow(userId, bank) {
  const temDebito = bank.tipoConta === 'debito' || bank.tipoConta === 'ambos';
  return {
    user_id: userId,
    banco_id: bank.bancoId || 'outro',
    nome_custom: bank.nomeCustom || null,
    tipo: bank.tipo || 'pessoal',
    tipo_conta: bank.tipoConta || 'ambos',
    saldo: temDebito ? (Number(bank.saldo) || 0) : 0,
    cor: bank.cor || null,
    bandeira: bank.bandeira || 'visa',
  };
}

function cardToRow(userId, card) {
  return {
    user_id: userId,
    bank_id: card.bankId || null,
    name: card.name || '',
    dia_fechamento: Number(card.diaFechamento) || 10,
    dia_vencimento: Number(card.diaVencimento) || 15,
    saldo: Number(card.saldo) || 0,
    bandeira: card.bandeira || 'visa',
  };
}

const BanksContext = createContext(undefined);

export function BanksProvider({ children }) {
  const { user } = useAuth();
  const [banks, setBanks] = useState([]);
  const [cards, setCards] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const storageKey = `${STORAGE_BASE}_${user?.id || 'guest'}`;

  const persistLocalCache = useCallback(async (b, c) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify({ banks: b, cards: c }));
    } catch (_) {}
  }, [storageKey]);

  const loadFromLocal = useCallback(async () => {
    let raw = await AsyncStorage.getItem(storageKey);
    if (!raw && user?.id) {
      const guestRaw = await AsyncStorage.getItem(`${STORAGE_BASE}_guest`);
      if (guestRaw) {
        raw = guestRaw;
        await AsyncStorage.setItem(storageKey, guestRaw);
      }
    }
    if (!raw) return { banks: [], cards: [] };
    const parsed = JSON.parse(raw);
    return {
      banks: Array.isArray(parsed.banks) ? parsed.banks : [],
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
    };
  }, [storageKey, user?.id]);

  const loadFromSupabase = useCallback(async () => {
    if (!user?.id) return loadFromLocal();

    const [banksRes, cardsRes] = await Promise.all([
      supabase.from('user_banks').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('user_cards').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    ]);

    if (isMissingTableError(banksRes.error) || isMissingTableError(cardsRes.error)) {
      console.warn('[Banks] Tabelas user_banks/user_cards não existem. Usando cache local. Execute supabase/migrations/20260515000000_user_banks_cards.sql');
      return loadFromLocal();
    }

    if (banksRes.error) {
      showDbError(banksRes.error, 'carregar bancos');
      return loadFromLocal();
    }
    if (cardsRes.error) {
      showDbError(cardsRes.error, 'carregar cartões');
      return loadFromLocal();
    }

    const b = (banksRes.data || []).map(toBank).filter(Boolean);
    const c = (cardsRes.data || []).map(toCard).filter(Boolean);
    await persistLocalCache(b, c);
    return { banks: b, cards: c };
  }, [user?.id, loadFromLocal, persistLocalCache]);

  const migrateLocalToSupabase = useCallback(async (localBanks, localCards) => {
    if (!user?.id || !localBanks?.length) return { banks: localBanks, cards: localCards };

    const idMap = {};
    for (const bank of localBanks) {
      const { data, error } = await supabase
        .from('user_banks')
        .insert(bankToRow(user.id, bank))
        .select('*')
        .single();
      if (error) {
        showDbError(error, 'migrar banco');
        continue;
      }
      if (data?.id) idMap[bank.id] = data.id;
    }

    for (const card of localCards || []) {
      const newBankId = idMap[card.bankId] || card.bankId;
      if (!newBankId) continue;
      const { error } = await supabase.from('user_cards').insert({
        ...cardToRow(user.id, { ...card, bankId: newBankId }),
      });
      if (error) showDbError(error, 'migrar cartão');
    }

    return loadFromSupabase();
  }, [user?.id, loadFromSupabase]);

  useEffect(() => {
    setLoaded(false);
    setBanks([]);
    setCards([]);
    (async () => {
      try {
        const { banks: remoteBanks, cards: remoteCards } = await loadFromSupabase();
        if (user?.id && remoteBanks.length === 0 && remoteCards.length === 0) {
          const local = await loadFromLocal();
          if (local.banks.length > 0 || local.cards.length > 0) {
            const migrated = await migrateLocalToSupabase(local.banks, local.cards);
            setBanks(migrated.banks);
            setCards(migrated.cards);
            setLoaded(true);
            return;
          }
        }
        setBanks(remoteBanks);
        setCards(remoteCards);
      } catch (_) {
        const local = await loadFromLocal();
        setBanks(local.banks);
        setCards(local.cards);
      }
      setLoaded(true);
    })();
  }, [user?.id, loadFromSupabase, loadFromLocal, migrateLocalToSupabase]);

  useEffect(() => {
    if (!loaded) return;
    persistLocalCache(banks, cards);
  }, [loaded, banks, cards, persistLocalCache]);

  const addBank = async (bank) => {
    const temDebito = bank.tipoConta === 'debito' || bank.tipoConta === 'ambos';
    const novo = {
      id: `bank_${Date.now()}`,
      ...bank,
      tipoConta: bank.tipoConta || 'ambos',
      saldo: temDebito ? (Number(bank.saldo) || 0) : 0,
      bandeira: bank.bandeira || 'visa',
    };

    if (!user?.id) {
      setBanks((prev) => [...prev, novo]);
      return novo.id;
    }

    const { data, error } = await supabase
      .from('user_banks')
      .insert(bankToRow(user.id, novo))
      .select('*')
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        setBanks((prev) => [...prev, novo]);
        return novo.id;
      }
      showDbError(error, 'cadastrar banco');
      return null;
    }

    const saved = toBank(data);
    setBanks((prev) => [...prev, saved]);
    return saved.id;
  };

  const updateBank = async (id, data) => {
    let updated = null;
    setBanks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const temDebito = (data.tipoConta || b.tipoConta) === 'debito' || (data.tipoConta || b.tipoConta) === 'ambos';
        const saldo = temDebito ? (data.saldo != null ? Number(data.saldo) : b.saldo) : 0;
        updated = {
          ...b,
          ...data,
          tipoConta: data.tipoConta ?? b.tipoConta ?? 'ambos',
          saldo,
          bandeira: data.bandeira ?? b.bandeira ?? 'visa',
        };
        return updated;
      })
    );

    if (!user?.id || !updated) return;

    const { error } = await supabase
      .from('user_banks')
      .update(bankToRow(user.id, updated))
      .eq('id', id)
      .eq('user_id', user.id);

    if (error && !isMissingTableError(error)) showDbError(error, 'atualizar banco');
  };

  const removeBank = async (id) => {
    setBanks((prev) => prev.filter((b) => b.id !== id));
    setCards((prev) => prev.filter((c) => c.bankId !== id));

    if (!user?.id) return;

    await supabase.from('user_cards').delete().eq('bank_id', id).eq('user_id', user.id);
    const { error } = await supabase.from('user_banks').delete().eq('id', id).eq('user_id', user.id);
    if (error && !isMissingTableError(error)) showDbError(error, 'excluir banco');
  };

  const addCard = async (card) => {
    const novo = {
      id: `card_${Date.now()}`,
      bankId: card.bankId || null,
      name: card.name || '',
      diaFechamento: Number(card.diaFechamento) || 10,
      diaVencimento: Number(card.diaVencimento) || 15,
      saldo: Number(card.saldo) || 0,
      bandeira: card.bandeira || 'visa',
    };

    if (!user?.id) {
      setCards((prev) => [...prev, novo]);
      return novo.id;
    }

    const { data, error } = await supabase
      .from('user_cards')
      .insert(cardToRow(user.id, novo))
      .select('*')
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        setCards((prev) => [...prev, novo]);
        return novo.id;
      }
      showDbError(error, 'cadastrar cartão');
      return null;
    }

    const saved = toCard(data);
    setCards((prev) => [...prev, saved]);
    return saved.id;
  };

  const updateCard = async (id, data) => {
    let updated = null;
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        updated = {
          ...c,
          ...data,
          diaFechamento: data.diaFechamento != null ? Number(data.diaFechamento) : c.diaFechamento,
          diaVencimento: data.diaVencimento != null ? Number(data.diaVencimento) : c.diaVencimento,
          saldo: data.saldo != null ? Number(data.saldo) : c.saldo,
          bandeira: data.bandeira != null ? data.bandeira : c.bandeira,
        };
        return updated;
      })
    );

    if (!user?.id || !updated) return;

    const { error } = await supabase
      .from('user_cards')
      .update(cardToRow(user.id, updated))
      .eq('id', id)
      .eq('user_id', user.id);

    if (error && !isMissingTableError(error)) showDbError(error, 'atualizar cartão');
  };

  const deductFromBank = (bankId, amount) => {
    const amt = Math.max(0, Number(amount) || 0);
    if (amt <= 0) return;
    setBanks((prev) => {
      const next = prev.map((b) => (b.id === bankId ? { ...b, saldo: Math.max(0, (b.saldo || 0) - amt) } : b));
      const updated = next.find((b) => b.id === bankId);
      if (user?.id && updated) {
        supabase
          .from('user_banks')
          .update({ saldo: updated.saldo })
          .eq('id', bankId)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error && !isMissingTableError(error)) console.warn('[Banks] saldo débito:', error.message);
          });
      }
      return next;
    });
  };

  const addToBank = (bankId, amount) => {
    const amt = Math.max(0, Number(amount) || 0);
    if (amt <= 0) return;
    setBanks((prev) => {
      const next = prev.map((b) => (b.id === bankId ? { ...b, saldo: (b.saldo || 0) + amt } : b));
      const updated = next.find((b) => b.id === bankId);
      if (user?.id && updated) {
        supabase
          .from('user_banks')
          .update({ saldo: updated.saldo })
          .eq('id', bankId)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error && !isMissingTableError(error)) console.warn('[Banks] saldo débito:', error.message);
          });
      }
      return next;
    });
  };

  const addToCardBalance = (cardId, amount) => {
    const amt = Math.max(0, Number(amount) || 0);
    if (amt <= 0) return;
    setCards((prev) => {
      const next = prev.map((c) => (c.id === cardId ? { ...c, saldo: (c.saldo || 0) + amt } : c));
      const updated = next.find((c) => c.id === cardId);
      if (user?.id && updated) {
        supabase
          .from('user_cards')
          .update({ saldo: updated.saldo })
          .eq('id', cardId)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error && !isMissingTableError(error)) console.warn('[Banks] saldo cartão:', error.message);
          });
      }
      return next;
    });
  };

  const deductFromCardBalance = (cardId, amount) => {
    const amt = Math.max(0, Number(amount) || 0);
    if (amt <= 0) return;
    setCards((prev) => {
      const next = prev.map((c) => (c.id === cardId ? { ...c, saldo: Math.max(0, (c.saldo || 0) - amt) } : c));
      const updated = next.find((c) => c.id === cardId);
      if (user?.id && updated) {
        supabase
          .from('user_cards')
          .update({ saldo: updated.saldo })
          .eq('id', cardId)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error && !isMissingTableError(error)) console.warn('[Banks] saldo cartão:', error.message);
          });
      }
      return next;
    });
  };

  const removeCard = async (id) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    if (!user?.id) return;
    const { error } = await supabase.from('user_cards').delete().eq('id', id).eq('user_id', user.id);
    if (error && !isMissingTableError(error)) showDbError(error, 'excluir cartão');
  };

  const getBankById = (id) => banks.find((b) => b.id === id);
  const getCardsByBankId = (bankId) => cards.filter((c) => c.bankId === bankId);
  const getBankName = (bank) => {
    if (!bank) return '';
    const base = BANCOS_BRASIL.find((b) => b.id === bank.bancoId);
    return bank.nomeCustom || (base?.nome ?? (bank.bancoId || 'Banco'));
  };

  return (
    <BanksContext.Provider
      value={{
        banks,
        cards,
        banksHydrated: loaded,
        addBank,
        updateBank,
        removeBank,
        addCard,
        updateCard,
        removeCard,
        getBankById,
        getCardsByBankId,
        getBankName,
        deductFromBank,
        addToBank,
        addToCardBalance,
        deductFromCardBalance,
      }}
    >
      {children}
    </BanksContext.Provider>
  );
}

export function useBanks() {
  const ctx = useContext(BanksContext);
  if (!ctx) throw new Error('useBanks fora do BanksProvider');
  return ctx;
}
