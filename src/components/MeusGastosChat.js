import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useFinance } from '../contexts/FinanceContext';
import { useMenu } from '../contexts/MenuContext';
import { parseExpenseVoice, parseVoiceIntent, buildExpenseVoicePreview, extractMainExpenseDescription } from '../utils/voiceExpenseParser';
import { CATEGORIAS_DESPESA } from '../constants/categories';
import {
  playTapSound,
  playVoiceRecordingStartSound,
  playVoiceRecordingStopSound,
} from '../utils/sounds';
import VoiceRecorder from './VoiceRecorder';
import { processReceipt } from '../services/receiptOcr/processReceipt';
import { useIsDesktopLayout, WEB_MOBILE_TAB_BAR_RESERVE } from '../utils/platformLayout';
import { WEB_DESKTOP_RAIL_WIDTH } from './navigation/RightSideTabBar';

/** Mesmo gutter do AppNavigator (padding da rail): coluna principal não cobre a rail direita. */
const WEB_DESKTOP_RIGHT_GUTTER = 14 + WEB_DESKTOP_RAIL_WIDTH + 16;

function nowIso() {
  return new Date().toISOString();
}

function formatBrDate(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}


function parseAmountFromText(text) {
  if (!text) return null;
  const normalized = String(text).replace(/\s/g, '');
  const matches = normalized.match(/\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2})?/g);
  if (!matches || matches.length === 0) return null;
  const nums = matches
    .map((v) => Number(v.replace(/\./g, '').replace(',', '.')))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!nums.length) return null;
  return Math.max(...nums);
}

function cleanTranscriptText(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s,.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImportantDescription(text) {
  const fromParser = extractMainExpenseDescription(text);
  if (fromParser) return fromParser;
  const raw = cleanTranscriptText(text);
  if (!raw) return '';

  const withoutValues = raw
    .replace(/r\$\s*\d+(?:[.,]\d{2})?/gi, ' ')
    .replace(/\d+(?:[.,]\d{2})?/g, ' ')
    .replace(/\b(cart[aã]o|cr[eé]dito|d[eé]bito|pix|dinheiro|total|valor|gasto|gastei|paguei|foi|com|no|na|de|da|do|em|pra|para|um|uma|o|a|os|as)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!withoutValues) return '';
  const words = withoutValues.split(' ').filter(Boolean).slice(0, 5);
  return words.join(' ');
}

function parseAmountCandidates(text) {
  if (!text) return [];
  const matches = String(text).match(/\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2})?/g) || [];
  return matches
    .map((v) => Number(v.replace(/\./g, '').replace(',', '.')))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function parseMoneyTokenToNumber(token) {
  if (!token) return null;
  const n = Number(String(token).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Símbolos e palavras de moedas que consideramos válidos na leitura do comprovante
const CURRENCY_REGEX =
  /r\s*\$|\$\s*|€|£|¥|US\$|USD\b|EUR\b|BRL\b|real\b|reais\b|d[oó]lar(?:es)?\b|euro?s?\b|peso?s?\b|CHF\b|CAD\b|AUD\b|NZD\b|JPY\b|CNY\b|RUB\b|₱|₹|₽|₺|₩|₪|₫|₴/i;

function extractReceiptItemsFromOcr(ocrText) {
  const lines = String(ocrText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const items = [];
  const skipRx =
    /\b(cupom|fiscal|cnpj|ie|op:|vers[aã]o|ecf|coo|caixa|md5|imposto|tribut|total|dinheiro|troco|subtotal|desconto)\b/i;

  lines.forEach((line) => {
    if (skipRx.test(line)) return;
    // Preferimos linhas com símbolo/palavra de moeda, mas não obrigamos (algumas notas não trazem "R$")
    const hasCurrency = CURRENCY_REGEX.test(line);
    const moneyTokens = line.match(/\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2})?/g) || [];
    if (!moneyTokens.length) return;
    const lastToken = moneyTokens[moneyTokens.length - 1];
    if (looksLikeDate(lastToken)) return;
    const value = parseMoneyTokenToNumber(lastToken);
    if (!value) return;
    // evita pegar valores muito pequenos que normalmente não são itens
    if (!hasCurrency && value < 5) return;

    let desc = line
      .replace(/\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2})?/g, ' ')
      .replace(/[^\p{L}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!desc || desc.length < 2) return;
    desc = desc
      .split(' ')
      .filter((w) => w.length > 1)
      .slice(0, 4)
      .join(' ');
    if (!desc) return;
    const normalizedDesc = desc.charAt(0).toUpperCase() + desc.slice(1).toLowerCase();
    items.push({ description: normalizedDesc, amount: value });
  });

  const dedup = new Map();
  items.forEach((it) => {
    const key = `${it.description}|${it.amount.toFixed(2)}`;
    if (!dedup.has(key)) dedup.set(key, it);
  });
  return Array.from(dedup.values()).slice(0, 8);
}

/** Confere se o token parece ser data (dd/mm/yyyy, dd-mm-yyyy, etc) e não valor */
function looksLikeDate(token) {
  if (!token) return false;
  const s = String(token).trim();
  if (/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(s)) return true;
  if (/^\d{1,2}[\/\-\.]\d{1,2}$/.test(s)) return true;
  if (/^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(s)) return true;
  return false;
}

/** Indica se a linha parece ser item de produto (qtd + preço unit) e não total */
function looksLikeProductLine(line) {
  const t = (line || '').toLowerCase();
  if (/\b(qtd|quantidade|un\s*[xX]|und)\s*\d/.test(t)) return true;
  if (/\d+\s*x\s*\d{1,3}[.,]\d{2}/.test(t)) return true;
  if (/\b(unit|un\.?|pc)\b.*\d+[.,]\d{2}/.test(t)) return true;
  return false;
}

function extractReceiptDataFromOcr(ocrText) {
  if (!ocrText) return null;
  const lines = String(ocrText)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  const strongTotalLineRegex = /\b(total|valor total|vl\.?\s*total|total a pagar|valor a pagar|l[ií]quido|valor final|total geral|valor final a pagar|total da nota|total geral da nota|custo total)\b/i;
  const noisyCountRegex = /\b(total de itens|n[º°] de itens|itens\s*:?\s*\d|qtd\s*:?\s*\d|quantidade)\b/i;
  const taxRegex = /\b(imposto|impostos|tribut|ibpt)\b/i;
  const moneyTokenRegex = /\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2})?/g;

  const collectCandidatesFromLine = (line, lineIndex, baseScore) => {
    if (taxRegex.test(line)) return [];
    if (looksLikeProductLine(line)) return [];
    const hasCurrency = CURRENCY_REGEX.test(line);
    const tokens = String(line).match(moneyTokenRegex) || [];
    if (!tokens.length) return [];
    const noisyLine = noisyCountRegex.test(line);
    const res = [];
    for (const token of tokens) {
      if (looksLikeDate(token)) continue;
      const value = parseMoneyTokenToNumber(token);
      const hasCents = /[.,]\d{2}$/.test(token);
      if (!value || value <= 0) continue;
      // Se a linha é muito "numérica" (contagem de itens), exigimos moeda ou centavos
      if (noisyLine && !hasCurrency && !hasCents) continue;
      if (value > 99999) continue;
      const score = baseScore + (hasCurrency ? 4 : 0) + (hasCents ? 3 : 0) + (lineIndex / 1000);
      res.push({ value, score });
    }
    return res;
  };

  const candidates = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!strongTotalLineRegex.test(line)) continue;
    candidates.push(...collectCandidatesFromLine(line, i, 10));
    if (i + 1 < lines.length) {
      candidates.push(...collectCandidatesFromLine(lines[i + 1], i + 1, 8));
    }
  }

  const items = extractReceiptItemsFromOcr(ocrText);
  const itemsSum = items.reduce((s, it) => s + (it.amount || 0), 0);

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score || b.value - a.value);
    const total = candidates[0].value;
    return {
      total,
      items,
      itemsSum,
      itemsMismatch: items.length > 0 ? Math.abs(itemsSum - total) > 0.05 : false,
    };
  }

  const start = Math.max(0, lines.length - Math.ceil(lines.length / 3));
  const tailCandidates = [];
  for (let i = start; i < lines.length; i += 1) {
    if (looksLikeProductLine(lines[i])) continue;
    tailCandidates.push(...collectCandidatesFromLine(lines[i], i, 2));
  }
  if (tailCandidates.length > 0) {
    tailCandidates.sort((a, b) => b.value - a.value);
    const total = tailCandidates[0].value;
    return {
      total,
      items,
      itemsSum,
      itemsMismatch: items.length > 0 ? Math.abs(itemsSum - total) > 0.05 : false,
    };
  }
  // Fallback final: procura o maior valor apenas entre linhas que têm símbolo/palavra de moeda
  const allMoneyMatches =
    lines
      .filter((l) => CURRENCY_REGEX.test(l))
      .join('\n')
      .match(/\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2})?/g) || [];
  const allValues = allMoneyMatches
    .map((t) => ({ v: parseMoneyTokenToNumber(t), t }))
    .filter(({ v, t }) => v && v > 0 && v < 99999 && !looksLikeDate(t))
    .map(({ v }) => v);
  if (allValues.length === 0) return null;
  const total = Math.max(...allValues);
  return {
    total,
    items,
    itemsSum,
    itemsMismatch: false,
  };
}

function buildAssistantExpense(textSource) {
  const parsedVoice = parseExpenseVoice(textSource || '');
  const amountFromRegex = parseAmountFromText(textSource || '');
  const amount = parsedVoice?.amount ? Number(String(parsedVoice.amount).replace(',', '.')) : amountFromRegex;
  if (!amount || !Number.isFinite(amount) || amount <= 0) return null;
  const categoryId = parsedVoice?.categoryDesp || null;
  const categoryMeta = categoryId ? CATEGORIAS_DESPESA.find((c) => c.id === categoryId) : null;
  const categoryLabel = categoryMeta?.label || 'Outros';
  const subcategory = parsedVoice?.subcategoryDesp || categoryMeta?.sub?.[0] || null;
  const hasCategoryInfo = Boolean(parsedVoice?.subcategoryDesp || parsedVoice?.categoryDesp);
  const hasDescriptionInfo = Boolean(parsedVoice?.description);
  const importantDescription = extractImportantDescription(textSource || '');
  const description = parsedVoice?.description || importantDescription || subcategory || 'Gasto por comprovante';
  return {
    amount,
    category: subcategory || categoryLabel,
    categoryId,
    categoryLabel,
    subcategory,
    description,
    tipoVenda: parsedVoice?.tipoVenda || 'pessoal',
    needsCategoryQuestion: !hasCategoryInfo && !hasDescriptionInfo,
  };
}

function brDateToIso(dateStr) {
  if (!dateStr) return null;
  const parts = String(dateStr).trim().split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

export function MeusGastosChat({ embedded = false, transparentBg = false }) {
  const { colors } = useTheme();
  const { transactions, addTransaction } = useFinance();
  const { openAddModal } = useMenu();
  const insets = useSafeAreaInsets();
  const isDesktopLayout = useIsDesktopLayout();
  const isWebMobile = Platform.OS === 'web' && !isDesktopLayout;
  /** Card Início no web mobile: manter input + botões na mesma linha no rodapé */
  const embeddedMobileStackInputs = false;
  const webDesktopFixedInput = Platform.OS === 'web' && isDesktopLayout && !embedded;
  const mobileBottomDock = !webDesktopFixedInput && (Platform.OS !== 'web' || isWebMobile);
  // No card embutido (Meus gastos), não reservamos área da tabbar global para não "subir" o input.
  const mobileTabbarReserve = mobileBottomDock && !embedded
    ? (Platform.OS === 'web' ? WEB_MOBILE_TAB_BAR_RESERVE : 96)
    : 0;
  const EXAMPLE_PHRASES = [
    'Fui no mercado e gastei 89,90. Gasto pessoal.',
    'Estava na farmácia e paguei 35,50.',
    'Almoço no restaurante, R$ 48,00, gasto pessoal.',
    'Combustível no posto, 120 reais.',
    'Comprei material de escritório, 156,80. Empresa.',
    'Gastei 22,90 no delivery, pessoal.',
    'Pagamento no supermercado, total 234,15.',
  ];

  const [messages, setMessages] = useState(() => {
    const ex = EXAMPLE_PHRASES[Math.floor(Math.random() * EXAMPLE_PHRASES.length)];
    return [
      {
        id: 'intro-assistant',
        from: 'assistant',
        kind: 'text',
        text: `Envie texto, áudio ou foto. Ex: "${ex}" Registro o gasto automaticamente.`,
        createdAt: nowIso(),
      },
    ];
  });
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceEngine, setVoiceEngine] = useState(null);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [pendingVoiceText, setPendingVoiceText] = useState('');
  const [processingImage, setProcessingImage] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState(null);
  const [cameraChoiceVisible, setCameraChoiceVisible] = useState(false);
  const listeningPrevRef = useRef(false);
  const isListeningRef = useRef(false);
  const handleUserContentRef = useRef(null);
  const voiceActionsRef = useRef({ startListening: async () => {}, stopListening: async () => {} });
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const lastTxIdRef = useRef(null);
  const receiptAddCandidateRef = useRef(null);
  const voiceRecordedAtRef = useRef(null);
  // Para evitar duplicar mensagens quando a despesa já foi adicionada pelo próprio chat (ex.: voz)
  const suppressAssistantMessageRef = useRef(null);

  const stripAccents = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const inferReceiptCategory = (text) => {
    const t = stripAccents(text).toLowerCase();
    let best = null;
    let bestScore = 0;

    for (const cat of CATEGORIAS_DESPESA) {
      const catLabel = stripAccents(cat.label).toLowerCase();
      for (const sub of cat.sub || []) {
        const subNorm = stripAccents(sub).toLowerCase();
        if (!subNorm) continue;
        if (t.includes(subNorm)) {
          const words = subNorm.split(/\s+/).filter(Boolean);
          const wordHits = words.reduce((s, w) => s + (w.length > 2 && t.includes(w) ? 1 : 0), 0);
          const score = 2 + words.length + wordHits;
          if (score > bestScore) {
            bestScore = score;
            best = { categoryDesp: cat.id, subcategoryDesp: sub, kindLabel: cat.label };
          }
        }
      }
      // fallback por label da categoria (menos forte)
      if (t.includes(catLabel) && bestScore < 2) {
        bestScore = 2;
        best = { categoryDesp: cat.id, subcategoryDesp: cat.sub?.[0] || cat.label, kindLabel: cat.label };
      }
    }

    // fallback por palavras-chave (Alimento, Conta, Produto)
    if (!best) {
      const hasFood = /(supermercad|mercad|padari|restaur|delivery|cafe|acoug|a(c|ç)ougue|hortifr|mercear|lancho|bebi|feira)/i.test(stripAccents(text));
      if (hasFood) {
        const sub = (CATEGORIAS_DESPESA.find((c) => c.id === 'alimentacao')?.sub || [])[0] || 'Supermercado';
        return { categoryDesp: 'alimentacao', subcategoryDesp: sub, kindLabel: 'Alimentação' };
      }
      const hasBills = /(energia|agua|água|luz|iptu|condominio|condomínio|boleto|impost|taxa|tribut|saneamento|internet)/i.test(stripAccents(text));
      if (hasBills) {
        const cat = CATEGORIAS_DESPESA.find((c) => c.id === 'moradia');
        const sub = cat?.sub?.find((s) => /energia/i.test(stripAccents(s))) || cat?.sub?.[0] || 'Energia';
        return { categoryDesp: 'moradia', subcategoryDesp: sub, kindLabel: 'Conta' };
      }
      const hasProduct = /(loja|shopping|eletron|celular|roupa|sapato|camisa|cosmet|mercador|produto)/i.test(stripAccents(text));
      if (hasProduct) {
        const cat = CATEGORIAS_DESPESA.find((c) => c.id === 'compras');
        const sub = cat?.sub?.[0] || 'Roupas';
        return { categoryDesp: 'compras', subcategoryDesp: sub, kindLabel: 'Produto' };
      }
      const outros = CATEGORIAS_DESPESA.find((c) => c.id === 'outros_desp');
      const outrosSub = outros?.sub?.find((s) => stripAccents(s).toLowerCase() === 'outros') || outros?.sub?.[0] || 'Outros';
      return { categoryDesp: 'outros_desp', subcategoryDesp: outrosSub, kindLabel: 'Outros' };
    }

    return best;
  };

  const orderedMessages = useMemo(() => messages, [messages]);

  const appendMessage = (msg) => {
    setMessages((prev) => {
      const next = [...prev, msg];
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 100);
      return next;
    });
  };

  const openSuggestedForm = (action) => {
    if (!action?.type) return;
    playTapSound();
    if (action.type === 'despesa' && action.params?.__fromReceiptOCR) {
      const p = action.params || {};
      receiptAddCandidateRef.current = {
        expiresAt: Date.now() + 15000,
        amountNumber: Number(p.__amountNumber || 0),
        dateIso: p.__dateIso || null,
        categoryKey: p.__categoryKey || null,
      };
    }
    openAddModal?.(action.type, action.params || null);
  };

  const handleOcrRetryAction = async (msg, actionType) => {
    if (actionType !== 'retryOcr') return;
    playTapSound();
    const meta = msg.ocrFailMeta || {};
    const { imageUri: uri, imageBase64: base64 } = meta;
    if (!uri) return;
    setProcessingImage(true);
    const loadingId = `assistant-loading-retry-${Date.now()}`;
    appendMessage({
      id: loadingId,
      from: 'assistant',
      kind: 'text',
      text: 'Lendo imagem...',
      createdAt: nowIso(),
    });
    try {
      const receipt = await processReceipt({ imageUri: uri, imageBase64: base64 });
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      if (receipt.success) {
        await registerExpenseFromImageAndReply(receipt);
      } else {
        appendMessage({
          id: `assistant-ocr-failed-${Date.now()}`,
          from: 'assistant',
          kind: 'text',
          text: 'Não consegui extrair valor e data desta nota. Verifique se a chave API está configurada e se a imagem está legível.',
          actions: [{ label: 'Tentar novamente', actionType: 'retryOcr' }],
          ocrFailMeta: { imageUri: uri, imageBase64: base64 },
          createdAt: nowIso(),
        });
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      appendMessage({
        id: `assistant-ocr-error-${Date.now()}`,
        from: 'assistant',
        kind: 'text',
        text: `Erro ao ler imagem: ${err?.message || 'Tente novamente.'}`,
        actions: [{ label: 'Tentar novamente', actionType: 'retryOcr' }],
        ocrFailMeta: { imageUri: uri, imageBase64: base64 },
        createdAt: nowIso(),
      });
    } finally {
      setProcessingImage(false);
    }
  };

  const buildIntentSummary = (intent) => {
    const typeLabelMap = {
      receita: 'entrada',
      despesa: 'saída',
      agenda: 'agendamento',
      cliente: 'cliente',
      produto: 'produto',
      servico: 'serviço',
      fornecedor: 'fornecedor',
      tarefa: 'tarefa',
      fatura: 'fatura',
    };
    const label = typeLabelMap[intent?.type] || intent?.type || 'registro';
    if (intent?.type === 'agenda') {
      const p = intent.params || {};
      const timePart = p.time && p.timeEnd ? ` (${p.time} até ${p.timeEnd})` : '';
      const desc = p.description ? `: ${p.description}` : '';
      return `Identifiquei um ${label}${desc}${timePart}.`;
    }
    if (intent?.params?.amount) {
      return `Identifiquei uma ${label} de R$ ${String(intent.params.amount)}.`;
    }
    return `Identifiquei um ${label}.`;
  };

  const registerExpenseAndReply = async (textSource, sourceLabel) => {
    const expense = buildAssistantExpense(textSource);
    if (!expense) {
      appendMessage({
        id: `assistant-no-amount-${Date.now()}`,
        from: 'assistant',
        kind: 'text',
        text: `Não consegui identificar valor no ${sourceLabel}. Tente incluir algo como "R$ 39,90".`,
        createdAt: nowIso(),
      });
      return;
    }

    const payload = {
      type: 'expense',
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      categoryDesp: expense.categoryId || undefined,
      subcategoryDesp: expense.subcategory || undefined,
      date: new Date().toISOString().slice(0, 10),
      formaPagamento: 'pix',
      tipoVenda: expense.tipoVenda,
    };
    suppressAssistantMessageRef.current = {
      description: payload.description,
      amount: payload.amount,
      date: payload.date,
      category: payload.category,
      expiresAt: Date.now() + 5000,
    };
    try {
      await addTransaction(payload);
    } catch (err) {
      appendMessage({
        id: `assistant-save-error-${Date.now()}`,
        from: 'assistant',
        kind: 'text',
        text: `Identifiquei R$ ${expense.amount.toFixed(2).replace('.', ',')} mas não consegui salvar. Tente adicionar manualmente.`,
        createdAt: nowIso(),
      });
      return;
    }
    if (expense.needsCategoryQuestion) {
      appendMessage({
        id: `assistant-ok-ask-${Date.now()}`,
        from: 'assistant',
        kind: 'text',
        text: `Registrei R$ ${expense.amount.toFixed(2).replace('.', ',')}. Não identifiquei com o que foi gasto. Me diga em uma frase curta (ex.: mercado, combustível, farmácia).`,
        createdAt: nowIso(),
      });
    } else {
      appendMessage({
        id: `assistant-ok-${Date.now()}`,
        from: 'assistant',
        kind: 'text',
        text: `Gasto registrado: R$ ${expense.amount.toFixed(2).replace('.', ',')} | ${expense.description} | ${expense.categoryLabel}${expense.subcategory ? ` > ${expense.subcategory}` : ''}.`,
        createdAt: nowIso(),
      });
    }
  };

  const registerExpenseFromImageAndReply = async (receiptData) => {
    const d = receiptData || null;
    const totalNumber = d?.total;
    const dateBr = d?.date;
    const rawText = d?.rawText || '';

    if (!rawText || !dateBr || typeof totalNumber !== 'number' || !(totalNumber > 0)) {
      appendMessage({
        id: `assistant-ocr-no-data-${Date.now()}`,
        from: 'assistant',
        kind: 'text',
        text: 'Não consegui extrair valor total e data dessa notinha com segurança. Não registrei gasto. Tente outra foto mais nítida.',
        createdAt: nowIso(),
      });
      return;
    }

    const store = d?.store || 'Comprovante';
    const totalBr = totalNumber.toFixed(2).replace('.', ',');
    const dateIso = brDateToIso(dateBr) || new Date().toISOString().slice(0, 10);

    const inferred = inferReceiptCategory(rawText);
    const inferredCategoryDesp = inferred?.categoryDesp || 'outros_desp';
    const inferredSubcategoryDesp = inferred?.subcategoryDesp || 'Outros';

    appendMessage({
      id: `assistant-ocr-preview-${Date.now()}`,
      from: 'assistant',
      kind: 'text',
      text: `Pronto! Eu reconheci o comprovante.\nValor: R$ ${totalBr}${dateBr ? `\nData: ${dateBr}` : ''}`,
      action: {
        iconName: 'add-circle-outline',
        label: `Cadastrar Despesa\nR$ ${totalBr}${dateBr ? ` ${dateBr}` : ''}`,
        type: 'despesa',
        params: {
          amount: totalNumber.toFixed(2).replace('.', ','),
          description: store,
          categoryDesp: inferredCategoryDesp,
          subcategoryDesp: inferredSubcategoryDesp,
          date: dateBr || null,
          __fromReceiptOCR: true,
          __autoCategorizeFromDescription: true,
          __amountNumber: totalNumber,
          __dateIso: dateIso,
          __categoryKey: inferredSubcategoryDesp || inferredCategoryDesp,
        },
      },
      createdAt: nowIso(),
    });
  };

  const handleUserContent = async ({ kind, text, imageUri, imageBase64, skipUserBubble = false, hideTranscriptInChat = false, recordedAt = null }) => {
    const baseId = Date.now();
    const normalizedText = typeof text === 'string' ? text.trim() : '';
    const filteredText = kind === 'voice' ? cleanTranscriptText(normalizedText) : normalizedText;
    if (!skipUserBubble) {
      appendMessage({
        id: `user-${baseId}`,
        from: 'user',
        kind,
        text: hideTranscriptInChat ? '' : (normalizedText || ''),
        imageUri,
        createdAt: nowIso(),
      });
    }
    if (kind === 'image' && imageUri) {
      setProcessingImage(true);
      const loadingId = `assistant-loading-${baseId}`;
      appendMessage({
        id: loadingId,
        from: 'assistant',
        kind: 'text',
        text: 'Lendo imagem...',
        createdAt: nowIso(),
      });
      try {
        const receipt = await processReceipt({
          imageUri,
          imageBase64,
          onStage: (stage) => {
            setMessages((prev) => prev.map((m) => (m.id === loadingId ? { ...m, text: 'Lendo imagem...' } : m)));
          },
        });
        setMessages((prev) => prev.filter((m) => m.id !== loadingId));
        if (receipt.success) {
          await registerExpenseFromImageAndReply(receipt);
        } else {
          appendMessage({
            id: `assistant-ocr-failed-${Date.now()}`,
            from: 'assistant',
            kind: 'text',
            text: 'Não consegui extrair valor e data desta nota. Verifique se a chave API está configurada e se a imagem está legível.',
            actions: [{ label: 'Tentar novamente', actionType: 'retryOcr' }],
            ocrFailMeta: {
              imageUri,
              imageBase64,
            },
            createdAt: nowIso(),
          });
        }
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== loadingId));
        appendMessage({
          id: `assistant-ocr-error-${Date.now()}`,
          from: 'assistant',
          kind: 'text',
          text: `Não consegui ler essa imagem. ${err?.message ? `Erro: ${err.message}` : 'Tente outra foto mais nítida.'}`,
          createdAt: nowIso(),
        });
      } finally {
        setProcessingImage(false);
      }
      return;
    }
    if (kind === 'voice' || kind === 'text') {
      const intent = parseVoiceIntent(filteredText);

      if (intent?.type === 'agenda') {
        appendMessage({
          id: `assistant-intent-${Date.now()}`,
          from: 'assistant',
          kind: 'text',
          text: `${buildIntentSummary(intent)} Toque em "CADASTRAR" para abrir o formulário preenchido.`,
          action: {
            label: 'CADASTRAR',
            type: intent.type,
            params: { initialData: intent.params || {} },
          },
          createdAt: nowIso(),
        });
        return;
      }
      if (intent?.type === 'receita') {
        appendMessage({
          id: `assistant-intent-${Date.now()}`,
          from: 'assistant',
          kind: 'text',
          text: `${buildIntentSummary(intent)} Toque em "CADASTRAR" para abrir o formulário preenchido.`,
          action: {
            label: 'CADASTRAR',
            type: intent.type,
            params: intent.params || null,
          },
          createdAt: nowIso(),
        });
        return;
      }
      if (intent?.type && intent.type !== 'despesa') {
        appendMessage({
          id: `assistant-intent-${Date.now()}`,
          from: 'assistant',
          kind: 'text',
          text: `${buildIntentSummary(intent)} Toque em "CADASTRAR" para abrir o formulário preenchido.`,
          action: {
            label: 'CADASTRAR',
            type: intent.type,
            params: intent.params || null,
          },
          createdAt: nowIso(),
        });
        return;
      }

      const recorded = kind === 'voice' ? (recordedAt || new Date()) : new Date();
      const preview = buildExpenseVoicePreview(filteredText, recorded);

      if (kind === 'voice') {
        if (preview) {
          const modalParams = { ...preview.modalParams };
          if (intent?.type === 'despesa' && intent.params?.categoryDesp) {
            modalParams.categoryDesp = intent.params.categoryDesp;
            modalParams.subcategoryDesp = intent.params.subcategoryDesp || modalParams.subcategoryDesp;
          }
          appendMessage({
            id: `assistant-voice-preview-${Date.now()}`,
            from: 'assistant',
            kind: 'text',
            text: preview.summaryText,
            action: {
              label: 'CADASTRAR',
              type: 'despesa',
              params: modalParams,
            },
            createdAt: nowIso(),
          });
          return;
        }
        appendMessage({
          id: `assistant-voice-no-val-${Date.now()}`,
          from: 'assistant',
          kind: 'text',
          text: 'Não identifiquei um valor no áudio. Inclua o valor (ex.: “cinquenta reais” ou “50,00”) ou digite na caixa acima e envie.',
          createdAt: nowIso(),
        });
        return;
      }

      if (preview && (intent?.type === 'despesa' || /\b(gastei|gastar|gasto|paguei|despesa|compr[ea][iu]?|compra|acabei)\b/i.test(filteredText))) {
        const modalParams = { ...preview.modalParams };
        if (intent?.type === 'despesa' && intent.params?.categoryDesp) {
          modalParams.categoryDesp = intent.params.categoryDesp;
          modalParams.subcategoryDesp = intent.params.subcategoryDesp || modalParams.subcategoryDesp;
        }
        appendMessage({
          id: `assistant-text-preview-${Date.now()}`,
          from: 'assistant',
          kind: 'text',
          text: preview.summaryText,
          action: {
            label: 'CADASTRAR',
            type: 'despesa',
            params: modalParams,
          },
          createdAt: nowIso(),
        });
        return;
      }
      if (intent?.type === 'despesa') {
        appendMessage({
          id: `assistant-intent-${Date.now()}`,
          from: 'assistant',
          kind: 'text',
          text: `${buildIntentSummary(intent)} Toque em "CADASTRAR" para abrir o formulário preenchido.`,
          action: {
            label: 'CADASTRAR',
            type: intent.type,
            params: intent.params || null,
          },
          createdAt: nowIso(),
        });
        return;
      }
    }
    await registerExpenseAndReply(filteredText, kind === 'voice' ? 'áudio' : 'texto');
  };

  useEffect(() => {
    handleUserContentRef.current = handleUserContent;
  }, [handleUserContent]);

  // Quando a despesa for criada fora do chat (ex.: pelo Scanner de comprovante),
  // adiciona uma mensagem no histórico do "Meus gastos".
  useEffect(() => {
    if (!transactions?.length) return;
    const first = transactions[0];
    if (!first?.id) return;

    if (lastTxIdRef.current == null) {
      lastTxIdRef.current = first.id;
      return;
    }
    if (lastTxIdRef.current === first.id) return;
    lastTxIdRef.current = first.id;

    const s = suppressAssistantMessageRef.current;
    if (
      s &&
      Date.now() < s.expiresAt &&
      first.type === 'expense' &&
      first.description === s.description &&
      first.date === s.date &&
      Math.abs(Number(first.amount || 0) - Number(s.amount || 0)) < 0.01
    ) return;

    const pr = receiptAddCandidateRef.current;
    if (
      pr &&
      Date.now() < pr.expiresAt &&
      first.type === 'expense' &&
      Math.abs(Number(first.amount || 0) - Number(pr.amountNumber || 0)) < 0.01 &&
      (!pr.dateIso || first.date === pr.dateIso) &&
      true
    ) {
      const amountStr = Number(first.amount || 0).toFixed(2).replace('.', ',');
      appendMessage({
        id: `assistant-tx-ocr-${Date.now()}`,
        from: 'assistant',
        kind: 'text',
        text: `Despesa adicionada via comprovante: ${first.description || 'Gasto'} · R$ ${amountStr}.`,
        createdAt: nowIso(),
      });
      receiptAddCandidateRef.current = null;
    }
  }, [transactions]);

  const handleSendText = async () => {
    const txt = inputText.trim();
    if (!txt) return;
    playTapSound();
    setInputText('');
    await handleUserContent({ kind: 'text', text: txt });
  };

  const pickImageFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permissão', 'Permita acesso às fotos para enviar comprovantes.');
        return;
      }
      // allowsEditing + allowsMultipleSelection juntos quebram em vários Android/iOS
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
        allowsMultipleSelection: true,
        base64: true,
      });
      if (result.canceled || !result.assets?.length) return;
      for (const asset of result.assets) {
        if (asset?.uri) await handleUserContent({ kind: 'image', imageUri: asset.uri, imageBase64: asset.base64 });
      }
    } catch (e) {
      console.warn('Galeria', e);
      Alert.alert('Galeria', e?.message || 'Não foi possível abrir a galeria. Tente de novo.');
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permissão', 'Permita acesso à câmera para tirar foto da notinha.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85,
        allowsEditing: true,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      await handleUserContent({ kind: 'image', imageUri: result.assets[0].uri, imageBase64: result.assets[0].base64 });
    } catch (e) {
      console.warn('Câmera', e);
      Alert.alert('Câmera', e?.message || 'Não foi possível abrir a câmera. Tente de novo.');
    }
  };

  /** Fechar o modal e só então abrir o picker evita falha silenciosa (iOS/Android ao empilhar modais). */
  const runImagePickerAfterModalClose = (fn) => {
    setCameraChoiceVisible(false);
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        Promise.resolve(fn()).catch(() => {});
      }, 320);
    });
  };

  const openCameraChoice = () => {
    // Mantemos para quem quiser usar em outro lugar, mas no input principal vamos direto.
    playTapSound();
    setCameraChoiceVisible(true);
  };

  const dismissInputKeyboard = () => {
    try {
      inputRef.current?.blur?.();
      Keyboard.dismiss();
    } catch (_) {}
  };

  const handleMicPress = async () => {
    if (processingVoice) return;
    if (pendingVoiceText) {
      dismissInputKeyboard();
      setPendingVoiceText('');
      setInputText('');
      await voiceActionsRef.current.startListening?.();
      return;
    }
    if (isListening) await voiceActionsRef.current.stopListening?.();
    else {
      dismissInputKeyboard();
      setPendingVoiceText('');
      setInputText('');
      await voiceActionsRef.current.startListening?.();
    }
  };

  const handleListeningChange = (v) => {
    const prev = listeningPrevRef.current;
    listeningPrevRef.current = v;
    isListeningRef.current = v;
    if (v && !prev) playVoiceRecordingStartSound();
    else if (!v && prev) playVoiceRecordingStopSound();
    setIsListening(v);
  };

  const handleSendPendingVoice = async () => {
    const content = pendingVoiceText.trim();
    if (!content) return;
    playTapSound();
    setProcessingVoice(true);
    setPendingVoiceText('');
    setInputText('');
    try {
      await handleUserContent({
        kind: 'voice',
        text: content,
        skipUserBubble: false,
        hideTranscriptInChat: false,
        recordedAt: voiceRecordedAtRef.current || new Date(),
      });
    } finally {
      setProcessingVoice(false);
    }
  };

  const handleUnifiedSend = async () => {
    if (processingImage || processingVoice) return;
    if (pendingVoiceText.trim()) await handleSendPendingVoice();
    else await handleSendText();
  };

  const renderMsg = ({ item }) => {
    const isUser = item.from === 'user';
    return (
      <View style={[s.msgRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
        <View
          style={[
            s.msgBubble,
            {
              backgroundColor: isUser ? colors.primary : colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {item.kind === 'image' && item.imageUri ? (
            <TouchableOpacity activeOpacity={0.8} onPress={() => setPreviewImageUri(item.imageUri)}>
              <Image
                source={{ uri: item.imageUri }}
                style={s.msgImage}
                resizeMode="cover"
                onError={() => {}}
              />
            </TouchableOpacity>
          ) : null}
          {item.text ? (
            <Text style={{ color: isUser ? '#fff' : colors.text, fontSize: 14 }}>{item.text}</Text>
          ) : null}
          {!isUser && item.actions?.length ? (
            <View style={{ marginTop: 8, gap: 8 }}>
              {item.actions.map((a, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.actionBtn, { backgroundColor: colors.primaryRgba(0.18), borderColor: colors.primary + '66' }]}
                  onPress={() => handleOcrRetryAction(item, a.actionType)}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : !isUser && item.action?.label ? (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.primaryRgba(0.18), borderColor: colors.primary + '66' }]}
              onPress={() => openSuggestedForm(item.action)}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {item.action?.iconName ? (
                  <Ionicons name={item.action.iconName} size={16} color={colors.primary} />
                ) : null}
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>{item.action.label}</Text>
              </View>
            </TouchableOpacity>
          ) : null}
          <Text style={{ color: isUser ? 'rgba(255,255,255,0.85)' : colors.textSecondary, fontSize: 10, marginTop: 6, textAlign: 'right' }}>
            {formatBrDate(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  // No nativo (Expo Go), não empurre o input para cima: a própria tab bar já ocupa espaço.
  // Mantemos lift apenas no web mobile (dock fixo).
  const mobileBottomLift = mobileBottomDock && !embedded && Platform.OS === 'web' ? 40 : 0;
  const listBottomPad = webDesktopFixedInput ? 120 : 18 + (mobileBottomDock ? (mobileTabbarReserve + 84 + mobileBottomLift) : 0);
  const kavStyle = {
    flex: 1,
    minHeight: 0,
    ...(webDesktopFixedInput ? { overflow: 'hidden' } : {}),
  };
  const inputPadBottom =
    (Platform.OS === 'ios' ? 14 : Platform.OS === 'web' ? Math.max(insets.bottom, 10) : 8) + mobileBottomLift;

  const chatMain = (
    <View style={s.chatMainColumn}>
        {embedded ? (
          <ScrollView
            ref={listRef}
            style={{ flex: 1, minHeight: 0 }}
            contentContainerStyle={{ padding: 12, paddingBottom: listBottomPad }}
            showsVerticalScrollIndicator
            persistentScrollbar
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
          >
            {orderedMessages.map((item) => (
              <View key={item.id}>{renderMsg({ item })}</View>
            ))}
          </ScrollView>
        ) : (
          <FlatList
            ref={listRef}
            data={orderedMessages}
            keyExtractor={(m) => m.id}
            renderItem={renderMsg}
            contentContainerStyle={{ padding: 12, paddingBottom: listBottomPad }}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            style={{ flex: 1, minHeight: 0 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
          />
        )}

        <View
          style={[
            s.inputRow,
            embeddedMobileStackInputs && s.inputRowEmbeddedMobile,
            {
              borderTopColor: colors.border,
              backgroundColor: (embedded || transparentBg) ? 'transparent' : colors.bg,
              borderTopWidth: embedded ? 0 : 1,
              paddingHorizontal: (embedded || transparentBg) ? 20 : 12,
              paddingBottom: webDesktopFixedInput ? Math.max(insets.bottom, 12) : inputPadBottom,
              marginBottom: mobileBottomDock ? (mobileTabbarReserve + mobileBottomLift) : 0,
            },
            webDesktopFixedInput && {
              position: 'fixed',
              left: 0,
              right: WEB_DESKTOP_RIGHT_GUTTER,
              bottom: Math.max(insets.bottom, 12),
              zIndex: 100,
              ...(Platform.OS === 'web'
                ? { boxShadow: '0 -10px 28px rgba(0,0,0,0.22)' }
                : {}),
            },
          ]}
        >
          {(isListening || processingVoice) ? (
            <View style={[s.voiceStatusBadge, { backgroundColor: isListening ? colors.primaryRgba(0.2) : colors.primaryRgba(0.12), borderColor: colors.primary + '66' }]}>
              <View style={[s.voiceDot, { backgroundColor: isListening ? '#ef4444' : colors.primary }]} />
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
                {isListening
                  ? `Gravando${voiceEngine === 'native' ? ' (voz nativa)' : voiceEngine === 'expo' ? ' (compatível)' : ''}...`
                  : 'Analisando áudio...'}
              </Text>
            </View>
          ) : null}
          <VoiceRecorder
            onTranscriptChange={(t) => {
              setPendingVoiceText('');
              setInputText(t);
            }}
            onFinalTranscript={async (t) => {
              const content = (t || '').trim();
              if (!content) return;
              voiceRecordedAtRef.current = new Date();
              setPendingVoiceText(content);
              setInputText(content);
            }}
            onListeningChange={handleListeningChange}
            onEngineChange={setVoiceEngine}
            onError={(message) => {
              if (!message) return;
              // Nativo: erros transitórios enquanto o microfone já está a gravar/transcrever não devem aparecer no chat.
              if (Platform.OS !== 'web' && isListeningRef.current) return;
              appendMessage({
                id: `assistant-voice-error-${Date.now()}`,
                from: 'assistant',
                kind: 'text',
                text: `${message} Toque na caixa de texto abaixo e tente novamente.`,
                createdAt: nowIso(),
              });
            }}
          >
            {(voice) => {
              voiceActionsRef.current = {
                startListening: voice.startListening,
                stopListening: voice.stopListening,
              };
              return null;
            }}
          </VoiceRecorder>
          <View style={[s.inputWithActionsRow, embeddedMobileStackInputs && s.inputWithActionsRowEmbeddedMobile]}>
            <TextInput
              ref={inputRef}
              style={[
                s.input,
                embeddedMobileStackInputs ? s.inputEmbeddedMobile : s.inputInRow,
                (embedded || transparentBg)
                  ? { backgroundColor: 'transparent', borderWidth: 0, color: colors.text, borderRadius: 0 }
                  : { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
              ]}
              placeholder={
                processingImage ? 'Lendo imagem...' : processingVoice ? 'Analisando fala...' : 'Digite aqui'
              }
              placeholderTextColor={colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              editable={!processingImage && !processingVoice}
              onSubmitEditing={handleUnifiedSend}
              returnKeyType="send"
            />
            <View
              style={[
                s.inputActionsRow,
                embeddedMobileStackInputs && s.inputActionsRowEmbeddedMobile,
                embeddedMobileStackInputs && { borderTopColor: colors.border },
              ]}
            >
              <TouchableOpacity
                onPress={openCameraChoice}
                style={[
                  s.actionIconBtn,
                  (embedded || transparentBg)
                    ? { backgroundColor: 'transparent', borderWidth: 0 }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                accessibilityLabel="Enviar comprovante"
              >
                <Ionicons name="camera-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleMicPress}
                style={[
                  s.actionIconBtn,
                  (embedded || transparentBg)
                    ? { backgroundColor: isListening ? colors.primary : 'transparent', borderWidth: 0 }
                    : { backgroundColor: isListening ? colors.primary : colors.card, borderColor: colors.border },
                ]}
                accessibilityLabel={isListening ? 'Parar gravação' : pendingVoiceText ? 'Gravar de novo' : 'Gravar áudio'}
              >
                <Ionicons name={isListening ? 'stop' : 'mic-outline'} size={22} color={isListening ? '#fff' : colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUnifiedSend}
                style={[s.actionIconBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                disabled={processingImage || processingVoice}
                accessibilityLabel="Enviar"
              >
                <Ionicons name="send" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
    </View>
  );

  return (
    <View style={[s.container, embedded && s.embeddedContainer]}>
      {Platform.OS === 'web' ? (
        <View style={kavStyle}>{chatMain}</View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
          style={kavStyle}
        >
          {chatMain}
        </KeyboardAvoidingView>
      )}

      <Modal visible={cameraChoiceVisible} transparent animationType="fade">
        <View style={s.cameraChoiceOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setCameraChoiceVisible(false)} />
          <View style={[s.cameraChoiceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 14, textAlign: 'center' }}>
              Enviar comprovante
            </Text>
            <TouchableOpacity
              style={[s.cameraChoiceBtn, { backgroundColor: colors.primaryRgba(0.15), borderColor: colors.primary + '55' }]}
              onPress={() => {
                playTapSound();
                runImagePickerAfterModalClose(takePhotoWithCamera);
              }}
            >
              <Ionicons name="camera-outline" size={24} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '700', marginLeft: 10 }}>Tirar foto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.cameraChoiceBtn, { backgroundColor: colors.primaryRgba(0.08), borderColor: colors.border }]}
              onPress={() => {
                playTapSound();
                runImagePickerAfterModalClose(pickImageFromGallery);
              }}
            >
              <Ionicons name="images-outline" size={24} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginLeft: 10 }}>Buscar na galeria</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCameraChoiceVisible(false)} style={{ marginTop: 10, paddingVertical: 8 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!previewImageUri} transparent animationType="fade">
        <View style={s.previewOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPreviewImageUri(null)} />
          <View style={s.previewCard}>
            <TouchableOpacity
              onPress={() => setPreviewImageUri(null)}
              style={[s.previewCloseBtn, { backgroundColor: colors.primaryRgba(0.25) }]}
            >
              <Ionicons name="close" size={22} color={colors.primary} />
            </TouchableOpacity>
            {previewImageUri ? (
              <Image source={{ uri: previewImageUri }} style={s.previewImage} resizeMode="contain" />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, minHeight: 0, minWidth: 0 },
  embeddedContainer: { minHeight: 0 },
  /** Lista + faixa de entrada em coluna (fixa botões na base no card mobile) */
  chatMainColumn: { flex: 1, minHeight: 0, minWidth: 0, flexDirection: 'column' },
  msgRow: { flexDirection: 'row', marginVertical: 4 },
  msgBubble: {
    maxWidth: '82%',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  msgImage: { width: 180, height: 140, borderRadius: 10, marginBottom: 8 },
  actionBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    flexShrink: 0,
  },
  inputRowEmbeddedMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    flexWrap: 'nowrap',
    justifyContent: 'flex-end',
  },
  voiceStatusBadge: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 2,
  },
  voiceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  inputFullWidth: { width: '100%', flexBasis: '100%' },
  inputWithActionsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  inputWithActionsRowEmbeddedMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
    minHeight: 0,
  },
  inputInRow: {
    flex: 1,
    minWidth: 0,
  },
  inputEmbeddedMobile: {
    width: '100%',
    flex: 0,
    minWidth: 0,
  },
  inputActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  inputActionsRowEmbeddedMobile: {
    justifyContent: 'flex-end',
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    width: '100%',
  },
  actionIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cameraChoiceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cameraChoiceCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  cameraChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  actionRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  secondaryBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  previewCard: {
    width: '100%',
    height: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewCloseBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 3,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

