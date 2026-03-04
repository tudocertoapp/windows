/**
 * Calculadora profissional - Suporta expressões completas
 * Ex: 10 + 5 * 3 - 2 / 4, parênteses, %
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { playTapSound } from '../utils/sounds';
import { calculateExpression, CALC_ERROR } from '../utils/calculator';
import { formatCurrency } from '../utils/formatter';
import { Ionicons } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');

/** Cores padrão quando fundo é escuro */
const DARK_STYLE = { numBtn: '#333333', opBtn: '#FE9500', funcBtn: '#A5A5A5' };

interface Props {
  onClose?: () => void;
  isModal?: boolean;
  compact?: boolean;
  onExpand?: () => void;
  onMinimize?: () => void;
  showCurrency?: boolean;
}

export function CalculatorScreenPro({
  onClose,
  isModal,
  compact,
  onExpand,
  onMinimize,
  showCurrency = false,
}: Props) {
  const { colors } = useTheme();
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState<string | null>(null);

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
    if (!expression.trim()) return;
    const calc = calculateExpression(expression);
    setResult(calc);
  }, [expression]);

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
    const isZero = label === '0';
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.6}
        style={[
          styles.btn,
          {
            width: isZero ? BTN_SIZE * 2 + BTN_GAP : BTN_SIZE,
            height: BTN_SIZE,
            borderRadius: BTN_SIZE / 2,
            backgroundColor: bg,
            alignItems: isZero ? 'flex-start' : 'center',
            paddingLeft: isZero ? BTN_SIZE / 2 + BTN_GAP / 2 : 0,
          },
        ]}
      >
        <Text style={[styles.btnText, { color: type === 'op' ? '#fff' : btnTextColor(type), fontSize: compact ? 18 : 24 }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingHorizontal: compact ? 8 : 16 }]}>
      {isModal && onClose && (
        <TouchableOpacity onPress={() => { playTapSound(); onClose(); }} style={styles.closeBtn} hitSlop={16}>
          <Ionicons name="close" size={26} color={colors.text} />
        </TouchableOpacity>
      )}
      {(onExpand || onMinimize) && (
        <TouchableOpacity
          onPress={() => { playTapSound(); compact ? onExpand?.() : onMinimize?.(); }}
          style={styles.modeBtn}
          hitSlop={8}
        >
          <Ionicons name={compact ? 'expand' : 'contract'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

        <View style={[styles.displayWrap, { paddingTop: compact ? 36 : 56 }]}>
        <Text style={[styles.expression, { fontSize: compact ? 18 : 24, color: colors.textSecondary }]} numberOfLines={2}>
          {displayExpr.replace(/\*/g, '×').replace(/\//g, '÷')}
        </Text>
        {displayResult && (
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
        <View style={[styles.row, { marginBottom: BTN_GAP }]}>
          <Btn label="AC" onPress={handleClear} type="func" />
          <Btn label="(" onPress={() => handlePress('(')} type="func" />
          <Btn label=")" onPress={() => handlePress(')')} type="func" />
          <Btn label="÷" onPress={() => handlePress('/')} type="op" />
        </View>
        <View style={[styles.row, { marginBottom: BTN_GAP }]}>
          <Btn label="7" onPress={() => handlePress('7')} />
          <Btn label="8" onPress={() => handlePress('8')} />
          <Btn label="9" onPress={() => handlePress('9')} />
          <Btn label="×" onPress={() => handlePress('*')} type="op" />
        </View>
        <View style={[styles.row, { marginBottom: BTN_GAP }]}>
          <Btn label="4" onPress={() => handlePress('4')} />
          <Btn label="5" onPress={() => handlePress('5')} />
          <Btn label="6" onPress={() => handlePress('6')} />
          <Btn label="-" onPress={() => handlePress('-')} type="op" />
        </View>
        <View style={[styles.row, { marginBottom: BTN_GAP }]}>
          <Btn label="1" onPress={() => handlePress('1')} />
          <Btn label="2" onPress={() => handlePress('2')} />
          <Btn label="3" onPress={() => handlePress('3')} />
          <Btn label="+" onPress={() => handlePress('+')} type="op" />
        </View>
        <View style={[styles.row, { gap: BTN_GAP }]}>
          <Btn label="0" onPress={() => handlePress('0')} />
          <Btn label="," onPress={() => handlePress('.')} />
          <Btn label="%" onPress={() => handlePress('%')} type="func" />
          <Btn label="=" onPress={handleEquals} type="op" />
        </View>
        <TouchableOpacity onPress={handleBackspace} style={styles.backspace}>
          <Ionicons name="backspace-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.backspaceText, { color: colors.textSecondary }]}>Apagar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: { position: 'absolute', top: 12, right: 16, zIndex: 10 },
  modeBtn: { position: 'absolute', top: 12, right: 52, zIndex: 10 },
  displayWrap: { paddingHorizontal: 12, paddingBottom: 16, minHeight: 70 },
  expression: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  result: { marginTop: 8, fontWeight: '300', textAlign: 'right' },
  pad: { flex: 1, paddingBottom: 20, justifyContent: 'flex-end' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  btn: { justifyContent: 'center', alignItems: 'center' },
  btnText: { fontWeight: '400' },
  backspace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 8 },
  backspaceText: { fontSize: 13 },
});
