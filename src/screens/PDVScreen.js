import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Alert,
  Platform,
  useWindowDimensions,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useFinance } from '../contexts/FinanceContext';
import { useProfile } from '../contexts/ProfileContext';
import { useBanks } from '../contexts/BanksContext';
import { GlassCard } from '../components/GlassCard';
import { ReceiptPrintWeb } from '../components/ReceiptPrintWeb';
import { formatCurrency, parseMoney } from '../utils/format';
import {
  playTapSound,
  playPdvOpenSound,
  playPdvAddItemSound,
  playPdvEditItemSound,
  playPdvRemoveItemSound,
} from '../utils/sounds';
import { MoneyInput } from '../components/MoneyInput';
import { useLanguage } from '../contexts/LanguageContext';
import { AUTH_LOGO_SOURCE } from '../shared/authUi';
import { DEFAULT_PDV_CONFIG, readPdvConfig, writePdvConfig } from '../utils/pdvConfig';

const PDV_SALE_KEY = '@tudocerto_pdv_ultima_venda';
const PDV_TOP_ITEMS_KEY = '@tudocerto_pdv_top_itens_v1';

const FORMAS_PAG = [
  { id: 'pix', label: 'PIX', icon: 'phone-portrait-outline' },
  { id: 'dinheiro', label: 'Dinheiro', icon: 'wallet-outline' },
  { id: 'credito', label: 'Crédito', icon: 'card', temParcelas: true },
  { id: 'debito', label: 'Débito', icon: 'card-outline' },
];

const TABS = [
  { id: 'produtos', label: 'PRODUTOS E SERVIÇOS', icon: 'cube-outline' },
  { id: 'cliente', label: 'CLIENTE', icon: 'person-outline' },
  { id: 'finalizacao', label: 'PAGAMENTO', icon: 'card-outline' },
];

function stripAccents(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeLoginText(v) {
  return stripAccents(String(v || ''))
    .normalize('NFKC')
    .trim()
    .toLowerCase();
}

function normalizeSecret(v) {
  return String(v || '').normalize('NFKC').trim();
}

function readOperatorId(c) {
  const data = c?.data || c;
  return String(
    data?.operadorCaixaId
    ?? data?.operador_caixa_id
    ?? data?.operadorId
    ?? data?.operatorId
    ?? data?.login
    ?? data?.codigo
    ?? '',
  ).trim();
}

function readOperatorPass(c) {
  const data = c?.data || c;
  return String(
    data?.operadorCaixaSenha
    ?? data?.operador_caixa_senha
    ?? data?.operadorSenha
    ?? data?.operatorPassword
    ?? data?.password
    ?? data?.senha
    ?? '',
  ).trim();
}

function isOperatorEnabled(c) {
  const data = c?.data || c;
  const raw = data?.operadorCaixaAtivo ?? data?.operador_caixa_ativo;
  if (raw === undefined || raw === null || raw === '') {
    return !!readOperatorId(c) && !!readOperatorPass(c);
  }
  return raw === true || raw === 'true' || raw === 1 || raw === '1';
}

/** Alinha ao MoneyInput / idioma (milhar e decimal do perfil de idioma). */
function amountToLocalizedInputString(n, lang) {
  const num = Number(n) || 0;
  const dec = lang?.decimalSep ?? ',';
  const th = lang?.thousandsSep ?? '.';
  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);
  let intStr = String(intPart);
  if (th && th !== dec) intStr = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, th);
  return `${intStr}${dec}${String(decPart).padStart(2, '0')}`;
}

const LAYOUT_BREAKPOINT = 960;

export function PDVScreen({ onClose, lockedMode = false }) {
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const layoutW = windowWidth > 0 ? windowWidth : Dimensions.get('window').width;
  const narrowLayout = layoutW < LAYOUT_BREAKPOINT;
  const currencySym = lang?.currency || 'R$';
  const { products, services, clients, collaborators, addTransaction, loading } = useFinance();
  const { profile } = useProfile();
  const { banks, addToBank } = useBanks();
  const [activeTab, setActiveTab] = useState('produtos');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedQty, setSelectedQty] = useState('1');
  const [selectedPrice, setSelectedPrice] = useState('');
  const [selectedDesconto, setSelectedDesconto] = useState('0,00');
  const [cliente, setCliente] = useState(null);
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteSuggest, setShowClienteSuggest] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentForma, setPaymentForma] = useState('pix');
  const [paymentValor, setPaymentValor] = useState('');
  const [paymentValorTouched, setPaymentValorTouched] = useState(false);
  const [paymentParcelas, setPaymentParcelas] = useState(1);
  const [desconto, setDesconto] = useState('');
  const [saleNumber, setSaleNumber] = useState(1);
  const [completedSale, setCompletedSale] = useState(null);
  const [cancelAuthOpen, setCancelAuthOpen] = useState(false);
  const [cancelActionType, setCancelActionType] = useState(null);
  const [cancelOperatorLogin, setCancelOperatorLogin] = useState('');
  const [cancelOperatorPass, setCancelOperatorPass] = useState('');
  const [selectedCartIndex, setSelectedCartIndex] = useState(null);
  const [showPaymentAdd, setShowPaymentAdd] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTopItemsOnly, setShowTopItemsOnly] = useState(false);
  const [topSalesByItem, setTopSalesByItem] = useState({});
  const [showProductSuggest, setShowProductSuggest] = useState(false);
  const [operatorId, setOperatorId] = useState('');
  const [operatorNameQuery, setOperatorNameQuery] = useState('');
  const [showOperatorSuggest, setShowOperatorSuggest] = useState(false);
  const [showAllOperators, setShowAllOperators] = useState(false);
  const [selectedOperatorId, setSelectedOperatorId] = useState(null);
  const [operatorPass, setOperatorPass] = useState('');
  const [operatorLogged, setOperatorLogged] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [operatorCheckReady, setOperatorCheckReady] = useState(false);
  const [loginDebug, setLoginDebug] = useState(null);
  const [showPdvConfigModal, setShowPdvConfigModal] = useState(false);
  const [pdvConfig, setPdvConfig] = useState(DEFAULT_PDV_CONFIG);
  const searchRef = useRef(null);

  const isWeb = Platform.OS === 'web';

  const allItems = useMemo(() => {
    const prods = (products || []).map((p) => ({ ...p, _tipo: 'produto' }));
    const servs = (services || []).map((s) => ({ ...s, _tipo: 'servico' }));
    return [...prods, ...servs];
  }, [products, services]);

  const activeOperators = useMemo(
    () => (collaborators || []).map((c) => {
      const data = c?.data || c;
      return {
        ...c,
        id: c?.id ?? data?.id,
        nome: c?.nome || data?.nome || data?.name || '',
      };
    }).filter((c) => {
      const hasCredentials = !!readOperatorId(c) && !!readOperatorPass(c);
      return hasCredentials && isOperatorEnabled(c);
    }),
    [collaborators],
  );

  const operatorSuggestions = useMemo(() => {
    const q = stripAccents(operatorNameQuery).toLowerCase().trim();
    if (!q) return activeOperators.slice(0, 8);
    return activeOperators
      .filter((c) => {
        const nome = stripAccents(c.nome || '').toLowerCase();
        const id = stripAccents(readOperatorId(c) || '').toLowerCase();
        return nome.includes(q) || id.includes(q);
      })
      .slice(0, 8);
  }, [operatorNameQuery, activeOperators]);
  const hasAnyOperatorCredentials = useMemo(
    () => (collaborators || []).some((c) => !!readOperatorId(c) && !!readOperatorPass(c)),
    [collaborators],
  );
  const mustRequireOperatorLogin = pdvConfig.requireOperatorLogin || hasAnyOperatorCredentials;

  const filteredItems = useMemo(() => {
    if (!search.trim()) return [];
    const q = stripAccents(search).toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    const matches = allItems.filter((i) => {
      const name = stripAccents(i.name || '').toLowerCase();
      const code = stripAccents(i.code || '').toLowerCase();
      const barcode = String(i.barcode || '').replace(/\D/g, '');
      return name.includes(q) || code.includes(q) || (qDigits.length > 0 && barcode.includes(qDigits));
    });
    if (!showTopItemsOnly) return matches;
    const withScore = matches.map((item, index) => ({
      item,
      index,
      sold: Number(topSalesByItem[`${item._tipo}:${item.id}`] || 0),
    }));
    withScore.sort((a, b) => {
      if (b.sold !== a.sold) return b.sold - a.sold;
      return a.index - b.index;
    });
    return withScore.map((entry) => entry.item);
  }, [allItems, search, showTopItemsOnly, topSalesByItem]);

  const productSuggestions = useMemo(() => {
    const q = stripAccents(search).toLowerCase().trim();
    if (!q) return [];
    return filteredItems.slice(0, 8);
  }, [filteredItems, search]);
  const shouldShowGridResults = !showProductSuggest && !selectedItem;

  const clienteSuggestions = useMemo(() => {
    if (!clienteSearch.trim()) return clients || [];
    const q = stripAccents(clienteSearch).toLowerCase();
    return (clients || []).filter((c) => stripAccents(c.name || '').toLowerCase().includes(q));
  }, [clients, clienteSearch]);

  const subtotal = useMemo(() => cart.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0), [cart]);
  const descontoNum = useMemo(() => parseMoney(String(desconto)) || 0, [desconto]);
  const total = Math.max(0, subtotal - descontoNum);
  const pago = useMemo(() => payments.reduce((s, p) => s + (p.valor || 0), 0), [payments]);
  const restante = Math.max(0, total - pago);
  const troco = Math.max(0, pago - total);
  const totalItens = useMemo(() => cart.reduce((s, i) => s + (i.qty || 1), 0), [cart]);
  const suggestedPaymentValue = useMemo(
    () => amountToLocalizedInputString(restante > 0 ? restante : 0, lang),
    [restante, lang]
  );

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PDV_TOP_ITEMS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') setTopSalesByItem(parsed);
        }
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PDV_SALE_KEY);
        if (raw) setSaleNumber(parseInt(raw, 10) || 1);
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const cfg = await readPdvConfig(profile);
      setPdvConfig(cfg);
    })();
  }, [profile?.email]);

  const savePdvConfig = useCallback((next) => {
    setPdvConfig(next);
    writePdvConfig(profile, next).catch(() => {});
  }, [profile]);

  const selectItem = useCallback(
    (item) => {
      playPdvEditItemSound();
      setSelectedItem(item);
      setSelectedQty('1');
      setSelectedPrice(amountToLocalizedInputString(item.price || 0, lang));
      const z = lang?.decimalSep === '.' ? '0.00' : '0,00';
      setSelectedDesconto(z);
      setSearch(item.name || '');
      setShowProductSuggest(false);
    },
    [lang],
  );

  const confirmAddItem = useCallback(() => {
    if (!selectedItem) return;
    const qty = Math.max(1, parseInt(selectedQty, 10) || 1);
    const price = parseMoney(String(selectedPrice)) || selectedItem.price || 0;
    const desc = parseMoney(String(selectedDesconto)) || 0;
    const precoFinal = Math.max(0, price - desc);
    if (precoFinal <= 0) return;
    playPdvAddItemSound();
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.id === selectedItem.id && c._tipo === selectedItem._tipo);
      const itemToAdd = { ...selectedItem, price: precoFinal, qty };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: (next[idx].qty || 1) + qty, price: precoFinal };
        return next;
      }
      return [...prev, itemToAdd];
    });
    setSelectedItem(null);
    setSelectedQty('1');
    setSelectedPrice('');
    setSelectedDesconto(lang?.decimalSep === '.' ? '0.00' : '0,00');
  }, [selectedItem, selectedQty, selectedPrice, selectedDesconto, lang]);

  const clearCurrentSale = useCallback(() => {
    setCart([]);
    setCliente(null);
    setPayments([]);
    setDesconto('');
    setSelectedItem(null);
    setSelectedQty('1');
    setSelectedPrice('');
    setSelectedDesconto(lang?.decimalSep === '.' ? '0.00' : '0,00');
    setSelectedCartIndex(null);
    setPaymentValor('');
    setPaymentValorTouched(false);
    setPaymentParcelas(1);
    setShowPaymentAdd(false);
    setSearch('');
    setShowProductSuggest(false);
    setActiveTab('produtos');
  }, [lang]);

  const addToCartQuick = useCallback((item) => {
    playTapSound();
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.id === item.id && c._tipo === item._tipo);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: (next[idx].qty || 1) + 1 };
        return next;
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const updateCartQty = useCallback((index, delta) => {
    setCart((prev) => {
      const next = [...prev];
      const cur = (next[index].qty || 1) + delta;
      if (cur <= 0) return prev.filter((_, i) => i !== index);
      next[index] = { ...next[index], qty: cur };
      return next;
    });
  }, []);

  const removeFromCart = useCallback((index) => {
    playPdvRemoveItemSound();
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addPayment = useCallback(() => {
    const val = parseMoney(String(paymentValor)) || 0;
    if (val <= 0) return;
    playTapSound();
    const parcelas = paymentForma === 'credito' ? Math.max(1, parseInt(paymentParcelas, 10) || 1) : 1;
    setPayments((prev) => [
      ...prev,
      { forma: FORMAS_PAG.find((f) => f.id === paymentForma)?.label || paymentForma, valor: val, parcelas },
    ]);
    setPaymentValor('');
    setPaymentValorTouched(false);
    setPaymentParcelas(1);
    setShowPaymentAdd(false);
  }, [paymentForma, paymentValor, paymentParcelas]);

  const removePayment = useCallback((index) => {
    playTapSound();
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleConfirmSale = useCallback(async () => {
    if (cart.length === 0) {
      Alert.alert('Carrinho vazio', 'Adicione itens ao carrinho.');
      return;
    }
    if (pago < total - 0.01) {
      Alert.alert('Pagamento incompleto', `Falta ${formatCurrency(restante)}.`);
      return;
    }
    playTapSound();

    const numero = String(saleNumber).padStart(4, '0');
    const sale = {
      numero,
      items: cart.map((i) => ({ id: i.id, name: i.name, code: i.code, price: i.price, qty: i.qty || 1 })),
      cliente: cliente ? { name: cliente.name, cpf: cliente.cpf } : null,
      subtotal,
      desconto: descontoNum,
      total,
      pago,
      troco,
      payments: payments.map((p) => ({ forma: p.forma, valor: p.valor, parcelas: p.parcelas || 1 })),
    };

    try {
      await addTransaction({
        type: 'receita',
        amount: total,
        description: `Venda PDV #${numero} - Operador: ${operatorLogged?.nome || profile?.nome || 'Operador'}`,
        category: 'Venda PDV',
        date: new Date().toISOString().slice(0, 10),
        formaPagamento: payments.map((p) => `${p.forma}: ${formatCurrency(p.valor)}`).join(', '),
        tipoVenda: 'avista',
        desconto: descontoNum,
      });

      const firstBank = banks?.find((b) => (b.tipoConta === 'debito' || b.tipoConta === 'ambos') && b.saldo !== undefined);
      if (firstBank?.id) addToBank(firstBank.id, total);

      await AsyncStorage.setItem(PDV_SALE_KEY, String(saleNumber + 1));
      const nextTop = { ...topSalesByItem };
      for (const it of cart) {
        const key = `${it._tipo}:${it.id}`;
        nextTop[key] = (Number(nextTop[key]) || 0) + (Number(it.qty) || 1);
      }
      setTopSalesByItem(nextTop);
      await AsyncStorage.setItem(PDV_TOP_ITEMS_KEY, JSON.stringify(nextTop));
      setSaleNumber((n) => n + 1);
      setCompletedSale(sale);
      setCart([]);
      setCliente(null);
      setPayments([]);
      setDesconto('');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível finalizar a venda.');
    }
  }, [cart, cliente, subtotal, descontoNum, total, pago, payments, saleNumber, addTransaction, banks, addToBank, topSalesByItem, operatorLogged?.nome, profile?.nome]);

  const handlePrint = useCallback(() => {
    if (typeof window !== 'undefined' && window.print) {
      playTapSound();
      window.print();
    }
  }, []);

  const handleNovaVenda = useCallback(() => {
    playTapSound();
    setCompletedSale(null);
    clearCurrentSale();
  }, [clearCurrentSale]);

  const handleCancel = useCallback(() => {
    if (!pdvConfig.requireFrontDeskAuth) {
      clearCurrentSale();
      onClose?.();
      return;
    }
    setCancelActionType('fechar');
    setCancelOperatorLogin('');
    setCancelOperatorPass('');
    setCancelAuthOpen(true);
  }, [pdvConfig.requireFrontDeskAuth, clearCurrentSale, onClose]);

  useEffect(() => {
    if (!showPaymentAdd) return;
    if (!paymentValorTouched) {
      setPaymentValor(suggestedPaymentValue);
    }
  }, [showPaymentAdd, paymentValorTouched, suggestedPaymentValue]);

  const confirmOperatorAccess = useCallback(() => {
    const id = normalizeLoginText(operatorId);
    const name = normalizeLoginText(operatorNameQuery);
    const loginInput = (id || name).trim();
    const pass = normalizeSecret(operatorPass);
    if (!pass) {
      Alert.alert('Atenção', 'Informe operador e senha de caixa.');
      return;
    }
    const loginNorm = stripAccents(loginInput).toLowerCase();

    let operator = null;
    if (selectedOperatorId) {
      operator = activeOperators.find((c) => String(c.id) === String(selectedOperatorId)) || null;
    }

    if (!operator && loginNorm) {
      operator = activeOperators.find((c) => {
        const opId = normalizeLoginText(readOperatorId(c));
        const opName = normalizeLoginText(c.nome || '');
        return opId === loginNorm || opName === loginNorm;
      }) || null;
    }

    if (!operator && loginNorm) {
      const partial = activeOperators.filter((c) => {
        const opId = normalizeLoginText(readOperatorId(c));
        const opName = normalizeLoginText(c.nome || '');
        return opId.includes(loginNorm) || opName.includes(loginNorm);
      });
      if (partial.length === 1) [operator] = partial;
    }

    if (!operator && activeOperators.length === 1 && !loginNorm) {
      [operator] = activeOperators;
    }

    const debugPayload = {
      operadoresAtivos: activeOperators.length,
      idsAtivos: activeOperators.map((c) => readOperatorId(c)).filter(Boolean).slice(0, 8),
      loginDigitado: loginInput || '(vazio)',
      operadorSelecionadoId: selectedOperatorId ? String(selectedOperatorId) : '(nenhum)',
      operadorEncontrado: operator ? (operator.nome || readOperatorId(operator) || 'sim') : '(não)',
      senhaDigitada: pass ? 'sim' : 'não',
      senhaCadastrada: operator ? (normalizeSecret(readOperatorPass(operator)) ? 'sim' : 'não') : '(n/a)',
    };
    setLoginDebug(debugPayload);

    if (!operator) {
      Alert.alert('Acesso negado', 'Operador não encontrado. Digite o nome/ID correto ou selecione na lista.');
      return;
    }

    const storedPass = normalizeSecret(readOperatorPass(operator));
    if (!storedPass) {
      Alert.alert(
        'Acesso negado',
        `Operador "${operator.nome || readOperatorId(operator)}" está sem senha de caixa cadastrada em Colaboradores.`,
      );
      return;
    }
    if (storedPass !== pass) {
      Alert.alert('Acesso negado', `Senha incorreta para o operador "${operator.nome || readOperatorId(operator)}".`);
      return;
    }
    playPdvOpenSound();
    setOperatorLogged({ id: operator.id, nome: operator.nome || 'Operador', operadorId: String(readOperatorId(operator) || id || '') });
    setAuthOpen(false);
    setLoginDebug(null);
  }, [activeOperators, operatorId, operatorNameQuery, operatorPass, selectedOperatorId]);

  const authorizeByOperatorCredentials = useCallback((loginText, passText) => {
    const loginNorm = normalizeLoginText(loginText);
    const passNorm = normalizeSecret(passText);
    if (!loginNorm || !passNorm) return null;
    return (
      activeOperators.find((c) => {
        const opId = normalizeLoginText(readOperatorId(c));
        const opName = normalizeLoginText(c.nome || '');
        const opPass = normalizeSecret(readOperatorPass(c));
        const loginOk = opId === loginNorm || opName === loginNorm;
        return loginOk && opPass === passNorm;
      }) || null
    );
  }, [activeOperators]);

  const executeProtectedAction = useCallback((actionType) => {
    if (actionType === 'item') {
      const idx = selectedCartIndex;
      if (idx == null || !cart[idx]) {
        Alert.alert('Selecione um item', 'Item não encontrado para cancelamento.');
        return false;
      }
      removeFromCart(idx);
      setSelectedCartIndex(null);
      return true;
    }
    if (actionType === 'pedido') {
      clearCurrentSale();
      return true;
    }
    if (actionType === 'fechar') {
      clearCurrentSale();
      onClose?.();
      return true;
    }
    return false;
  }, [selectedCartIndex, cart, removeFromCart, clearCurrentSale, onClose]);

  const requestCancelAction = useCallback((actionType) => {
    if (actionType === 'item') {
      if (cart.length === 0) {
        Alert.alert('Carrinho vazio', 'Não há item para cancelar.');
        return;
      }
      if (selectedCartIndex == null || !cart[selectedCartIndex]) {
        Alert.alert('Selecione um item', 'Toque em um item do carrinho para cancelar.');
        return;
      }
    }
    if (actionType === 'pedido' && cart.length === 0) {
      Alert.alert('Carrinho vazio', 'Não há pedido em andamento para cancelar.');
      return;
    }
    if (!pdvConfig.requireFrontDeskAuth) {
      executeProtectedAction(actionType);
      return;
    }
    setCancelActionType(actionType);
    setCancelOperatorLogin('');
    setCancelOperatorPass('');
    setCancelAuthOpen(true);
  }, [cart, selectedCartIndex, pdvConfig.requireFrontDeskAuth, executeProtectedAction]);

  const confirmCancelByOperator = useCallback(() => {
    const operator = authorizeByOperatorCredentials(cancelOperatorLogin, cancelOperatorPass);
    if (!operator) {
      Alert.alert('Acesso negado', 'Login ou senha do operador inválidos.');
      return;
    }
    playTapSound();
    if (!executeProtectedAction(cancelActionType)) return;
    setCancelAuthOpen(false);
    setCancelActionType(null);
    setCancelOperatorLogin('');
    setCancelOperatorPass('');
  }, [
    authorizeByOperatorCredentials,
    cancelOperatorLogin,
    cancelOperatorPass,
    cancelActionType,
    executeProtectedAction,
  ]);

  useEffect(() => {
    if (loading) return;
    setOperatorCheckReady(true);
    if (mustRequireOperatorLogin) {
      setOperatorLogged(null);
      setAuthOpen(true);
      return;
    }
    setAuthOpen(false);
    if (!operatorLogged) {
      setOperatorLogged({ id: 'local', nome: profile?.nome || 'Vendedor', operadorId: '' });
    }
  }, [loading, mustRequireOperatorLogin, operatorLogged, profile?.nome]);

  useEffect(() => {
    if (!isWeb) return;
    const onKey = (e) => {
      const hasModifier = !!(e.ctrlKey || e.shiftKey || e.altKey || e.metaKey);
      if (!hasModifier && e.key === 'F1') { e.preventDefault(); setActiveTab('produtos'); setTimeout(() => searchRef.current?.focus?.(), 50); return; }
      if (!hasModifier && e.key === 'F2') { e.preventDefault(); if (selectedItem) setSelectedItem(null); return; }
      if (!hasModifier && e.key === 'F3') { e.preventDefault(); setActiveTab('cliente'); return; }
      if (!hasModifier && e.key === 'F4') { e.preventDefault(); setActiveTab('finalizacao'); return; }
      if (!hasModifier && e.key === 'F5') { e.preventDefault(); if (cart.length > 0 && pago >= total - 0.01) handleConfirmSale(); return; }
      if (!hasModifier && e.key === 'F6') { e.preventDefault(); if (completedSale) handlePrint(); return; }
      if (!hasModifier && e.key === 'F7') { e.preventDefault(); handleNovaVenda(); return; }
      if (e.key === 'Escape') { e.preventDefault(); setSelectedItem(null); setShowPaymentAdd(false); return; }
      if (e.key === 'Enter' && selectedItem && activeTab === 'produtos') { e.preventDefault(); confirmAddItem(); return; }
      if (e.ctrlKey && e.key === 'p') { e.preventDefault(); if (completedSale) handlePrint(); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedItem, activeTab, cart, pago, total, completedSale, handleNovaVenda, handleConfirmSale, handlePrint, confirmAddItem]);

  useEffect(() => {
    if (!mustRequireOperatorLogin) return;
    if (!operatorCheckReady) return;
    if (!operatorLogged && !authOpen) {
      setAuthOpen(true);
    }
  }, [mustRequireOperatorLogin, operatorCheckReady, operatorLogged, authOpen]);

  if (Platform.OS !== 'web') return null;

  const empresaInfo = { empresa: profile?.empresa, cnpj: profile?.cnpj, endereco: profile?.endereco };
  const dataHora = currentTime.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header — CAIXA LIVRE centralizado e destaque; linha de metadados responsiva */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerStatusWrap}>
          <Ionicons name="cart-outline" size={28} color="#fff" />
          <Text style={styles.headerStatus}>CAIXA LIVRE</Text>
        </View>
        <View style={[styles.headerMetaRow, narrowLayout && styles.headerMetaRowWrap]}>
          <View style={[styles.headerLeft, narrowLayout && styles.headerLeftWrap]}>
            <Text style={styles.headerLabel}>Cliente: </Text>
            <Text style={styles.headerValue} numberOfLines={1}>{cliente?.name || 'Consumidor final'}</Text>
            <Text style={[styles.headerSeparator, { opacity: 0.7 }]}> | </Text>
            <Text style={styles.headerLabel}>Vendedor: </Text>
            <Text style={styles.headerValue} numberOfLines={1}>{operatorLogged?.nome || profile?.nome || 'Operador'}</Text>
          </View>
          <View style={[styles.headerRight, narrowLayout && styles.headerRightWrap]}>
            <TouchableOpacity style={styles.headerBtn} onPress={handleNovaVenda}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.headerBtnText}>Nova venda (F7)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={() => setShowPdvConfigModal(true)}>
              <Ionicons name="settings-outline" size={18} color="#fff" />
              <Text style={styles.headerBtnText}>Config. PDV</Text>
            </TouchableOpacity>
            {completedSale && (
              <TouchableOpacity style={styles.headerBtn} onPress={handlePrint}>
                <Ionicons name="print-outline" size={20} color="#fff" />
                <Text style={styles.headerBtnText}>Imprimir</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.headerTime} numberOfLines={1}>{dataHora}</Text>
            <TouchableOpacity style={styles.headerClose} onPress={handleCancel}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main content */}
      <View style={[styles.main, narrowLayout && styles.mainColumn]}>
        {/* Painel esquerdo */}
        <View
          style={[
            styles.leftPanel,
            narrowLayout ? styles.leftPanelNarrow : styles.leftPanelWide,
            { borderRightColor: colors.border, borderBottomColor: colors.border },
          ]}
        >
          <View style={styles.tabs}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tab, activeTab === t.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => { playTapSound(); setActiveTab(t.id); }}
              >
                <Ionicons name={t.icon} size={16} color={activeTab === t.id ? '#fff' : colors.textSecondary} />
                <Text
                  style={[styles.tabLabel, { color: activeTab === t.id ? '#fff' : colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'produtos' && (
            <ScrollView
              style={styles.produtosScroll}
              contentContainerStyle={styles.produtosScrollContent}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  ref={searchRef}
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Busque por um produto..."
                  placeholderTextColor={colors.textSecondary}
                  value={search}
                  onChangeText={(t) => { setSearch(t); setShowProductSuggest(!!String(t || '').trim()); }}
                  onFocus={() => setShowProductSuggest(!!String(search || '').trim())}
                />
              </View>
              {showProductSuggest && productSuggestions.length > 0 ? (
                <View style={[styles.productSuggestWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ScrollView keyboardShouldPersistTaps="handled" style={styles.productSuggestList}>
                    {productSuggestions.map((item) => (
                      <TouchableOpacity
                        key={`sug-${item._tipo}-${item.id}`}
                        style={[styles.productSuggestItem, { borderBottomColor: colors.border }]}
                        onPress={() => selectItem(item)}
                      >
                        <Text style={[styles.productSuggestName, { color: colors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.productSuggestCode, { color: colors.textSecondary }]} numberOfLines={1}>
                          {item.code ? `Cod: ${item.code}` : item._tipo === 'servico' ? 'Serviço' : 'Produto'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
              <View style={styles.productFilterRow}>
                <TouchableOpacity
                  style={[styles.productFilterChip, { borderColor: colors.border, backgroundColor: showTopItemsOnly ? colors.primaryRgba(0.16) : colors.card }]}
                  onPress={() => { playTapSound(); setShowTopItemsOnly((v) => !v); }}
                >
                  <Ionicons name="star-outline" size={16} color={showTopItemsOnly ? colors.primary : colors.textSecondary} />
                  <Text style={{ color: showTopItemsOnly ? colors.primary : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
                    Priorizar mais vendidos
                  </Text>
                </TouchableOpacity>
              </View>
              {!search.trim() ? (
                <View style={[styles.emptySearchState, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Ionicons name="search-outline" size={24} color={colors.textSecondary} />
                  <Text style={[styles.emptySearchText, { color: colors.textSecondary }]}>
                    Digite o nome ou código do produto para buscar.
                  </Text>
                </View>
              ) : null}

              {selectedItem ? (
                <GlassCard colors={colors} solid style={[styles.itemDetailCard, { borderColor: colors.border }]}>
                  <View style={styles.itemDetailHeader}>
                    <View style={[styles.itemDetailThumb, { backgroundColor: colors.border }]}>
                      {selectedItem.photoUri ? (
                        <Image source={{ uri: selectedItem.photoUri }} style={styles.itemDetailImg} resizeMode="cover" />
                      ) : (
                        <Ionicons name={selectedItem._tipo === 'produto' ? 'cube-outline' : 'construct-outline'} size={30} color={colors.textSecondary} />
                      )}
                    </View>
                    <View style={styles.itemDetailTitleWrap}>
                      <Text style={[styles.itemDetailName, { color: colors.text }]} numberOfLines={2}>{selectedItem.name}</Text>
                      <Text style={[styles.itemDetailMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                        {selectedItem.code ? `Cod: ${selectedItem.code}` : selectedItem._tipo === 'servico' ? 'Serviço' : 'Produto'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.itemDetailRow}>
                    <View style={styles.itemDetailFieldCol}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Quantidade</Text>
                      <TextInput
                        style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                        value={selectedQty}
                        onChangeText={setSelectedQty}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.itemDetailFieldCol}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Preço unit.</Text>
                      <MoneyInput
                        value={selectedPrice}
                        onChange={setSelectedPrice}
                        containerStyle={[styles.moneyInputWrap, { backgroundColor: colors.bg }]}
                      />
                    </View>
                    <View style={styles.itemDetailFieldCol}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Desconto</Text>
                      <MoneyInput
                        value={selectedDesconto}
                        onChange={setSelectedDesconto}
                        containerStyle={[styles.moneyInputWrap, { backgroundColor: colors.bg }]}
                      />
                    </View>
                  </View>
                  <View style={styles.itemDetailBtns}>
                    <TouchableOpacity style={[styles.detailBtn, styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setSelectedItem(null)}>
                      <Text style={[styles.cancelBtnText, { color: colors.text }]}>CANCELAR (ESC)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.detailBtn, styles.addBtn, { backgroundColor: colors.primary }]} onPress={confirmAddItem}>
                      <Text style={styles.addBtnText}>ADICIONAR (ENTER)</Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              ) : null}

              {shouldShowGridResults ? (
                <ScrollView
                  style={[styles.itemGrid, narrowLayout && styles.itemGridNarrow]}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  contentContainerStyle={styles.itemGridContent}
                >
                  {filteredItems.map((item) => (
                    <TouchableOpacity
                      key={`${item._tipo}-${item.id}`}
                      style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => selectItem(item)}
                      onLongPress={() => addToCartQuick(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.gridThumb, { backgroundColor: colors.border }]}>
                        {item.photoUri ? (
                          <Image source={{ uri: item.photoUri }} style={styles.gridImg} resizeMode="cover" />
                        ) : (
                          <Ionicons name={item._tipo === 'produto' ? 'cube-outline' : 'construct-outline'} size={28} color={colors.textSecondary} />
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.gridCode, { color: colors.textSecondary }]} numberOfLines={1}>
                          {item.barcode
                            ? `CB: ${item.barcode}`
                            : item.code
                              ? `Cod: ${item.code}`
                              : item._tipo === 'servico'
                                ? 'Serviço'
                                : 'Produto'}
                        </Text>
                        <Text style={[styles.gridPrice, { color: colors.primary }]}>{formatCurrency(item.price || 0)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {search.trim() && filteredItems.length === 0 ? (
                    <View style={[styles.emptySearchState, { borderColor: colors.border, backgroundColor: colors.card }]}>
                      <Ionicons name="alert-circle-outline" size={22} color={colors.textSecondary} />
                      <Text style={[styles.emptySearchText, { color: colors.textSecondary }]}>
                        Nenhum produto ou serviço encontrado para "{search}".
                      </Text>
                    </View>
                  ) : null}
                </ScrollView>
              ) : null}
            </ScrollView>
          )}

          {activeTab === 'cliente' && (
            <View style={[styles.clienteTab, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.clienteInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Buscar cliente..."
                placeholderTextColor={colors.textSecondary}
                value={cliente ? cliente.name : clienteSearch}
                onChangeText={(t) => { setClienteSearch(t); setCliente(null); setShowClienteSuggest(!!t.trim()); }}
                onFocus={() => setShowClienteSuggest(true)}
              />
              <TouchableOpacity
                style={[styles.consumidorBtn, { borderColor: colors.border }]}
                onPress={() => { setCliente(null); setClienteSearch(''); setShowClienteSuggest(false); playTapSound(); }}
              >
                <Text style={[styles.consumidorText, { color: colors.text }]}>Consumidor final</Text>
              </TouchableOpacity>
              {showClienteSuggest && clienteSuggestions.length > 0 && (
                <ScrollView style={styles.suggestList}>
                  {clienteSuggestions.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.suggestItem, { borderBottomColor: colors.border }]}
                      onPress={() => { setCliente(c); setClienteSearch(''); setShowClienteSuggest(false); playTapSound(); }}
                    >
                      <Text style={[styles.suggestName, { color: colors.text }]}>{c.name}</Text>
                      {c.cpf && <Text style={[styles.suggestCpf, { color: colors.textSecondary }]}>{c.cpf}</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {activeTab === 'finalizacao' && (
            <ScrollView
              style={styles.finalizacaoScroll}
              contentContainerStyle={styles.finalizacaoScrollContent}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
            <GlassCard colors={colors} solid style={[styles.finalizacaoCard, { borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Formas de pagamento</Text>
              {payments.map((p, i) => (
                <View key={i} style={[styles.paymentItem, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.paymentForma, { color: colors.text }]}>{p.forma}{p.parcelas > 1 ? ` (${p.parcelas}x)` : ''}</Text>
                  <View style={styles.paymentItemRight}>
                    <Text style={[styles.paymentValor, { color: colors.primary }]}>{formatCurrency(p.valor)}</Text>
                    <TouchableOpacity onPress={() => removePayment(i)}><Ionicons name="close-circle" size={20} color="#ef4444" /></TouchableOpacity>
                  </View>
                </View>
              ))}
              {!showPaymentAdd ? (
                <TouchableOpacity
                  style={[styles.addPaymentBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setPaymentValorTouched(false);
                    setPaymentValor(suggestedPaymentValue);
                    setShowPaymentAdd(true);
                  }}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addPaymentText}>Adicionar pagamento</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.paymentForm, { borderColor: colors.border }]}>
                  <View style={styles.paymentFormaGrid}>
                    {FORMAS_PAG.map((f) => {
                      const active = paymentForma === f.id;
                      return (
                        <TouchableOpacity
                          key={f.id}
                          style={[
                            styles.formaBtnCell,
                            {
                              borderColor: active ? colors.primary : colors.border,
                              backgroundColor: active ? colors.primaryRgba?.(0.12) ?? colors.primary + '22' : colors.bg,
                            },
                          ]}
                          onPress={() => {
                            setPaymentForma(f.id);
                            if (!paymentValorTouched) setPaymentValor(suggestedPaymentValue);
                          }}
                        >
                          <Ionicons name={f.icon} size={22} color={active ? colors.primary : colors.textSecondary} />
                          <Text style={[styles.formaBtnLabel, { color: active ? colors.primary : colors.text }]} numberOfLines={2}>
                            {f.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {paymentForma === 'credito' && (
                    <TextInput
                      style={[styles.parcelasInput, { color: colors.text, borderColor: colors.border }]}
                      placeholder="Parcelas"
                      keyboardType="number-pad"
                      value={String(paymentParcelas)}
                      onChangeText={(t) => setPaymentParcelas(parseInt(t, 10) || 1)}
                    />
                  )}
                  <View style={[styles.paymentFormRow, narrowLayout && styles.paymentFormRowWrap]}>
                    <MoneyInput
                      value={paymentValor}
                      onChange={(v) => { setPaymentValorTouched(true); setPaymentValor(v); }}
                      placeholder={lang?.decimalSep === '.' ? '0.00' : '0,00'}
                      containerStyle={[styles.paymentValorMoney, { backgroundColor: colors.bg, minWidth: 0 }]}
                    />
                    <TouchableOpacity style={[styles.confirmPaymentBtn, { backgroundColor: colors.primary }]} onPress={addPayment}>
                      <Text style={styles.confirmPaymentText}>OK</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.cancelPaymentBtn, { borderColor: colors.border }]} onPress={() => setShowPaymentAdd(false)}>
                      <Text style={[styles.cancelPaymentText, { color: colors.text }]}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              <View style={[styles.descontoRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.descontoLabel, { color: colors.text }]}>Desconto geral</Text>
                <MoneyInput
                  value={desconto}
                  onChange={setDesconto}
                  containerStyle={[styles.descontoMoneyWrap, { backgroundColor: colors.bg }]}
                />
              </View>
            </GlassCard>
            </ScrollView>
          )}
        </View>

        {/* Painel direito - Carrinho e Total */}
        <View style={[styles.rightPanel, { backgroundColor: colors.bg }, narrowLayout && styles.rightPanelNarrow]}>
          <View style={[styles.cartHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.cartHeaderText, { color: colors.text }]}>{totalItens} ITENS</Text>
          </View>
          {cart.length === 0 ? (
            <View style={styles.cartListEmpty}>
              <View style={styles.cartEmpty}>
                <Image source={AUTH_LOGO_SOURCE} style={styles.cartEmptyLogo} resizeMode="contain" />
                <Text style={[styles.cartEmptyText, { color: colors.textSecondary }]}>Carrinho vazio</Text>
              </View>
            </View>
          ) : (
            <ScrollView style={styles.cartList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {cart.map((item, idx) => (
                <TouchableOpacity
                  key={`${idx}-${item.id}`}
                  activeOpacity={0.85}
                  onPress={() => setSelectedCartIndex(idx)}
                  style={[
                    styles.cartRow,
                    { borderBottomColor: colors.border },
                    selectedCartIndex === idx && { backgroundColor: colors.primaryRgba?.(0.12) ?? 'rgba(34,197,94,0.12)' },
                  ]}
                >
                  <View style={styles.cartRowLeft}>
                    <Text style={[styles.cartName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.cartQtyRow}>
                      <TouchableOpacity onPress={() => updateCartQty(idx, -1)} style={[styles.qtyBtn, { backgroundColor: colors.border }]}>
                        <Ionicons name="remove" size={14} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyText, { color: colors.text }]}>{item.qty || 1}</Text>
                      <TouchableOpacity onPress={() => updateCartQty(idx, 1)} style={[styles.qtyBtn, { backgroundColor: colors.border }]}>
                        <Ionicons name="add" size={14} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.cartRowRight}>
                    <Text style={[styles.cartTotal, { color: colors.primary }]}>{formatCurrency((item.price || 0) * (item.qty || 1))}</Text>
                    <TouchableOpacity onPress={() => removeFromCart(idx)}><Ionicons name="trash-outline" size={18} color="#ef4444" /></TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <View style={[styles.totalsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.totalRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{currencySym} Bruto</Text>
              <Text style={[styles.totalVal, { color: colors.text }]}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={[styles.totalRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{currencySym} Desconto</Text>
              <Text style={[styles.totalVal, { color: colors.text }]}>{formatCurrency(descontoNum)}</Text>
            </View>
            <View style={[styles.totalRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Pago</Text>
              <Text style={[styles.totalVal, { color: '#22c55e' }]}>{formatCurrency(pago)}</Text>
            </View>
            {troco > 0 && (
              <View style={[styles.totalRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Troco</Text>
                <Text style={[styles.totalVal, { color: '#22c55e' }]}>{formatCurrency(troco)}</Text>
              </View>
            )}
            <View style={[styles.totalFinalRow, { backgroundColor: colors.primary }]}>
              <Text style={styles.totalFinalLabel}>TOTAL DA VENDA</Text>
              <Text style={styles.totalFinalVal}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Barra inferior - Atalhos */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }, narrowLayout && styles.footerWrap]}>
        <TouchableOpacity style={[styles.footerBtn, { backgroundColor: '#22c55e' }]} onPress={() => { setActiveTab('produtos'); searchRef.current?.focus(); }}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.footerBtnText}>Item (F1)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerBtn, { backgroundColor: '#ec4899' }]} onPress={() => selectedItem && setSelectedItem(null)}>
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.footerBtnText}>Editar item (F2)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerBtn, { backgroundColor: '#ef4444' }]} onPress={() => requestCancelAction('item')}>
          <Ionicons name="remove-circle-outline" size={18} color="#fff" />
          <Text style={styles.footerBtnText}>Cancelar item</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerBtn, { backgroundColor: '#f97316' }]} onPress={() => requestCancelAction('pedido')}>
          <Ionicons name="close-circle-outline" size={18} color="#fff" />
          <Text style={styles.footerBtnText}>Cancelar pedido</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerBtn, { backgroundColor: '#3b82f6' }]} onPress={() => { setActiveTab('cliente'); playTapSound(); }}>
          <Ionicons name="person-outline" size={18} color="#fff" />
          <Text style={styles.footerBtnText}>Cliente (F3)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerBtn, { backgroundColor: '#8b5cf6' }]} onPress={() => { setActiveTab('finalizacao'); playTapSound(); }}>
          <Ionicons name="settings-outline" size={18} color="#fff" />
          <Text style={styles.footerBtnText}>Pagamento (F4)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerBtn, styles.footerFinalizar, { backgroundColor: colors.primary }]}
          onPress={handleConfirmSale}
          disabled={cart.length === 0 || pago < total - 0.01}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.footerBtnText} numberOfLines={1}>Faturar (F5)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerBtn, { backgroundColor: '#0ea5e9' }]} onPress={handlePrint} disabled={!completedSale}>
          <Ionicons name="print-outline" size={18} color="#fff" />
          <Text style={styles.footerBtnText}>Imprimir (F6)</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showPdvConfigModal} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={[styles.successBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.successTitle, { color: colors.text }]}>Configurações do PDV</Text>
            <Text style={[styles.successSub, { color: colors.textSecondary, textAlign: 'center' }]}>
              Defina as regras da frente de caixa deste comércio.
            </Text>
            <TouchableOpacity
              style={[styles.configRow, { borderColor: colors.border, backgroundColor: colors.bg }]}
              onPress={() => savePdvConfig({ ...pdvConfig, requireOperatorLogin: !pdvConfig.requireOperatorLogin })}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.configTitle, { color: colors.text }]}>Exigir login do operador ao abrir caixa</Text>
                <Text style={[styles.configDesc, { color: colors.textSecondary }]}>Se desativado, vendedor entra direto no PDV.</Text>
              </View>
              <View style={[styles.configBadge, { backgroundColor: pdvConfig.requireOperatorLogin ? colors.primary : colors.border }]}>
                <Text style={styles.configBadgeText}>{pdvConfig.requireOperatorLogin ? 'ATIVO' : 'OFF'}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.configRow, { borderColor: colors.border, backgroundColor: colors.bg }]}
              onPress={() => savePdvConfig({ ...pdvConfig, requireFrontDeskAuth: !pdvConfig.requireFrontDeskAuth })}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.configTitle, { color: colors.text }]}>Exigir autenticação para cancelar/fechar</Text>
                <Text style={[styles.configDesc, { color: colors.textSecondary }]}>Controla cancelar item, cancelar pedido e fechar caixa.</Text>
              </View>
              <View style={[styles.configBadge, { backgroundColor: pdvConfig.requireFrontDeskAuth ? colors.primary : colors.border }]}>
                <Text style={styles.configBadgeText}>{pdvConfig.requireFrontDeskAuth ? 'ATIVO' : 'OFF'}</Text>
              </View>
            </TouchableOpacity>
            {lockedMode ? (
              <Text style={[styles.configLockHint, { color: colors.textSecondary }]}>
                Modo restrito ativo: esta aba foi aberta para operação exclusiva do PDV.
              </Text>
            ) : null}
            <TouchableOpacity
              style={[styles.printBtn, { backgroundColor: colors.primary, width: '100%', marginTop: 8 }]}
              onPress={() => setShowPdvConfigModal(false)}
            >
              <Text style={styles.printBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={authOpen} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={[styles.successBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.successTitle, { color: colors.text }]}>Abrir caixa</Text>
            <Text style={[styles.successSub, { color: colors.textSecondary }]}>
              {!operatorCheckReady
                ? 'Carregando operadores...'
                : activeOperators.length > 0
                  ? 'Entre com ID e senha do operador'
                  : 'Nenhum operador de caixa ativo cadastrado.'}
            </Text>
            <View style={styles.operatorInputRow}>
              <TextInput
                style={[styles.operatorInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Nome do operador"
                value={operatorNameQuery}
                onChangeText={(t) => {
                  setOperatorNameQuery(t);
                  setOperatorId('');
                  setSelectedOperatorId(null);
                  const hasText = !!String(t || '').trim();
                  setShowAllOperators(false);
                  setShowOperatorSuggest(hasText);
                }}
                autoCapitalize="none"
                editable={operatorCheckReady && activeOperators.length > 0}
                autoCorrect={false}
                autoComplete="name"
              />
              <TouchableOpacity
                style={[styles.operatorToggleBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
                onPress={() => {
                  const next = !showAllOperators;
                  setShowAllOperators(next);
                  setShowOperatorSuggest(next);
                }}
                disabled={!operatorCheckReady || activeOperators.length === 0}
              >
                <Ionicons name={showAllOperators ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {showOperatorSuggest && operatorCheckReady && activeOperators.length > 0 && (showAllOperators || !!operatorNameQuery.trim()) ? (
              <View style={[styles.operatorSuggestWrap, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 150 }}>
                  {operatorSuggestions.map((op) => (
                    <TouchableOpacity
                      key={`op-${op.id}`}
                      style={[styles.operatorSuggestItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setOperatorNameQuery(op.nome || '');
                        setOperatorId(String(readOperatorId(op) || ''));
                        setSelectedOperatorId(op.id);
                        setShowOperatorSuggest(false);
                        setShowAllOperators(false);
                        playTapSound();
                      }}
                    >
                      <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{op.nome || 'Operador'}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={1}>ID: {readOperatorId(op)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            <TextInput
              style={[styles.senhaInput, { color: colors.text, borderColor: colors.border, marginTop: 0 }]}
              placeholder="Senha"
              secureTextEntry
              value={operatorPass}
              onChangeText={setOperatorPass}
              editable={operatorCheckReady && activeOperators.length > 0}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
            />
            {operatorCheckReady && activeOperators.length === 0 ? (
              <Text style={[styles.successSub, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
                Cadastre um colaborador como operador no menu Empresa {'>'} Colaboradores para liberar o caixa.
              </Text>
            ) : null}
            {isWeb && loginDebug ? (
              <View style={[styles.loginDebugBox, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                <Text style={[styles.loginDebugTitle, { color: colors.text }]}>Diagnóstico login PDV</Text>
                <Text style={[styles.loginDebugLine, { color: colors.textSecondary }]}>Operadores ativos: {loginDebug.operadoresAtivos}</Text>
                <Text style={[styles.loginDebugLine, { color: colors.textSecondary }]} numberOfLines={2}>
                  IDs ativos: {loginDebug.idsAtivos.length ? loginDebug.idsAtivos.join(', ') : '(nenhum)'}
                </Text>
                <Text style={[styles.loginDebugLine, { color: colors.textSecondary }]}>Login digitado: {loginDebug.loginDigitado}</Text>
                <Text style={[styles.loginDebugLine, { color: colors.textSecondary }]}>Operador encontrado: {loginDebug.operadorEncontrado}</Text>
                <Text style={[styles.loginDebugLine, { color: colors.textSecondary }]}>Senha digitada: {loginDebug.senhaDigitada} | Senha cadastrada: {loginDebug.senhaCadastrada}</Text>
              </View>
            ) : null}
            <View style={styles.authBtnsRow}>
              <TouchableOpacity
                style={[styles.printBtn, styles.authBtn, { backgroundColor: colors.primary, opacity: operatorCheckReady && activeOperators.length > 0 ? 1 : 0.5 }]}
                onPress={confirmOperatorAccess}
                disabled={!operatorCheckReady || activeOperators.length === 0}
              >
                <Text style={styles.printBtnText}>Entrar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.authBtn, styles.novaBtn, { borderColor: colors.border }]} onPress={onClose}>
                <Text style={[styles.novaBtnText, { color: colors.text }]}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {completedSale && (
        <>
          <ReceiptPrintWeb sale={completedSale} empresa={empresaInfo} />
          <Modal visible animationType="fade" transparent>
            <View style={styles.successOverlay}>
              <View style={[styles.successBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.successIcon, { backgroundColor: '#22c55e' }]}>
                  <Ionicons name="checkmark-circle" size={48} color="#fff" />
                </View>
                <Text style={[styles.successTitle, { color: colors.text }]}>Venda realizada!</Text>
                <Text style={[styles.successSub, { color: colors.textSecondary }]}>Venda #{completedSale.numero}</Text>
                <Text style={[styles.successTotal, { color: colors.primary }]}>{formatCurrency(completedSale.total)}</Text>
                <View style={styles.successBtns}>
                  <TouchableOpacity style={[styles.printBtn, { backgroundColor: colors.primary }]} onPress={handlePrint}>
                    <Ionicons name="print-outline" size={22} color="#fff" />
                    <Text style={styles.printBtnText}>Imprimir cupom</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.novaBtn, { borderColor: colors.border }]} onPress={handleNovaVenda}>
                    <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                    <Text style={[styles.novaBtnText, { color: colors.primary }]}>Nova venda</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}

      <Modal visible={cancelAuthOpen} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={[styles.successBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.successTitle, { color: colors.text }]}>
              {cancelActionType === 'item'
                ? 'Cancelar item'
                : cancelActionType === 'pedido'
                  ? 'Cancelar pedido'
                  : 'Fechar caixa'}
            </Text>
            <Text style={[styles.successSub, { color: colors.textSecondary }]}>
              Digite login e senha do operador de caixa
            </Text>
            <TextInput
              style={[styles.senhaInput, { color: colors.text, borderColor: colors.border, marginBottom: 8 }]}
              placeholder="Login (nome ou ID)"
              value={cancelOperatorLogin}
              onChangeText={setCancelOperatorLogin}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={[styles.senhaInput, { color: colors.text, borderColor: colors.border, marginTop: 0 }]}
              placeholder="Senha"
              secureTextEntry
              value={cancelOperatorPass}
              onChangeText={setCancelOperatorPass}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
            />
            <View style={styles.successBtns}>
              <TouchableOpacity style={[styles.printBtn, { backgroundColor: colors.primary }]} onPress={confirmCancelByOperator}>
                <Text style={styles.printBtnText}>Confirmar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.novaBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setCancelAuthOpen(false);
                  setCancelActionType(null);
                  setCancelOperatorLogin('');
                  setCancelOperatorPass('');
                }}
              >
                <Text style={[styles.novaBtnText, { color: colors.text }]}>Voltar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  headerStatus: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 3,
    textAlign: 'center',
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.35)',
  },
  headerMetaRowWrap: { flexWrap: 'wrap', justifyContent: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, flexShrink: 1, minWidth: 0 },
  headerLeftWrap: { flexBasis: '100%', justifyContent: 'center', flexWrap: 'wrap' },
  headerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  headerValue: { fontSize: 13, color: '#fff', fontWeight: '600', maxWidth: 160 },
  headerSeparator: { color: '#fff', fontSize: 13 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' },
  headerRightWrap: { flexBasis: '100%', justifyContent: 'center' },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerBtnText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  headerTime: { fontSize: 11, color: 'rgba(255,255,255,0.9)', maxWidth: 200 },
  headerClose: { padding: 4 },
  main: { flex: 1, flexDirection: 'row', minHeight: 0 },
  mainColumn: { flexDirection: 'column' },
  leftPanel: { minHeight: 0, padding: 12 },
  leftPanelWide: { width: 380, maxWidth: '42%', borderRightWidth: 1, borderBottomWidth: 0 },
  leftPanelNarrow: {
    width: '100%',
    maxWidth: '100%',
    flex: 0,
    maxHeight: 480,
    minHeight: 280,
    borderRightWidth: 0,
    borderBottomWidth: 1,
    padding: 10,
  },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  produtosScroll: { flex: 1, minHeight: 0 },
  produtosScrollContent: { paddingBottom: 12 },
  tab: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, flexShrink: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14 },
  productSuggestWrap: { borderWidth: 1, borderRadius: 10, marginBottom: 8, maxHeight: 210 },
  productSuggestList: { maxHeight: 200 },
  productSuggestItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  productSuggestName: { fontSize: 13, fontWeight: '700' },
  productSuggestCode: { fontSize: 11, marginTop: 2 },
  productFilterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 8 },
  productFilterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderRadius: 999 },
  emptySearchState: { borderWidth: 1, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptySearchText: { fontSize: 12, fontWeight: '600', flex: 1 },
  itemDetailCard: { padding: 12, marginBottom: 10 },
  itemDetailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  itemDetailThumb: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  itemDetailImg: { width: 56, height: 56 },
  itemDetailTitleWrap: { flex: 1, minWidth: 0 },
  itemDetailName: { fontSize: 14, fontWeight: '700' },
  itemDetailMeta: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  itemDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: -4,
  },
  itemDetailFieldCol: {
    width: '33.33%',
    minWidth: 0,
    paddingHorizontal: 4,
  },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  fieldInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, minHeight: 44 },
  moneyInputWrap: { width: '100%', minWidth: 0, minHeight: 44, overflow: 'hidden' },
  itemDetailBtns: { flexDirection: 'row', gap: 8, marginTop: 12 },
  detailBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { borderWidth: 1 },
  cancelBtnText: { fontSize: 12, fontWeight: '700' },
  addBtn: {},
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  itemGrid: { flex: 1, minHeight: 120 },
  itemGridNarrow: { maxHeight: 320 },
  itemGridContent: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  gridItem: { width: '100%', minWidth: 180, flexGrow: 1, maxWidth: '100%', padding: 10, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 10, alignItems: 'center' },
  gridThumb: { width: 56, height: 56, borderRadius: 8, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  gridImg: { width: 56, height: 56 },
  gridName: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  gridCode: { fontSize: 10, marginBottom: 2 },
  gridPrice: { fontSize: 13, fontWeight: '700' },
  clienteTab: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1 },
  clienteInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 12 },
  consumidorBtn: { paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center', marginBottom: 12 },
  consumidorText: { fontSize: 14, fontWeight: '600' },
  suggestList: { maxHeight: 200 },
  suggestItem: { paddingVertical: 10, borderBottomWidth: 1 },
  suggestName: { fontSize: 14 },
  suggestCpf: { fontSize: 11, marginTop: 2 },
  finalizacaoScroll: { flex: 1, minHeight: 0 },
  finalizacaoScrollContent: { flexGrow: 1, paddingBottom: 12 },
  finalizacaoCard: {},
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 },
  paymentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  paymentForma: { fontSize: 13 },
  paymentItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paymentValor: { fontSize: 13, fontWeight: '600' },
  addPaymentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  addPaymentText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  paymentForm: { marginTop: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  paymentFormaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  formaBtnCell: {
    flexBasis: '47%',
    minWidth: 120,
    maxWidth: '48%',
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formaBtnLabel: { fontSize: 12, fontWeight: '700', marginTop: 6, textAlign: 'center' },
  parcelasInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8, fontSize: 14 },
  paymentFormRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  paymentFormRowWrap: { flexWrap: 'wrap' },
  paymentValorMoney: { flex: 1, minWidth: 160, minHeight: 44 },
  confirmPaymentBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  confirmPaymentText: { color: '#fff', fontWeight: '600' },
  cancelPaymentBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  cancelPaymentText: { fontSize: 13 },
  descontoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
    flexWrap: 'wrap',
  },
  descontoLabel: { fontSize: 13, flexShrink: 0 },
  descontoMoneyWrap: { flex: 1, minWidth: 160, maxWidth: 280, minHeight: 44 },
  rightPanel: { flex: 1, flexDirection: 'column', minWidth: 0, minHeight: 0 },
  rightPanelNarrow: { minHeight: 260, flex: 1 },
  cartHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  cartHeaderText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  cartList: { flex: 1 },
  cartListEmpty: { flex: 1, overflow: 'hidden' },
  cartEmpty: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 24, paddingBottom: 0 },
  cartEmptyLogo: { width: 420, height: 138, opacity: 0.92 },
  cartEmptyText: { fontSize: 16, marginTop: 8 },
  cartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  cartRowLeft: { flex: 1 },
  cartName: { fontSize: 14 },
  cartQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  qtyBtn: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 14, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  cartRowRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartTotal: { fontSize: 14, fontWeight: '700' },
  totalsBox: { padding: 12, borderTopWidth: 1, flexShrink: 0 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  totalLabel: { fontSize: 13 },
  totalVal: { fontSize: 14, fontWeight: '600' },
  totalFinalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12, marginTop: 12 },
  totalFinalLabel: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  totalFinalVal: { fontSize: 22, fontWeight: '800', color: '#fff' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1 },
  footerWrap: { flexWrap: 'wrap', rowGap: 8 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, minWidth: 110, justifyContent: 'center' },
  footerBtnText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  footerFinalizar: { paddingHorizontal: 18, minWidth: 140, flexShrink: 1 },
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successBox: { width: '100%', maxWidth: 360, padding: 24, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  successIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  successSub: { fontSize: 14, marginBottom: 8 },
  successTotal: { fontSize: 24, fontWeight: '800', marginBottom: 20 },
  successBtns: { flexDirection: 'row', gap: 12 },
  authBtnsRow: { flexDirection: 'row', gap: 12, width: '100%' },
  authBtn: { flex: 1, minWidth: 0, paddingHorizontal: 0 },
  printBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  printBtnText: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  novaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  novaBtnText: { fontSize: 15, fontWeight: '600' },
  senhaInput: { width: '100%', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginVertical: 16 },
  operatorInputRow: { width: '100%', flexDirection: 'row', gap: 8, alignItems: 'stretch', marginVertical: 16 },
  operatorInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  operatorToggleBtn: { width: 44, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  operatorSuggestWrap: { width: '100%', borderWidth: 1, borderRadius: 10, marginTop: -8, marginBottom: 10, overflow: 'hidden' },
  operatorSuggestItem: { paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1 },
  loginDebugBox: { width: '100%', borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 8, marginBottom: 4 },
  loginDebugTitle: { fontSize: 12, fontWeight: '800', marginBottom: 6 },
  loginDebugLine: { fontSize: 11, marginBottom: 2 },
  configRow: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  configTitle: { fontSize: 13, fontWeight: '700' },
  configDesc: { fontSize: 11, marginTop: 2 },
  configBadge: {
    minWidth: 56,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  configBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  configLockHint: { width: '100%', fontSize: 11, marginTop: 10, textAlign: 'center' },
});
