import { Alert, Platform } from 'react-native';

/**
 * Confirmação destrutiva que funciona na web (window.confirm) e no app (Alert).
 */
export function confirmDestructive(title, message, confirmLabel = 'Excluir') {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return Promise.resolve(window.confirm([title, message].filter(Boolean).join('\n\n')));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

/** Handler para botão de lixeira: confirma e chama deleteFn(id). */
export function onDeletePress(title, message, deleteFn, id) {
  return async (e) => {
    e?.stopPropagation?.();
    const ok = await confirmDestructive(title, message);
    if (!ok) return;
    await deleteFn(id);
  };
}

export async function confirmAndDelete(title, message, deleteFn, id) {
  const ok = await confirmDestructive(title, message);
  if (!ok) return false;
  const result = await deleteFn(id);
  return result !== false;
}
