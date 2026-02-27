import React from 'react';
import { Ionicons } from '@expo/vector-icons';

/**
 * Wrapper para Ionicons - usa -outline (linha média, nem fina nem grossa).
 */
export function AppIcon({ name, size = 24, color, style, ...rest }) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={style}
      {...rest}
    />
  );
}
