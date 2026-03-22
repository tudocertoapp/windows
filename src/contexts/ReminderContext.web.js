/**
 * ReminderContext - versão web sem expo-notifications.
 * Mantém a mesma API do Provider mas não agenda lembretes.
 */
import React, { createContext, useContext } from 'react';

const ReminderContext = createContext(undefined);

export function ReminderProvider({ children }) {
  return <ReminderContext.Provider value={{}}>{children}</ReminderContext.Provider>;
}

export function useReminders() {
  return useContext(ReminderContext) || {};
}
