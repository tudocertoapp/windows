import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', flex: 1 },
  subtitle: { fontSize: 12, marginTop: 2 },
  rightWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 2 },
});

/**
 * Cabeçalho padrão para cards: ícone + título + subtítulo
 * @param light - usa texto branco (para cards com fundo escuro)
 * @param rightActions - elementos React para botões à direita (ex.: ícone +, expand)
 */
export function CardHeader({ icon, title, subtitle, colors, iconColor, light, rightActions }) {
  const textColor = light ? '#fff' : (colors?.text);
  const subColor = light ? 'rgba(255,255,255,0.8)' : (colors?.textSecondary);
  const iconBg = light ? 'rgba(255,255,255,0.2)' : 'transparent';
  const iconC = colors?.cardIconColor ?? (iconColor || colors?.primary);
  return (
    <View style={s.row}>
      <View style={[s.iconWrap, { backgroundColor: iconBg }]}>
        <AppIcon name={icon} size={26} color={light ? '#fff' : iconC} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: textColor }]}>{title}</Text>
        {subtitle ? <Text style={[s.subtitle, { color: subColor }]}>{subtitle}</Text> : null}
      </View>
      {rightActions ? <View style={s.rightWrap}>{rightActions}</View> : null}
    </View>
  );
}
