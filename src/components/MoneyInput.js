import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { parseMoney } from '../utils/format';

export function MoneyInput({ value, onChange, placeholder, style, containerStyle, onFocus, onBlur, ...rest }) {
  const { lang } = useLanguage();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const prefix = lang.currency || 'R$';
  const decSep = lang.decimalSep || ',';
  const thSep = lang.thousandsSep || '.';

  const formatAsCurrency = (num) => {
    if (num == null || isNaN(num)) return '';
    const n = Number(num);
    const intPart = Math.floor(Math.abs(n));
    const decPart = Math.round((Math.abs(n) - intPart) * 100);
    let intStr = String(intPart);
    if (thSep && thSep !== decSep) {
      intStr = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, thSep);
    }
    return `${intStr}${decSep}${String(decPart).padStart(2, '0')}`;
  };

  const handleChange = (text) => {
    const digits = String(text).replace(/\D/g, '');
    const cents = parseInt(digits || '0', 10);
    const num = cents / 100;
    const formatted = formatAsCurrency(num);
    onChange?.(formatted);
  };

  const numVal = parseMoney(value);
  const displayVal = value === '' || value == null ? '' : formatAsCurrency(isNaN(numVal) ? 0 : numVal);

  return (
    <View style={[s.wrap, containerStyle, { borderColor: focused ? colors.primary : colors.border, backgroundColor: colors.bg }]}>
      <Text style={[s.prefix, { color: colors.text }]}>{prefix} </Text>
      <TextInput
        {...rest}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={[
          s.input,
          style,
          {
            color: colors.text,
            backgroundColor: 'transparent',
            outlineStyle: 'none',
            outlineWidth: 0,
            caretColor: colors.text,
          },
        ]}
        value={displayVal}
        onChangeText={handleChange}
        placeholder={placeholder || (decSep === ',' ? '0,00' : '0.00')}
        placeholderTextColor={colors.textSecondary}
        keyboardType="decimal-pad"
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
  prefix: { fontSize: 15, fontWeight: '600', marginRight: 4 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, borderWidth: 0, outlineStyle: 'none', outlineWidth: 0 },
});
