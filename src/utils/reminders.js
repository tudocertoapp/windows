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

export async function scheduleReminder(eventId, title, dateStr, timeStr = '') {
  if (!dateStr) return null;
  const parts = dateStr.trim().split(/[/\-]/);
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
  const eventDate = new Date(year, month, day);
  const reminderDate = new Date(eventDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(9, 0, 0, 0);
  if (reminderDate <= new Date()) return null;
  const trigger = {
    date: reminderDate,
    channelId: CHANNEL_ID,
    repeats: false,
  };
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Lembrete: Amanhã',
      body: `${title}${timeStr ? ` — ${timeStr}` : ''}`,
      sound: true,
      data: { eventId, type: 'agenda' },
    },
    trigger,
  });
  return id;
}

export async function cancelReminder(notificationId) {
  if (notificationId) await Notifications.cancelScheduledNotificationAsync(notificationId);
}
