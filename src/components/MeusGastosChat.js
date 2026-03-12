import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useFinance } from '../contexts/FinanceContext';
import { useMenu } from '../contexts/MenuContext';
import { parseExpenseVoice } from '../utils/voiceExpenseParser';
import { parseVoiceIntent } from '../utils/voiceExpenseParser';
import { CATEGORIAS_DESPESA } from '../constants/categories';
import { playTapSound } from '../utils/sounds';
import VoiceRecorder from './VoiceRecorder';

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
    const moneyTokens = line.match(/\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2})?/g) || [];
    if (!moneyTokens.length) return;
    const lastToken = moneyTokens[moneyTokens.length - 1];
    if (looksLikeDate(lastToken)) return;
    const value = parseMoneyTokenToNumber(lastToken);
    if (!value) return;

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
    const tokens = String(line).match(moneyTokenRegex) || [];
    if (!tokens.length) return [];
    const hasCurrency = /r\s*\$|reais?/i.test(line);
    const noisyLine = noisyCountRegex.test(line);
    const res = [];
    for (const token of tokens) {
      if (looksLikeDate(token)) continue;
      const value = parseMoneyTokenToNumber(token);
      const hasCents = /[.,]\d{2}$/.test(token);
      if (!value || value <= 0) continue;
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
  const allMoneyMatches = String(ocrText).match(/\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2})?/g) || [];
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

async function runOcrFromImage(imageUri) {
  if (!imageUri || typeof imageUri !== 'string') return '';
  const uri = String(imageUri).trim();
  const form = new FormData();
  form.append('apikey', 'helloworld');
  form.append('language', 'por');
  form.append('isOverlayRequired', 'false');
  form.append('scale', 'true');
  form.append('OCREngine', '2');
  form.append('file', {
    uri,
    name: 'gasto.jpg',
    type: 'image/jpeg',
  });
  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const errText = await res.text();
    try {
      const errJson = JSON.parse(errText);
      if (errJson?.ErrorMessage) throw new Error(errJson.ErrorMessage);
    } catch (_) {}
    throw new Error(`OCR API erro ${res.status}`);
  }
  let data;
  try {
    data = await res.json();
  } catch (_) {
    throw new Error('Resposta inválida do OCR');
  }
  const text = (data?.ParsedResults?.[0]?.ParsedText || '').trim();
  if (!text && (data?.IsErroredOnProcessing || data?.OCRExitCode !== 1)) {
    throw new Error('OCR não conseguiu processar a imagem');
  }
  return text;
}

export function MeusGastosChat({ embedded = false }) {
  const { colors } = useTheme();
  const { addTransaction } = useFinance();
  const { openAddModal } = useMenu();
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
  const handleUserContentRef = useRef(null);
  const voiceActionsRef = useRef({ startListening: async () => {}, stopListening: async () => {} });
  const listRef = useRef(null);

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
    openAddModal?.(action.type, action.params || null);
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

  const registerExpenseFromImageAndReply = async (ocrText) => {
    const normalized = String(ocrText || '').trim();
    if (!normalized || normalized.length < 8) {
      appendMessage({
        id: `assistant-ocr-unreadable-${Date.now()}`,
        from: 'assistant',
        kind: 'text',
        text: 'Não consegui ler essa foto com segurança. Não registrei gasto. Tente tirar outra imagem mais nítida.',
        createdAt: nowIso(),
      });
      return;
    }

    const receiptData = extractReceiptDataFromOcr(normalized);
    if (!receiptData?.total) {
      appendMessage({
        id: `assistant-ocr-no-total-${Date.now()}`,
        from: 'assistant',
        kind: 'text',
        text: 'Não encontrei um "TOTAL" legível na notinha. Não registrei gasto para evitar erro.',
        createdAt: nowIso(),
      });
      return;
    }

    const totalBr = receiptData.total.toFixed(2).replace('.', ',');
    const topItems = receiptData.items.slice(0, 4);
    const itemsSummary = topItems.length
      ? topItems.map((it) => `${it.description} (R$ ${it.amount.toFixed(2).replace('.', ',')})`).join(', ')
      : '';

    await registerExpenseAndReply(`total ${totalBr}`, 'comprovante');

    appendMessage({
      id: `assistant-ocr-total-highlight-${Date.now()}`,
      from: 'assistant',
      kind: 'text',
      text: `Total identificado com prioridade: R$ ${totalBr}.${itemsSummary ? ` Itens detectados: ${itemsSummary}.` : ''} Quer que eu registre os produtos comprados também? (opcional)`,
      createdAt: nowIso(),
    });

    if (receiptData.items.length > 0 && receiptData.itemsMismatch) {
      appendMessage({
        id: `assistant-ocr-mismatch-${Date.now()}`,
        from: 'assistant',
        kind: 'text',
        text: `A soma dos itens (${receiptData.itemsSum.toFixed(2).replace('.', ',')}) não fechou com o total (${totalBr}). Se puder, envie mais fotos da nota para eu fechar o pedido corretamente.`,
        createdAt: nowIso(),
      });
    }
  };

  const handleUserContent = async ({ kind, text, imageUri, skipUserBubble = false, hideTranscriptInChat = false }) => {
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
        text: 'Lendo notinha...',
        createdAt: nowIso(),
      });
      try {
        const ocrText = await runOcrFromImage(imageUri);
        setMessages((prev) => prev.filter((m) => m.id !== loadingId));
        await registerExpenseFromImageAndReply(ocrText);
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== loadingId));
        appendMessage({
          id: `assistant-ocr-error-${Date.now()}`,
          from: 'assistant',
          kind: 'text',
          text: 'Não consegui ler essa imagem. Envie outra foto mais nítida ou digite o valor (ex: gastei 50 no mercado).',
          createdAt: nowIso(),
        });
      } finally {
        setProcessingImage(false);
      }
      return;
    }
    if (kind === 'voice' || kind === 'text') {
      const intent = parseVoiceIntent(filteredText);
      if (intent?.type) {
        const params = intent.type === 'agenda'
          ? { initialData: intent.params || {} }
          : (intent.params || null);
        appendMessage({
          id: `assistant-intent-${Date.now()}`,
          from: 'assistant',
          kind: 'text',
          text: `${buildIntentSummary(intent)} Toque em "CADASTRAR" para abrir o formulário preenchido.`,
          action: {
            label: 'CADASTRAR',
            type: intent.type,
            params,
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

  const handleSendText = async () => {
    const txt = inputText.trim();
    if (!txt) return;
    playTapSound();
    setInputText('');
    await handleUserContent({ kind: 'text', text: txt });
  };

  const handlePickImage = async () => {
    playTapSound();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão', 'Permita acesso às fotos para enviar comprovantes.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (result.canceled || !result.assets?.length) return;
    for (const asset of result.assets) {
      if (asset?.uri) await handleUserContent({ kind: 'image', imageUri: asset.uri });
    }
  };

  const handleTakePhoto = async () => {
    playTapSound();
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão', 'Permita acesso à câmera para tirar foto da notinha.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await handleUserContent({ kind: 'image', imageUri: result.assets[0].uri });
  };

  const handleMicPress = async () => {
    playTapSound();
    if (processingVoice) return;
    if (isListening) await voiceActionsRef.current.stopListening?.();
    else {
      setPendingVoiceText('');
      setInputText('');
      await voiceActionsRef.current.startListening?.();
    }
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
        skipUserBubble: true,
        hideTranscriptInChat: true,
      });
    } finally {
      setProcessingVoice(false);
    }
  };

  const handleReRecordVoice = async () => {
    playTapSound();
    setPendingVoiceText('');
    setInputText('');
    await voiceActionsRef.current.startListening?.();
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
          {!isUser && item.action?.label ? (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.primaryRgba(0.18), borderColor: colors.primary + '66' }]}
              onPress={() => openSuggestedForm(item.action)}
              activeOpacity={0.85}
            >
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>{item.action.label}</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={{ color: isUser ? 'rgba(255,255,255,0.85)' : colors.textSecondary, fontSize: 10, marginTop: 6, textAlign: 'right' }}>
            {formatBrDate(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[s.container, embedded && s.embeddedContainer]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0} style={{ flex: 1 }}>
        {embedded ? (
          <ScrollView
            ref={listRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 12, paddingBottom: 18 }}
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
            contentContainerStyle={{ padding: 12, paddingBottom: 18 }}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            style={{ flex: 1 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
          />
        )}

        <View
          style={[
            s.inputRow,
            {
              borderTopColor: colors.border,
              backgroundColor: embedded ? 'transparent' : colors.bg,
              borderTopWidth: embedded ? 0 : 1,
            },
          ]}
        >
          {(isListening || processingVoice) ? (
            <View style={[s.voiceStatusBadge, { backgroundColor: isListening ? colors.primaryRgba(0.2) : colors.primaryRgba(0.12), borderColor: colors.primary + '66' }]}>
              <View style={[s.voiceDot, { backgroundColor: isListening ? '#ef4444' : colors.primary }]} />
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
                {isListening
                  ? `Gravando${voiceEngine === 'expo' ? ' (alternativo)' : ''}...`
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
              setIsListening(false);
              const content = (t || '').trim();
              if (!content) return;
              setPendingVoiceText(content);
              setInputText(content);
            }}
            onListeningChange={setIsListening}
            onEngineChange={setVoiceEngine}
            onError={(message) => {
              setIsListening(false);
              if (!message) return;
              appendMessage({
                id: `assistant-voice-error-${Date.now()}`,
                from: 'assistant',
                kind: 'text',
                text: `${message} Tente novamente. Se não funcionar, use o microfone do teclado como alternativa.`,
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
          <TouchableOpacity
            onPress={handlePickImage}
            style={[s.iconBtn, embedded ? { backgroundColor: 'transparent', borderWidth: 0 } : { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="image-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleTakePhoto}
            style={[s.iconBtn, embedded ? { backgroundColor: 'transparent', borderWidth: 0 } : { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="camera-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleMicPress}
            style={[
              s.iconBtn,
              embedded
                ? { backgroundColor: isListening ? colors.primary : 'transparent', borderWidth: 0 }
                : { backgroundColor: isListening ? colors.primary : colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name={isListening ? 'stop' : 'mic-outline'} size={20} color={isListening ? '#fff' : colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={[
              s.input,
              embedded
                ? { backgroundColor: 'transparent', borderWidth: 0, color: colors.text, borderRadius: 0 }
                : { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
            ]}
            placeholder={
              processingImage
                ? 'Lendo imagem...'
                : processingVoice
                  ? 'Analisando fala...'
                  : isListening
                    ? 'Ouvindo... fale agora'
                    : pendingVoiceText
                      ? 'Áudio pausado. Envie ou regrave.'
                    : 'Ex: fui no mercado e gastei 89,90'
            }
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            editable={!processingImage && !processingVoice && !pendingVoiceText}
            onSubmitEditing={handleSendText}
            returnKeyType="send"
          />
          {pendingVoiceText ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity onPress={handleReRecordVoice} style={[s.secondaryBtn, { borderColor: colors.primary, backgroundColor: 'transparent' }]}>
                <Ionicons name="refresh" size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSendPendingVoice} style={[s.sendBtn, { backgroundColor: colors.primary }]} disabled={processingImage || processingVoice}>
                <Ionicons name="checkmark" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleSendText} style={[s.sendBtn, { backgroundColor: colors.primary }]} disabled={processingImage || processingVoice}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

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
  container: { flex: 1 },
  embeddedContainer: { minHeight: 0 },
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
    paddingBottom: Platform.OS === 'ios' ? 14 : 8,
    borderTopWidth: 1,
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

