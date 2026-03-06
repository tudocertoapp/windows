/**
 * Calculadora profissional - Suporta expressões completas
 * Ex: 10 + 5 * 3 - 2 / 4, parênteses, %
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { playTapSound } from '../utils/sounds';
import { calculateExpression, CALC_ERROR } from '../utils/calculator';
import { formatCurrency } from '../utils/formatter';
import { Ionicons } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');
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
  onExpressionChange?: React.Dispatch<React.SetStateAction<string>>;
  onResultChange?: React.Dispatch<React.SetStateAction<string | null>>;
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
  onExpressionChange,
  onResultChange,
}: Props) {
  const { colors } = useTheme();
  const [internalExpression, setInternalExpression] = useState('');
  const [internalResult, setInternalResult] = useState<string | null>(null);
  const expression = controlledExpression ?? internalExpression;
  const result = controlledResult !== undefined ? controlledResult : internalResult;
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

  const scale = compact ? 0.65 : 1;
  const BTN_SIZE = Math.round((compact ? 52 : Math.min(SW * 0.2, 72)) * scale);
  const BTN_GAP = compact ? 6 : 10;

  const handlePress = useCallback((char: string) => {
    playTapSound();
    setExpression((prev) => {
      const next = prev + char;
      return next.length <= 100 ? next : prev;
    });
    setResult(null);
  }, []);

  const handleEquals = useCallback(() => {
    playTapSound();
    const rawExpression = expression.trim();
    if (!rawExpression) return;

    const calc = calculateExpression(rawExpression);
    if (calc !== CALC_ERROR) {
      setResult(calc);
      return;
    }

    // Se terminar com operador, tenta calcular apenas a parte válida (ex.: "1+2+" => "1+2")
    const fallbackExpression = rawExpression.replace(/[+\-*/%,.\s]+$/g, '');
    if (fallbackExpression && fallbackExpression !== rawExpression) {
      const fallbackCalc = calculateExpression(fallbackExpression);
      if (fallbackCalc !== CALC_ERROR) {
        setResult(fallbackCalc);
        return;
      }
    }

    // Mantém último resultado válido em vez de forçar "Erro" na UI
    if (result && result !== CALC_ERROR) return;
    setResult(CALC_ERROR);
  }, [expression, result, setResult]);

  const handleClear = useCallback(() => {
    playTapSound();
    setExpression('');
    setResult(null);
  }, []);

  const handleBackspace = useCallback(() => {
    playTapSound();
    setExpression((prev) => prev.slice(0, -1));
    setResult(null);
  }, []);

  const displayExpr = expression || '0';
  const displayResult = result ?? '';

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
        ? (compact ? 22 : 30)
        : (type === 'func' ? (compact ? 18 : 24) : (compact ? 18 : 24));
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
    <View style={[styles.container, { backgroundColor: colors.bg, paddingHorizontal: compact ? 8 : 16 }]}>
      {isModal && onClose && (
        <TouchableOpacity onPress={() => { playTapSound(); onClose(); }} style={styles.closeBtn} hitSlop={18}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      )}
      {(onExpand || onMinimize) && (
        <TouchableOpacity
          onPress={() => { playTapSound(); compact ? onExpand?.() : onMinimize?.(); }}
          style={styles.modeBtn}
          hitSlop={18}
        >
          <Ionicons name={compact ? 'expand' : 'contract'} size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {compact ? (
        <View style={styles.compactResultWrap}>
          <Text
            style={[
              styles.compactResultValue,
              { color: displayResult === CALC_ERROR ? '#ef4444' : colors.text },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {displayResult
              ? (showCurrency && displayResult !== CALC_ERROR && !isNaN(Number(displayResult))
                  ? formatCurrency(Number(displayResult))
                  : displayResult)
              : '0'}
          </Text>
        </View>
      ) : (
        <View style={styles.logoWrap}>
          <Image source={logoImage} style={styles.logo} resizeMode="contain" />
        </View>
      )}

      <View style={[styles.displayWrap, { paddingTop: compact ? 12 : 20 }]}>
        <Text style={[styles.expression, { fontSize: compact ? 18 : 24, color: colors.textSecondary }]} numberOfLines={2}>
          {displayExpr.replace(/\*/g, '×').replace(/\//g, '÷')}
        </Text>
        {displayResult && !compact && (
          <Text
            style={[
              styles.result,
              { fontSize: compact ? 28 : 42, color: displayResult === CALC_ERROR ? '#ef4444' : colors.text },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {showCurrency && displayResult !== CALC_ERROR && !isNaN(Number(displayResult))
              ? formatCurrency(Number(displayResult))
              : displayResult}
          </Text>
        )}
      </View>

      <View style={styles.pad}>
        <View style={[styles.row, { gap: BTN_GAP, marginBottom: BTN_GAP }]}>
          <Btn label="AC" onPress={handleClear} type="func" />
          <Btn label="%" onPress={() => handlePress('%')} type="func" />
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
        <View style={[styles.row, { gap: BTN_GAP, marginBottom: BTN_GAP }]}>
          <Btn label="7" onPress={() => handlePress('7')} />
          <Btn label="8" onPress={() => handlePress('8')} />
          <Btn label="9" onPress={() => handlePress('9')} />
          <Btn label="×" onPress={() => handlePress('*')} type="op" />
        </View>
        <View style={[styles.row, { gap: BTN_GAP, marginBottom: BTN_GAP }]}>
          <Btn label="4" onPress={() => handlePress('4')} />
          <Btn label="5" onPress={() => handlePress('5')} />
          <Btn label="6" onPress={() => handlePress('6')} />
          <Btn label="-" onPress={() => handlePress('-')} type="op" />
        </View>
        <View style={[styles.row, { gap: BTN_GAP, marginBottom: BTN_GAP }]}>
          <Btn label="1" onPress={() => handlePress('1')} />
          <Btn label="2" onPress={() => handlePress('2')} />
          <Btn label="3" onPress={() => handlePress('3')} />
          <Btn label="+" onPress={() => handlePress('+')} type="op" />
        </View>
        <View style={[styles.row, { gap: BTN_GAP }]}>
          <Btn label="0" onPress={() => handlePress('0')} />
          <Btn label="," onPress={() => handlePress('.')} />
          <TouchableOpacity
            onPress={handleEquals}
            activeOpacity={0.6}
            style={[
              styles.btn,
              {
                width: BTN_SIZE * 2 + BTN_GAP,
                height: BTN_SIZE,
                borderRadius: BTN_SIZE / 2,
                backgroundColor: opBtn,
              },
            ]}
          >
            <Text style={[styles.btnText, { color: '#fff', fontSize: compact ? 22 : 30 }]}>=</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: { position: 'absolute', top: 10, right: 16, zIndex: 10, width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  modeBtn: { position: 'absolute', top: 10, right: 68, zIndex: 10, width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  logoWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 44, marginBottom: 8 },
  logo: { width: 170, height: 170 },
  logoCompact: { width: 96, height: 96 },
  compactResultWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 46, marginBottom: 4 },
  compactResultValue: { fontSize: 28, fontWeight: '700', maxWidth: 180 },
  displayWrap: { paddingHorizontal: 12, paddingBottom: 16, minHeight: 70 },
  expression: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  result: { marginTop: 8, fontWeight: '300', textAlign: 'right' },
  pad: { flex: 1, paddingBottom: 20, justifyContent: 'flex-end' },
  row: { flexDirection: 'row', justifyContent: 'center' },
  btn: { justifyContent: 'center', alignItems: 'center' },
  btnText: { fontWeight: '400' },
  backspace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 8 },
  backspaceText: { fontSize: 13 },
});
