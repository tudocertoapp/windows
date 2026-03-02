import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { setupNotificationChannel, requestPermissions, scheduleReminder, scheduleAReceberReminder } from '../utils/reminders';

const ReminderContext = createContext(undefined);
const AR_PREFIX = 'ar_';

export function ReminderProvider({ children, agendaEvents, aReceber }) {
  const scheduledRef = useRef({});
  const arScheduledRef = useRef({});
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
    (agendaEvents || []).forEach((e) => {
      if (!e.date || scheduledRef.current[e.id]) return;
      const dateStr = e.date.includes('/') ? e.date : `${String(e.date).slice(8, 10)}/${String(e.date).slice(5, 7)}/${String(e.date).slice(0, 4)}`;
      scheduleReminder(e.id, e.title || 'Evento', dateStr, e.time).then((id) => {
        if (id) scheduledRef.current[e.id] = id;
      });
    });
    Object.keys(scheduledRef.current).forEach((eventId) => {
      if (!(agendaEvents || []).find((e) => e.id === eventId)) {
        Notifications.cancelScheduledNotificationAsync(scheduledRef.current[eventId]);
        delete scheduledRef.current[eventId];
      }
    });
  }, [agendaEvents]);

  useEffect(() => {
    (aReceber || []).filter((r) => r.status !== 'pago' && r.dueDate).forEach((r) => {
      const key = AR_PREFIX + r.id;
      if (arScheduledRef.current[key]) return;
      scheduleAReceberReminder(r.id, r.description, r.amount, r.dueDate).then((id) => {
        if (id) arScheduledRef.current[key] = id;
      });
    });
    Object.keys(arScheduledRef.current).forEach((key) => {
      const id = key.replace(AR_PREFIX, '');
      if (!(aReceber || []).find((r) => r.id === id && r.status !== 'pago')) {
        Notifications.cancelScheduledNotificationAsync(arScheduledRef.current[key]);
        delete arScheduledRef.current[key];
      }
    });
  }, [aReceber]);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((n) => {
      const data = n.request.content.data || {};
      if (data.type === 'agenda') {
        Alert.alert('Lembrete: Amanhã', n.request.content.body || 'Evento amanhã', [{ text: 'OK' }], { cancelable: true });
      } else if (data.type === 'a_receber') {
        Alert.alert('Lembrete: Recebimento em 3 dias', n.request.content.body || 'Valor a receber', [{ text: 'OK' }], { cancelable: true });
      }
    });
    return () => sub.remove();
  }, []);

  return <ReminderContext.Provider value={{}}>{children}</ReminderContext.Provider>;
}

export function useReminders() {
  return useContext(ReminderContext) || {};
}
