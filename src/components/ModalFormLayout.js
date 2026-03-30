/**
 * Layout em grelha para modais no web desktop: vários campos por linha com flex/minWidth.
 * Reutilizar noutros modais: importar ModalFormRow + ModalFormCell e agrupar campos curtos na mesma linha.
 */
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useIsDesktopLayout } from '../utils/platformLayout';

const COL_GAP = 10;
const ROW_GAP = 10;

/**
 * Linha de campos para modais no web desktop (várias colunas com wrap).
 * No mobile/nativo: coluna única (filhos empilhados).
 */
export function ModalFormRow({ children, style }) {
  const desktop = Platform.OS === 'web' && useIsDesktopLayout();
  if (!desktop) {
    return <View style={style}>{children}</View>;
  }
  return (
    <View style={[styles.row, { gap: COL_GAP, marginBottom: ROW_GAP }, style]}>
      {children}
    </View>
  );
}

/**
 * Célula flexível: use flex maior para campos longos (nome, endereço) e menor para números/telefone.
 * fullWidth: ocupa a linha inteira (equivale a basis 100%).
 */
export function ModalFormCell({ children, flex = 1, minWidth = 100, maxWidth, fullWidth, style }) {
  const desktop = Platform.OS === 'web' && useIsDesktopLayout();
  if (!desktop) {
    return <View style={[{ marginBottom: 12 }, style]}>{children}</View>;
  }
  if (fullWidth) {
    return <View style={[{ width: '100%', flexBasis: '100%' }, style]}>{children}</View>;
  }
  return (
    <View
      style={[
        {
          flexGrow: flex,
          flexShrink: 1,
          flexBasis: 0,
          minWidth,
          maxWidth,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    alignItems: 'flex-start',
  },
});
