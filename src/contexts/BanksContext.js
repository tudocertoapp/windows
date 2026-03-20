import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  const deductFromCardBalance = (cardId, amount) => {
    const amt = Math.max(0, Number(amount) || 0);
    if (amt <= 0) return;
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, saldo: Math.max(0, (c.saldo || 0) - amt) } : c))
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
