import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const STORAGE_BASE = '@tudocerto_banks';

export const BANCOS_BRASIL = [
  { id: 'nubank', nome: 'Nubank' },
  { id: 'itau', nome: 'Itaú' },
  { id: 'bradesco', nome: 'Bradesco' },
  { id: 'santander', nome: 'Santander' },
  { id: 'caixa', nome: 'Caixa Econômica Federal' },
  { id: 'bb', nome: 'Banco do Brasil' },
  { id: 'inter', nome: 'Banco Inter' },
  { id: 'c6', nome: 'C6 Bank' },
  { id: 'btg', nome: 'BTG Pactual' },
  { id: 'xp', nome: 'XP Investimentos' },
  { id: 'safra', nome: 'Safra' },
  { id: 'citi', nome: 'Citi' },
  { id: 'sicoob', nome: 'Sicoob' },
  { id: 'sicredi', nome: 'Sicredi' },
  { id: 'pan', nome: 'Banco Pan' },
  { id: 'neon', nome: 'Neon' },
  { id: 'picpay', nome: 'PicPay' },
  { id: 'mercadopago', nome: 'Mercado Pago' },
  { id: 'original', nome: 'Banco Original' },
  { id: 'daycoval', nome: 'Daycoval' },
  { id: 'sofisa', nome: 'Sofisa' },
  { id: 'bmg', nome: 'BMG' },
  { id: 'pagseguro', nome: 'PagSeguro' },
  { id: 'next', nome: 'Next' },
  { id: 'will', nome: 'Will Bank' },
  { id: 'santander_empresas', nome: 'Santander Empresas' },
  { id: 'itau_empresas', nome: 'Itaú Empresas' },
  { id: 'bb_empresas', nome: 'Banco do Brasil Empresas' },
  { id: 'bradesco_empresas', nome: 'Bradesco Empresas' },
  { id: 'caixa_empresas', nome: 'Caixa Empresas' },
  { id: 'outro', nome: 'Outro' },
];

const BanksContext = createContext(undefined);

export function BanksProvider({ children }) {
  const { user } = useAuth();
  const [banks, setBanks] = useState([]);
  const [cards, setCards] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const storageKey = `${STORAGE_BASE}_${user?.id || 'guest'}`;

  useEffect(() => {
    setLoaded(false);
    setBanks([]);
    setCards([]);
    (async () => {
      try {
        let raw = await AsyncStorage.getItem(storageKey);
        if (!raw && user?.id) {
          const guestRaw = await AsyncStorage.getItem(`${STORAGE_BASE}_guest`);
          if (guestRaw) {
            const { banks: b, cards: c } = JSON.parse(guestRaw);
            if ((Array.isArray(b) && b.length > 0) || (Array.isArray(c) && c.length > 0)) {
              raw = guestRaw;
              await AsyncStorage.setItem(storageKey, guestRaw);
            }
          }
        }
        if (raw) {
          const { banks: b, cards: c } = JSON.parse(raw);
          setBanks(Array.isArray(b) ? b : []);
          setCards(Array.isArray(c) ? c : []);
        }
      } catch (_) {}
      setLoaded(true);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(storageKey, JSON.stringify({ banks, cards }));
  }, [loaded, banks, cards, storageKey]);

  const addBank = (bank) => {
    const id = `bank_${Date.now()}`;
    const temDebito = bank.tipoConta === 'debito' || bank.tipoConta === 'ambos';
    const novo = { id, ...bank, tipoConta: bank.tipoConta || 'ambos', saldo: temDebito ? (Number(bank.saldo) || 0) : 0, bandeira: bank.bandeira || 'visa' };
    setBanks((prev) => [...prev, novo]);
    return id;
  };

  const updateBank = (id, data) => {
    setBanks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const temDebito = (data.tipoConta || b.tipoConta) === 'debito' || (data.tipoConta || b.tipoConta) === 'ambos';
        const saldo = temDebito ? (data.saldo != null ? Number(data.saldo) : b.saldo) : 0;
        return { ...b, ...data, tipoConta: data.tipoConta ?? b.tipoConta ?? 'ambos', saldo, bandeira: data.bandeira ?? b.bandeira ?? 'visa' };
      })
    );
  };

  const removeBank = (id) => {
    setBanks((prev) => prev.filter((b) => b.id !== id));
    setCards((prev) => prev.filter((c) => c.bankId !== id));
  };

  const addCard = (card) => {
    const id = `card_${Date.now()}`;
    const novo = {
      id,
      bankId: card.bankId || null,
      name: card.name || '',
      diaFechamento: Number(card.diaFechamento) || 10,
      diaVencimento: Number(card.diaVencimento) || 15,
      saldo: Number(card.saldo) || 0,
      bandeira: card.bandeira || 'visa',
    };
    setCards((prev) => [...prev, novo]);
    return id;
  };

  const updateCard = (id, data) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              ...data,
              diaFechamento: data.diaFechamento != null ? Number(data.diaFechamento) : c.diaFechamento,
              diaVencimento: data.diaVencimento != null ? Number(data.diaVencimento) : c.diaVencimento,
              saldo: data.saldo != null ? Number(data.saldo) : c.saldo,
              bandeira: data.bandeira != null ? data.bandeira : c.bandeira,
            }
          : c
      )
    );
  };

  const deductFromBank = (bankId, amount) => {
    const amt = Math.max(0, Number(amount) || 0);
    if (amt <= 0) return;
    setBanks((prev) =>
      prev.map((b) => (b.id === bankId ? { ...b, saldo: Math.max(0, (b.saldo || 0) - amt) } : b))
    );
  };

  const addToBank = (bankId, amount) => {
    const amt = Math.max(0, Number(amount) || 0);
    if (amt <= 0) return;
    setBanks((prev) =>
      prev.map((b) => (b.id === bankId ? { ...b, saldo: (b.saldo || 0) + amt } : b))
    );
  };

  const addToCardBalance = (cardId, amount) => {
    const amt = Math.max(0, Number(amount) || 0);
    if (amt <= 0) return;
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, saldo: (c.saldo || 0) + amt } : c))
    );
  };

  const removeCard = (id) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
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
