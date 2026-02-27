import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { setupNotificationChannel, requestPermissions, scheduleReminder } from '../utils/reminders';

const ReminderContext = createContext(undefined);

export function ReminderProvider({ children, agendaEvents }) {
  const scheduledRef = useRef({});
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    (async () => {
      if (hasRequestedRef.current) return;
      hasRequestedRef.current = true;
      await setupNotificationChannel();
      await requestPermissions();
    })();
  }, []);

  useEffect(() => {
    agendaEvents.forEach((e) => {
      if (!e.date || scheduledRef.current[e.id]) return;
      const dateStr = e.date.includes('/') ? e.date : `${String(e.date).slice(8, 10)}/${String(e.date).slice(5, 7)}/${String(e.date).slice(0, 4)}`;
      scheduleReminder(e.id, e.title || 'Evento', dateStr, e.time).then((id) => {
        if (id) scheduledRef.current[e.id] = id;
      });
    });
    Object.keys(scheduledRef.current).forEach((eventId) => {
      if (!agendaEvents.find((e) => e.id === eventId)) {
        Notifications.cancelScheduledNotificationAsync(scheduledRef.current[eventId]);
        delete scheduledRef.current[eventId];
      }
    });
  }, [agendaEvents]);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((n) => {
      if (n.request.content.data?.type === 'agenda') {
        Alert.alert('Lembrete: Amanhã', n.request.content.body || 'Evento amanhã', [{ text: 'OK' }], { cancelable: true });
      }
    });
    return () => sub.remove();
  }, []);

  return <ReminderContext.Provider value={{}}>{children}</ReminderContext.Provider>;
}

export function useReminders() {
  return useContext(ReminderContext) || {};
}
