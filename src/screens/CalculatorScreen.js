import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { playTapSound } from '../utils/sounds';
import { Ionicons } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');

// Estilo iOS: fundo preto, display branco, botões cinza/laranja
const IOS = {
  bg: '#000000',
  display: '#ffffff',
  numBtn: '#333333',
  opBtn: '#FE9500',
  funcBtn: '#A5A5A5',
  opBtnPressed: '#fcc77a',
};

function formatDisplay(val) {
  if (val === '' || val === null || val === undefined) return '0';
  const s = String(val).trim();
  if (s.endsWith('.')) return s.slice(0, -1).replace('.', ',') + ',';
  if (s.endsWith(',')) return s;
  if (s.includes('e')) return Number(val).toExponential(5);
  const n = parseFloat(s.replace(',', '.'));
  if (Number.isNaN(n)) return '0';
  const fixed = n.toFixed(10).replace(/\.?0+$/, '');
  return fixed.replace('.', ',');
}

function parseDisplay(s) {
  if (!s) return 0;
  const n = parseFloat(String(s).replace(',', '.').replace(/\s/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

export function CalculatorScreen({ onClose, isModal, compact, onExpand, onMinimize }) {
  const { colors } = useTheme();
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [lastWasEquals, setLastWasEquals] = useState(false);
  const [showClear, setShowClear] = useState(false);
  const [enteredNewNumber, setEnteredNewNumber] = useState(false); // digitou número após operador

  const scale = compact ? 0.65 : 1;
  const BTN_SIZE = Math.round((compact ? 52 : Math.min(SW * 0.22, 80)) * scale);
  const BTN_GAP = compact ? 6 : 12;
  const PAD_H = compact ? 8 : 20;

  const reset = useCallback(() => {
    setDisplay('0');
    setPrevValue(null);
    setOperation(null);
    setLastWasEquals(false);
    setShowClear(false);
    setEnteredNewNumber(false);
  }, []);

  const handleDigit = useCallback((d) => {
    playTapSound();
    setEnteredNewNumber(true);
    setDisplay((prev) => {
      if (lastWasEquals) {
        setLastWasEquals(false);
        setPrevValue(null);
        setOperation(null);
        return d === '.' ? '0.' : d;
      }
      if (prev === '0' && d !== '.') return d;
      if (d === '.' && prev.includes('.')) return prev;
      if (d === '.' && prev === '0') return '0.';
      if (prev.length >= 12) return prev;
      return prev + d;
    });
    setShowClear(true);
  }, [lastWasEquals]);

  const handleOperator = useCallback((op) => {
    playTapSound();
    const curr = parseDisplay(display);
    setLastWasEquals(false);

    // Só calcula se havia operação anterior E usuário digitou novo número (não só trocou operador)
    if (operation !== null && prevValue !== null && enteredNewNumber) {
      let result = prevValue;
      if (operation === '+') result = prevValue + curr;
      else if (operation === '-') result = prevValue - curr;
      else if (operation === '×') result = prevValue * curr;
      else if (operation === '÷') result = curr === 0 ? 0 : prevValue / curr;
      const r = Number.isInteger(result) ? result : parseFloat(result.toFixed(12));
      setPrevValue(r);
      setDisplay(String(r));
    } else {
      setPrevValue(curr);
    }
    setOperation(op);
    setEnteredNewNumber(false);
  }, [display, operation, prevValue, enteredNewNumber]);

  const handleEquals = useCallback(() => {
    playTapSound();
    if (operation === null || prevValue === null) return;
    const curr = parseDisplay(display);
    let result = prevValue;
    if (operation === '+') result = prevValue + curr;
    else if (operation === '-') result = prevValue - curr;
    else if (operation === '×') result = prevValue * curr;
    else if (operation === '÷') result = curr === 0 ? 0 : prevValue / curr;
    const r = Number.isInteger(result) ? result : parseFloat(result.toFixed(12));
    setDisplay(String(r));
    setPrevValue(r);
    setOperation(null);
    setEnteredNewNumber(false);
    setLastWasEquals(true);
  }, [display, operation, prevValue]);

  const handleClear = useCallback(() => {
    playTapSound();
    if (showClear) {
      setDisplay('0');
      setShowClear(false);
    } else {
      reset();
    }
  }, [showClear, reset]);

  const handleBackspace = useCallback(() => {
    playTapSound();
    setDisplay((prev) => {
      if (lastWasEquals || prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  }, [lastWasEquals]);

  const handlePercent = useCallback(() => {
    playTapSound();
    const curr = parseDisplay(display);
    setDisplay(String(curr / 100));
  }, [display]);

  const handleToggleSign = useCallback(() => {
    playTapSound();
    setDisplay((prev) => {
      if (prev === '0') return prev;
      return prev.startsWith('-') ? prev.slice(1) : '-' + prev;
    });
  }, []);

  const Btn = ({ label, onPress, type = 'num' }) => {
    const bg = type === 'op' ? IOS.opBtn : type === 'func' ? IOS.funcBtn : IOS.numBtn;
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
        <Text style={[styles.btnText, { color: type === 'num' ? '#fff' : '#000', fontSize: compact ? 22 : 28 }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const displayVal = formatDisplay(display);
  const bgColor = colors.text === '#f9fafb' ? IOS.bg : IOS.bg;

  return (
    <View style={[styles.container, { backgroundColor: bgColor, paddingHorizontal: PAD_H }]}>
      {isModal && onClose && (
        <TouchableOpacity onPress={() => { playTapSound(); onClose?.(); }} style={styles.closeBtn} hitSlop={16}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
      )}
      {(onExpand || onMinimize) && (
        <TouchableOpacity
          onPress={() => { playTapSound(); compact ? onExpand?.() : onMinimize?.(); }}
          style={styles.modeBtn}
          hitSlop={8}
        >
          <Ionicons name={compact ? 'expand' : 'contract'} size={20} color="#888" />
        </TouchableOpacity>
      )}
      <View style={[styles.displayWrap, { paddingTop: compact ? 36 : 60 }]}>
        <Text style={[styles.display, { fontSize: compact ? 42 : 64 }]} numberOfLines={1} adjustsFontSizeToFit>
          {displayVal}
        </Text>
      </View>
      <View style={styles.pad}>
        <View style={[styles.row, { marginBottom: BTN_GAP }]}>
          <Btn label={showClear ? 'C' : 'AC'} onPress={handleClear} type="func" />
          <Btn label="±" onPress={handleToggleSign} type="func" />
          <Btn label="%" onPress={handlePercent} type="func" />
          <Btn label="÷" onPress={() => handleOperator('÷')} type="op" />
        </View>
        <View style={[styles.row, { marginBottom: BTN_GAP }]}>
          <Btn label="7" onPress={() => handleDigit('7')} />
          <Btn label="8" onPress={() => handleDigit('8')} />
          <Btn label="9" onPress={() => handleDigit('9')} />
          <Btn label="×" onPress={() => handleOperator('×')} type="op" />
        </View>
        <View style={[styles.row, { marginBottom: BTN_GAP }]}>
          <Btn label="4" onPress={() => handleDigit('4')} />
          <Btn label="5" onPress={() => handleDigit('5')} />
          <Btn label="6" onPress={() => handleDigit('6')} />
          <Btn label="-" onPress={() => handleOperator('-')} type="op" />
        </View>
        <View style={[styles.row, { marginBottom: BTN_GAP }]}>
          <Btn label="1" onPress={() => handleDigit('1')} />
          <Btn label="2" onPress={() => handleDigit('2')} />
          <Btn label="3" onPress={() => handleDigit('3')} />
          <Btn label="+" onPress={() => handleOperator('+')} type="op" />
        </View>
        <View style={[styles.row, { gap: BTN_GAP }]}>
          <Btn label="0" onPress={() => handleDigit('0')} />
          <Btn label="," onPress={() => handleDigit('.')} />
          <Btn label="=" onPress={handleEquals} type="op" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: { position: 'absolute', top: 12, right: 16, zIndex: 10 },
  modeBtn: { position: 'absolute', top: 12, right: 52, zIndex: 10 },
  displayWrap: { paddingHorizontal: 16, paddingBottom: 16, minHeight: 80 },
  display: { color: '#fff', fontWeight: '300', textAlign: 'right' },
  pad: { flex: 1, paddingBottom: 24, justifyContent: 'flex-end' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  btn: { justifyContent: 'center', alignItems: 'center' },
  btnText: { fontWeight: '400' },
});
