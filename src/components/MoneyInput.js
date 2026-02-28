import React from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

export function MoneyInput({ value, onChange, placeholder, style, containerStyle, ...rest }) {
  const { lang } = useLanguage();
  const { colors } = useTheme();
  const prefix = lang.currency || 'R$';
  const decSep = lang.decimalSep || ',';
  const thSep = lang.thousandsSep || '.';

  const formatDisplay = (v) => {
    if (!v && v !== 0) return '';
    const s = String(v).replace(/[^\d,.\-]/g, '');
    const parts = s.split(decSep === ',' ? ',' : '.');
    let intPart = (parts[0] || '0').replace(/\D/g, '');
    let decPart = (parts[1] || '').replace(/\D/g, '').slice(0, 2);
    if (thSep && thSep !== decSep) {
      intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thSep);
    }
    return decPart ? `${intPart}${decSep}${decPart}` : (intPart || '');
  };

  const handleChange = (text) => {
    const formatted = formatDisplay(text);
    onChange?.(formatted);
  };

  const displayVal = value === '' || value == null ? '' : formatDisplay(String(value));

  return (
    <View style={[s.wrap, containerStyle, { borderColor: colors.border }]}>
      <Text style={[s.prefix, { color: colors.textSecondary }]}>{prefix} </Text>
      <TextInput
        {...rest}
        style={[s.input, style, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
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
  input: { flex: 1, paddingVertical: 12, fontSize: 15, borderWidth: 0 },
});
