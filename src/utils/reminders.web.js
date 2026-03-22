/**
 * Fallback web: notificações push não disponíveis no navegador desta forma.
 * Implementações no-op para manter compatibilidade.
 */
export async function setupNotificationChannel() {}

export async function requestPermissions() {
  return false;
}

export async function scheduleEventReminders() {
  return [];
}

export async function scheduleTaskReminders() {
  return [];
}

export async function scheduleAReceberReminder() {
  return null;
}

export async function cancelReminder() {}

export async function cancelReminders() {}

export async function scheduleReminder() {
  return null;
}
