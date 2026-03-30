import { Platform } from 'react-native';

export function canUseWebDocument() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Abre o HTML completo numa nova janela e chama a impressão do navegador.
 * O utilizador pode escolher impressora física ou "Guardar como PDF" / "Microsoft Print to PDF".
 *
 * Não usar window.open(..., 'noopener'): em Chrome/Firefox o retorno é null e a aba fica em branco
 * porque não há referência para document.write. Depois de abrir, anulamos opener manualmente.
 */
export function printHtmlInBrowser(html) {
  if (!canUseWebDocument()) {
    throw new Error('Impressão no browser não disponível.');
  }
  const w = window.open('', '_blank');
  if (!w) {
    throw new Error('O popup foi bloqueado. Permita pop-ups para este site para imprimir.');
  }
  try {
    w.opener = null;
  } catch (_) {
    /* alguns ambientes podem restringir */
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch (e) {
      try {
        w.close();
      } catch (_) {
        /* ignore */
      }
      throw e;
    }
  }, 300);
}

/** Gera ficheiro .xlsx e inicia o download no browser. */
export function downloadXlsxInBrowser(arrayBuffer, filename) {
  if (!canUseWebDocument()) {
    throw new Error('Download Excel só no browser.');
  }
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[/\\?%*:|"<>]/g, '-');
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
