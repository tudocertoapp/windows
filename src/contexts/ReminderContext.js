import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { setupNotificationChannel, requestPermissions, scheduleEventReminders, scheduleTaskReminders, scheduleAReceberReminder, cancelReminders, cancelReminder } from '../utils/reminders';

const ReminderContext = createContext(undefined);
const AR_PREFIX = 'ar_';
const TASK_PREFIX = 'task_';

export function ReminderProvider({ children, agendaEvents, aReceber, checkListItems, updateCheckListItem }) {
  const scheduledRef = useRef({});
  const arScheduledRef = useRef({});
  const taskScheduledRef = useRef({});
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
      if (!e.date || !(e.time || '').trim() || scheduledRef.current[e.id]) return;
      const dateStr = e.date.includes('/') ? e.date : `${String(e.date).slice(8, 10)}/${String(e.date).slice(5, 7)}/${String(e.date).slice(0, 4)}`;
      const timeStr = e.time || '';
      scheduleEventReminders(e.id, e.title || 'Evento', dateStr, timeStr, 'agenda').then((ids) => {
        if (ids.length > 0) scheduledRef.current[e.id] = ids;
      });
    });
    Object.keys(scheduledRef.current).forEach((eventId) => {
      if (!(agendaEvents || []).find((e) => e.id === eventId)) {
        cancelReminders(scheduledRef.current[eventId]);
        delete scheduledRef.current[eventId];
      }
    });
  }, [agendaEvents]);

  useEffect(() => {
    (checkListItems || [])
      .filter((t) => !t.checked && t.date && (t.timeStart || '').trim())
      .forEach((t) => {
        const key = TASK_PREFIX + t.id;
        if (taskScheduledRef.current[key]) return;
        const dateStr = t.date.includes('/') ? t.date : `${String(t.date).slice(8, 10)}/${String(t.date).slice(5, 7)}/${String(t.date).slice(0, 4)}`;
        const timeStr = t.timeStart || '';
        scheduleTaskReminders(t.id, t.title || 'Tarefa', dateStr, timeStr).then((ids) => {
          if (ids.length > 0) taskScheduledRef.current[key] = ids;
        });
      });
    Object.keys(taskScheduledRef.current).forEach((key) => {
      const id = key.replace(TASK_PREFIX, '');
      const task = (checkListItems || []).find((t) => t.id === id);
      if (!task || task.checked || !task.date || !(task.timeStart || '').trim()) {
        cancelReminders(taskScheduledRef.current[key]);
        delete taskScheduledRef.current[key];
      }
    });
  }, [checkListItems]);

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
        cancelReminder(arScheduledRef.current[key]);
        delete arScheduledRef.current[key];
      }
    });
  }, [aReceber]);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((n) => {
      const data = n.request.content.data || {};
      const body = n.request.content.body || '';

      if (data.type === 'tarefa' && data.eventId && updateCheckListItem) {
        Alert.alert(
          n.request.content.title || 'Lembrete',
          body,
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Concluir tarefa',
              onPress: () => updateCheckListItem(data.eventId, { checked: true }),
            },
          ],
          { cancelable: true }
        );
      } else if (data.type === 'agenda') {
        Alert.alert(n.request.content.title || 'Lembrete', body, [{ text: 'OK' }], { cancelable: true });
      } else if (data.type === 'a_receber') {
        Alert.alert('Lembrete: Recebimento em 3 dias', body, [{ text: 'OK' }], { cancelable: true });
      }
    });
    return () => sub.remove();
  }, [updateCheckListItem]);

  return <ReminderContext.Provider value={{}}>{children}</ReminderContext.Provider>;
}

export function useReminders() {
  return useContext(ReminderContext) || {};
}
