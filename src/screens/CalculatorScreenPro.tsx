/**
 * Calculadora profissional - Suporta expressões completas
 * Ex: 10 + 5 * 3 - 2 / 4, parênteses, %
 */

import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, Modal, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { playTapSound } from '../utils/sounds';
import { calculateExpression, CALC_ERROR } from '../utils/calculator';
import { formatCurrency } from '../utils/formatter';
import { Ionicons } from '@expo/vector-icons';

const win = Dimensions.get('window');
const SW = win.width;
const SH = win.height;
const logoImage = require('../../assets/logo.png');

/** Cores padrão quando fundo é escuro */
const DARK_STYLE = { numBtn: '#333333', opBtn: '#FE9500', funcBtn: '#A5A5A5' };

interface Props {
  onClose?: () => void;
  isModal?: boolean;
  compact?: boolean;
  onExpand?: () => void;
  onMinimize?: () => void;
  showCurrency?: boolean;
  expression?: string;
  result?: string | null;
  history?: Array<{ expression: string; result: string; createdAt: number }>;
  onExpressionChange?: React.Dispatch<React.SetStateAction<string>>;
  onResultChange?: React.Dispatch<React.SetStateAction<string | null>>;
  onHistoryChange?: React.Dispatch<React.SetStateAction<Array<{ expression: string; result: string; createdAt: number }>>>;
}

export function CalculatorScreenPro({
  onClose,
  isModal,
  compact,
  onExpand,
  onMinimize,
  showCurrency = false,
  expression: controlledExpression,
  result: controlledResult,
  history = [],
  onExpressionChange,
  onResultChange,
  onHistoryChange,
}: Props) {
  const { colors } = useTheme();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [internalExpression, setInternalExpression] = useState('');
  const [internalResult, setInternalResult] = useState<string | null>(null);
  const [internalHistory, setInternalHistory] = useState<Array<{ expression: string; result: string; createdAt: number }>>([]);
  const [lastWasEquals, setLastWasEquals] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const lastEqualsResultRef = useRef<string | null>(null);
  const expression = controlledExpression ?? internalExpression;
  const result = controlledResult !== undefined ? controlledResult : internalResult;
  const calcHistory = onHistoryChange ? history : internalHistory;
  const setExpression = useCallback((next: React.SetStateAction<string>) => {
    if (onExpressionChange) {
      onExpressionChange(next);
      return;
    }
    setInternalExpression(next);
  }, [onExpressionChange]);
  const setResult = useCallback((next: React.SetStateAction<string | null>) => {
    if (onResultChange) {
      onResultChange(next);
      return;
    }
    setInternalResult(next);
  }, [onResultChange]);
  const setHistory = useCallback((next: React.SetStateAction<Array<{ expression: string; result: string; createdAt: number }>>) => {
    if (onHistoryChange) {
      onHistoryChange(next);
      return;
    }
    setInternalHistory(next);
  }, [onHistoryChange]);

  const isWeb = Platform.OS === 'web';
  const calcViewportW = isWeb ? screenW : SW;
  const calcViewportH = isWeb ? screenH : SH;
  const scale = compact ? 0.65 : 1;
  const SIDE_PAD = compact ? 8 : (isWeb ? 16 : Math.max(16, Math.min(24, SW * 0.04)));
  const BOTTOM_PAD = Math.max(20, Math.min(32, calcViewportH * 0.03));
  const DISPLAY_PAD_BOTTOM = compact ? 16 : (isWeb ? 14 : Math.max(20, SH * 0.02));
  const PAD_TOP_MARGIN = compact ? 22 : (isWeb ? 12 : Math.max(18, calcViewportH * 0.02));
  const BTN_GAP = compact ? 6 : (isWeb ? 8 : Math.max(9, Math.min(12, SW * 0.03)));
  const BTN_SIZE = compact
    ? Math.round(52 * scale)
    : Math.round(
        isWeb
          ? Math.min(96, (calcViewportW - SIDE_PAD * 2 - BTN_GAP * 3) / 4)
          : (SW - SIDE_PAD * 2 - BTN_GAP * 3) / 4
      );
  // Antes usávamos um "gutter" grande para evitar sobreposição com botões do topo.
  // Agora os visores ficam abaixo do cabeçalho no compact, então não precisa empurrar o texto pra esquerda.
  const HEADER_RIGHT_GUTTER = 0;

  const isOperator = (char: string) => ['+', '-', '*', '/'].includes(char);

  const appendHistory = useCallback((expr: string, calc: string) => {
    const cleanedExpr = expr.trim();
    if (!cleanedExpr || calc === CALC_ERROR) return;
    setHistory((prev) => {
      const next = [{ expression: cleanedExpr, result: calc, createdAt: Date.now() }, ...prev];
      return next.slice(0, 20);
    });
  }, [setHistory]);

  const handlePress = useCallback((char: string) => {
    playTapSound();
    if (isOperator(char)) {
      setExpression((prev) => {
        const safePrev = prev.trim();
        const base = lastWasEquals ? (result || lastEqualsResultRef.current || safePrev) : safePrev;
        if (!base) return '';
        if (/[+\-*/.,]$/.test(base)) return base.replace(/[+\-*/.,]$/, char);
        return base + char;
      });
      setLastWasEquals(false);
      setResult(null);
      return;
    }
    setExpression((prev) => {
      const decimalChar = char === '.' || char === ',';
      if (lastWasEquals) {
        const first = decimalChar ? '0,' : char;
        return first;
      }
      const toAppend = decimalChar ? ',' : char;
      const next = prev + toAppend;
      return next.length <= 100 ? next : prev;
    });
    setLastWasEquals(false);
    setResult(null);
  }, [lastWasEquals, result, setExpression, setResult]);

  const handleEquals = useCallback(() => {
    playTapSound();
    const rawExpression = expression.trim();
    if (!rawExpression) return;

    const calc = calculateExpression(rawExpression);
    if (calc !== CALC_ERROR) {
      appendHistory(rawExpression, calc);
      lastEqualsResultRef.current = calc;
      setExpression(calc);
      setResult(calc);
      setLastWasEquals(true);
      return;
    }

    // Se terminar com operador, tenta calcular apenas a parte válida (ex.: "1+2+" => "1+2")
    const fallbackExpression = rawExpression.replace(/[+\-*/%,.\s]+$/g, '');
    if (fallbackExpression && fallbackExpression !== rawExpression) {
      const fallbackCalc = calculateExpression(fallbackExpression);
      if (fallbackCalc !== CALC_ERROR) {
        appendHistory(fallbackExpression, fallbackCalc);
        lastEqualsResultRef.current = fallbackCalc;
        setExpression(fallbackCalc);
        setResult(fallbackCalc);
        setLastWasEquals(true);
        return;
      }
    }

    // Mantém último resultado válido em vez de forçar "Erro" na UI
    if (result && result !== CALC_ERROR) return;
    setResult(CALC_ERROR);
  }, [appendHistory, expression, result, setExpression, setResult]);

  const handleClear = useCallback(() => {
    playTapSound();
    setExpression('');
    setResult(null);
    setLastWasEquals(false);
    lastEqualsResultRef.current = null;
  }, []);

  const handleBackspace = useCallback(() => {
    playTapSound();
    setExpression((prev) => prev.slice(0, -1));
    setLastWasEquals(false);
    setResult(null);
  }, []);

  const handlePercent = useCallback(() => {
    playTapSound();
    setExpression((prev) => {
      const source = (lastWasEquals && (result || lastEqualsResultRef.current)) ? (result || lastEqualsResultRef.current) : prev;
      const trimmed = String(source || '').trim();
      if (!trimmed || /[+\-*\/%.,]$/.test(trimmed)) return prev;
      if (trimmed.endsWith('%')) return prev;
      return trimmed + '%';
    });
    setLastWasEquals(false);
    setResult(null);
  }, [lastWasEquals, result]);

  const handlePlusMinus = useCallback(() => {
    playTapSound();
    if (lastWasEquals && (result || lastEqualsResultRef.current)) {
      const val = result || lastEqualsResultRef.current || '0';
      if (val === CALC_ERROR) return;
      const n = parseFloat(String(val).replace(',', '.'));
      if (!Number.isFinite(n)) return;
      const next = n === 0 ? '0' : String(-n).replace('.', ',');
      setExpression(next);
      setResult(next);
      lastEqualsResultRef.current = next;
      return;
    }
    setExpression((prev) => {
      const trimmed = String(prev || '').trim();
      if (!trimmed) return '-';
      if (/^\-$/.test(trimmed)) return '';
      const lastNumMatch = trimmed.match(/([+\-*\/]\s*)?([\-]?\d+[.,]?\d*)$/);
      if (lastNumMatch) {
        const numStr = lastNumMatch[2]!.replace(',', '.');
        const n = parseFloat(numStr);
        if (!Number.isFinite(n)) return prev;
        const negated = String(-n).replace('.', ',');
        const prefix = trimmed.slice(0, trimmed.length - (lastNumMatch[2]?.length || 0));
        return prefix + (negated.startsWith('-') ? negated : '+' + negated);
      }
      const n = parseFloat(trimmed.replace(',', '.'));
      if (Number.isFinite(n) && !trimmed.match(/[+\-*\/]/)) {
        return String(-n).replace('.', ',');
      }
      return prev;
    });
    setLastWasEquals(false);
    setResult(null);
  }, [lastWasEquals, result, setExpression, setResult]);

  const displayExpr = expression || '0';
  const displayResult = result ?? '';
  const sumLineText = React.useMemo(() => {
    const raw = String(displayExpr || '').trim();
    // Sempre visível: mostra a expressão (mesmo sem operador)
    return (raw || '0').replace(/\*/g, '×').replace(/\//g, '÷');
  }, [displayExpr]);
  const topValueText = React.useMemo(() => {
    if (lastWasEquals && (displayResult || lastEqualsResultRef.current) && (displayResult || lastEqualsResultRef.current) !== CALC_ERROR) {
      return String(displayResult || lastEqualsResultRef.current);
    }
    const raw = String(displayExpr || '').trim();
    if (!raw) return '0';
    // Se a expressão termina com operador, mantém o último número visível no visor
    const stripped = raw.replace(/[+\-*/%\s.,]+$/g, '');
    const source = stripped.length ? stripped : raw;
    const lastNum = source.match(/-?\d+(?:[.,]\d*)?$/)?.[0];
    return lastNum && lastNum.length ? lastNum : '0';
  }, [displayExpr, displayResult, lastWasEquals]);

  const isDark = colors.text === '#f9fafb';
  const numBtn = isDark ? DARK_STYLE.numBtn : colors.card;
  const opBtn = colors.primary;
  const funcBtn = isDark ? DARK_STYLE.funcBtn : colors.textSecondary + '40';
  const btnTextColor = (t: 'num' | 'op' | 'func') => (t === 'num' ? colors.text : t === 'op' ? '#fff' : colors.text);

  const Btn = ({
    label,
    onPress,
    type = 'num',
  }: {
    label: string;
    onPress: () => void;
    type?: 'num' | 'op' | 'func';
  }) => {
    const bg = type === 'op' ? opBtn : type === 'func' ? funcBtn : numBtn;
    const fontSize =
      type === 'op'
        ? (compact ? 22 : (isWeb ? 24 : 30))
        : (type === 'func' ? (compact ? 18 : (isWeb ? 20 : 24)) : (compact ? 18 : (isWeb ? 20 : 24)));
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.6}
        style={[
          styles.btn,
          {
            width: BTN_SIZE,
            height: BTN_SIZE,
            borderRadius: BTN_SIZE / 2,
            backgroundColor: bg,
          },
        ]}
      >
        <Text style={[styles.btnText, { color: type === 'op' ? '#fff' : btnTextColor(type), fontSize }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          paddingHorizontal: compact ? 8 : SIDE_PAD,
          maxWidth: isWeb ? (compact ? 460 : undefined) : undefined,
          alignSelf: isWeb ? (compact ? 'center' : 'stretch') : 'auto',
          width: '100%',
        },
      ]}
    >
      <View style={[styles.headerBtnsWrap, { pointerEvents: 'box-none' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => { playTapSound(); setShowHistoryModal(true); }}
            style={styles.historyBtn}
            hitSlop={18}
            activeOpacity={0.7}
            accessibilityLabel="Histórico"
          >
            <Ionicons name="time-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {(onExpand || onMinimize) && (
            <TouchableOpacity
              onPress={() => { playTapSound(); compact ? onExpand?.() : onMinimize?.(); }}
              style={styles.modeBtn}
              hitSlop={18}
              activeOpacity={0.7}
              accessibilityLabel={compact ? 'Tela cheia' : 'Minimizar'}
            >
              <Ionicons name={compact ? 'expand' : 'contract'} size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {isModal && onClose && (
            <TouchableOpacity
              onPress={() => { playTapSound(); onClose(); }}
              style={styles.closeBtn}
              hitSlop={18}
              activeOpacity={0.7}
              accessibilityLabel="Fechar"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!compact && (
        <View style={styles.logoWrap}>
          <Image
            source={logoImage}
            style={[styles.logo, { width: Math.min(120, calcViewportW * 0.3), height: Math.min(120, calcViewportW * 0.3) }]}
            resizeMode="contain"
          />
        </View>
      )}

      <View style={[
        styles.displayWrap,
        {
          paddingTop: compact ? 8 : (isWeb ? 10 : 20),
          paddingBottom: DISPLAY_PAD_BOTTOM,
          marginBottom: PAD_TOP_MARGIN,
          minHeight: compact ? 74 : (isWeb ? 104 : Math.max(110, SH * 0.14)),
          paddingRight: undefined,
          marginTop: compact ? 48 : undefined,
        },
      ]}>
        <Text
          style={[
            compact ? styles.compactSumLine : styles.bigSumLine,
            { color: colors.textSecondary },
          ]}
          numberOfLines={1}
          ellipsizeMode="head"
        >
          {sumLineText}
        </Text>
        <Text
          style={[
            compact ? styles.compactTopValue : styles.bigTopValue,
            { color: displayResult === CALC_ERROR ? '#ef4444' : colors.text },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {(showCurrency && topValueText !== CALC_ERROR && !isNaN(Number(topValueText)))
            ? formatCurrency(Number(topValueText))
            : topValueText}
        </Text>
      </View>

      <View style={[styles.pad, !compact && { paddingBottom: BOTTOM_PAD }]}>
        <View style={[styles.row, { gap: BTN_GAP, marginBottom: BTN_GAP, justifyContent: compact ? 'center' : 'space-between' }]}>
          <Btn label="AC" onPress={handleClear} type="func" />
          <Btn label="%" onPress={handlePercent} type="func" />
          <Btn label="÷" onPress={() => handlePress('/')} type="func" />
          <TouchableOpacity
            onPress={handleBackspace}
            activeOpacity={0.6}
            style={[
              styles.btn,
              {
                width: BTN_SIZE,
                height: BTN_SIZE,
                borderRadius: BTN_SIZE / 2,
                backgroundColor: opBtn,
              },
            ]}
          >
            <Ionicons name="backspace-outline" size={compact ? 18 : 22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={[styles.row, { gap: BTN_GAP, marginBottom: BTN_GAP, justifyContent: compact ? 'center' : 'space-between' }]}>
          <Btn label="7" onPress={() => handlePress('7')} />
          <Btn label="8" onPress={() => handlePress('8')} />
          <Btn label="9" onPress={() => handlePress('9')} />
          <Btn label="×" onPress={() => handlePress('*')} type="op" />
        </View>
        <View style={[styles.row, { gap: BTN_GAP, marginBottom: BTN_GAP, justifyContent: compact ? 'center' : 'space-between' }]}>
          <Btn label="4" onPress={() => handlePress('4')} />
          <Btn label="5" onPress={() => handlePress('5')} />
          <Btn label="6" onPress={() => handlePress('6')} />
          <Btn label="-" onPress={() => handlePress('-')} type="op" />
        </View>
        <View style={[styles.row, { gap: BTN_GAP, marginBottom: BTN_GAP, justifyContent: compact ? 'center' : 'space-between' }]}>
          <Btn label="1" onPress={() => handlePress('1')} />
          <Btn label="2" onPress={() => handlePress('2')} />
          <Btn label="3" onPress={() => handlePress('3')} />
          <Btn label="+" onPress={() => handlePress('+')} type="op" />
        </View>
        <View style={[styles.row, { gap: BTN_GAP, justifyContent: compact ? 'center' : 'space-between' }]}>
          <Btn label="+/-" onPress={handlePlusMinus} type="func" />
          <Btn label="0" onPress={() => handlePress('0')} />
          <Btn label="," onPress={() => handlePress(',')} />
          <Btn label="=" onPress={handleEquals} type="op" />
        </View>
      </View>

      <Modal visible={showHistoryModal} transparent animationType="fade">
          <View style={styles.historyOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowHistoryModal(false)} />
            <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyTitle, { color: colors.text }]}>Histórico (20)</Text>
                <TouchableOpacity onPress={() => { playTapSound(); setShowHistoryModal(false); }}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator>
                {calcHistory.length === 0 ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 14, paddingVertical: 8 }}>Nenhuma conta ainda.</Text>
                ) : calcHistory.map((item, idx) => (
                  <TouchableOpacity
                    key={`${item.createdAt}-${idx}`}
                    onPress={() => {
                      playTapSound();
                      setExpression(item.result);
                      setResult(item.result);
                      lastEqualsResultRef.current = item.result;
                      setLastWasEquals(true);
                      setShowHistoryModal(false);
                    }}
                    activeOpacity={0.7}
                    style={[styles.historyItem, { borderBottomColor: colors.border }]}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {item.expression.replace(/\*/g, '×').replace(/\//g, '÷')}
                    </Text>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 2 }}>
                      = {item.result}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  headerBtnsWrap: { position: 'absolute', top: 0, left: 0, right: 0, height: 52, zIndex: 1000, elevation: 1000, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8 },
  closeBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  modeBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  historyBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  logoWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 56, marginBottom: 16 },
  logo: { width: 170, height: 170 },
  logoCompact: { width: 96, height: 96 },
  displayWrap: { paddingHorizontal: 16, flexShrink: 0, position: 'relative', zIndex: 10, elevation: 10, alignItems: 'flex-end' },
  compactSumLine: { fontSize: 10, fontWeight: '500', textAlign: 'right', width: '100%', marginBottom: 1, marginTop: -2 },
  compactTopValue: { fontSize: 22, fontWeight: '500', textAlign: 'right', width: '100%' },
  bigSumLine: { fontSize: 16, fontWeight: '600', textAlign: 'right', alignSelf: 'flex-end', marginBottom: 6, marginTop: -2 },
  bigTopValue: { fontSize: 52, fontWeight: '300', textAlign: 'right', alignSelf: 'flex-end' },
  expression: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  result: { marginTop: 10, fontWeight: '300', textAlign: 'right' },
  pad: { flex: 1, paddingTop: 8, paddingBottom: 20, justifyContent: 'flex-end', zIndex: 0 },
  row: { flexDirection: 'row', justifyContent: 'center' },
  btn: { justifyContent: 'center', alignItems: 'center' },
  btnText: { fontWeight: '400' },
  backspace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 8 },
  backspaceText: { fontSize: 13 },
  historyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  historyCard: { width: '100%', maxWidth: 420, maxHeight: '70%', borderRadius: 16, borderWidth: 1, padding: 14 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  historyTitle: { fontSize: 16, fontWeight: '700' },
  historyItem: { paddingVertical: 10, borderBottomWidth: 1 },
});
