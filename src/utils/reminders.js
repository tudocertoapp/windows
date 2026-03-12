import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

const CHANNEL_ID = 'lembretes-tudocerto';

/** Minutos antes do evento: 1h, 30min, 1min */
const REMINDER_MINUTES_BEFORE = [60, 30, 1];

export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Lembretes Tudo Certo',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
    });
  }
}

export async function requestPermissions() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return false;
  }
  return true;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = String(dateStr).trim().split(/[/\-]/);
  if (parts.length < 3) return null;
  let day, month, year;
  if (parts[2] && parts[2].length === 4) {
    day = parseInt(parts[0], 10) || 1;
    month = (parseInt(parts[1], 10) || 1) - 1;
    year = parseInt(parts[2], 10) || new Date().getFullYear();
  } else {
    day = parseInt(parts[2], 10) || 1;
    month = (parseInt(parts[1], 10) || 1) - 1;
    year = parseInt(parts[0], 10) || new Date().getFullYear();
  }
  return new Date(year, month, day);
}

function parseTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const [h, m] = timeStr.trim().split(':').map((x) => parseInt(x, 10));
  if (isNaN(h)) return null;
  return { hours: isNaN(h) ? 9 : h, minutes: isNaN(m) ? 0 : m };
}

/** Retorna o momento do evento (Date) a partir de data e hora opcional */
function getEventMoment(dateStr, timeStr = '') {
  const d = parseDate(dateStr);
  if (!d) return null;
  const t = parseTime(timeStr);
  if (t) {
    d.setHours(t.hours, t.minutes, 0, 0);
  } else {
    d.setHours(9, 0, 0, 0);
  }
  return d;
}

/** Agenda lembretes 1h, 30min e 1min antes do evento/agendamento/tarefa. Retorna array de IDs. */
export async function scheduleEventReminders(eventId, title, dateStr, timeStr = '', type = 'agenda') {
  if (!dateStr) return [];
  const eventMoment = getEventMoment(dateStr, timeStr);
  if (!eventMoment || eventMoment <= new Date()) return [];

  const ids = [];
  const timeLabel = timeStr ? ` — ${timeStr}` : '';

  for (const minsBefore of REMINDER_MINUTES_BEFORE) {
    const reminderDate = new Date(eventMoment.getTime() - minsBefore * 60 * 1000);
    if (reminderDate <= new Date()) continue;

    const label = minsBefore >= 60 ? `${minsBefore / 60}h antes` : `${minsBefore} min antes`;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Lembrete: ${label}`,
        body: `${title}${timeLabel}`,
        sound: true,
        data: { eventId, type },
      },
      trigger: { date: reminderDate, channelId: CHANNEL_ID, repeats: false },
    });
    if (id) ids.push(id);
  }
  return ids;
}

/** Agenda lembretes para tarefa. Usa timeStart como horário se existir. */
export async function scheduleTaskReminders(taskId, title, dateStr, timeStr = '') {
  return scheduleEventReminders(taskId, title, dateStr, timeStr, 'tarefa');
}

export async function cancelReminder(notificationId) {
  if (notificationId) await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelReminders(notificationIds) {
  if (Array.isArray(notificationIds)) {
    await Promise.all(notificationIds.map((id) => (id ? Notifications.cancelScheduledNotificationAsync(id) : Promise.resolve())));
  }
}

/** Manter compatibilidade: agenda um lembrete "Amanhã 9h" para evento (fallback antigo) */
export async function scheduleReminder(eventId, title, dateStr, timeStr = '') {
  const ids = await scheduleEventReminders(eventId, title, dateStr, timeStr, 'agenda');
  return ids.length > 0 ? ids[0] : null;
}

export async function scheduleAReceberReminder(arId, description, amount, dateStr) {
  if (!dateStr) return null;
  const dueDate = parseDate(dateStr);
  if (!dueDate) return null;
  const reminderDate = new Date(dueDate);
  reminderDate.setDate(reminderDate.getDate() - 3);
  reminderDate.setHours(9, 0, 0, 0);
  if (reminderDate <= new Date()) return null;
  const amtStr = typeof amount === 'number' ? amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : String(amount);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Lembrete: Recebimento em 3 dias',
      body: `${amtStr} — ${description || 'A receber'}`,
      sound: true,
      data: { arId, type: 'a_receber' },
    },
    trigger: { date: reminderDate, channelId: CHANNEL_ID, repeats: false },
  });
  return id;
}
