import React from 'react';
import { DockMascot } from './DockMascot';

/** Ícone do Dock no botão: mascote sem fundo. */
export function DockIcon({ size = 28, expression = 'feliz' }) {
  const s = Number(size) || 28;
  return <DockMascot expression={expression} size={s} />;
}
