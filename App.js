import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as NavigationBar from 'expo-navigation-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { FinanceProvider, useFinance } from './src/contexts/FinanceContext';
import { PlanProvider } from './src/contexts/PlanContext';
import { ProfileProvider } from './src/contexts/ProfileContext';
import { BanksProvider } from './src/contexts/BanksContext';
import { BudgetProvider } from './src/contexts/BudgetContext';
import { NotesProvider } from './src/contexts/NotesContext';
import { ShoppingListProvider } from './src/contexts/ShoppingListContext';
import { GoalsProvider } from './src/contexts/GoalsContext';
import { ReminderProvider } from './src/contexts/ReminderContext';
import { ValuesVisibilityProvider } from './src/contexts/ValuesVisibilityContext';
import { EmpresaProvider } from './src/contexts/EmpresaContext';
import { ColaboradoresOrdemProvider } from './src/contexts/ColaboradoresOrdemContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LandingScreen } from './src/screens/LandingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SplashScreen } from './src/components/SplashScreen';

function AppWithReminders() {
  const { agendaEvents, aReceber, checkListItems, updateCheckListItem } = useFinance();
  return (
    <ReminderProvider
      agendaEvents={agendaEvents}
      aReceber={aReceber}
      checkListItems={checkListItems}
      updateCheckListItem={updateCheckListItem}
    >
      <AppNavigator />
    </ReminderProvider>
  );
}

function AppContent() {
  const { user, isGuest, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [postLoginSplash, setPostLoginSplash] = useState(false);
  const hadUserRef = useRef(false);

  useEffect(() => {
    if (user || isGuest) {
      if (!hadUserRef.current && showLogin) setPostLoginSplash(true);
      hadUserRef.current = true;
    } else hadUserRef.current = false;
  }, [user, isGuest, showLogin]);

  const showSplash = loading || !splashDone || postLoginSplash;

  if (showSplash) {
    return (
      <SplashScreen
        duration={4000}
        onFinish={() => { setSplashDone(true); setPostLoginSplash(false); }}
        backgroundColor="#111827"
      />
    );
  }

  if (!user && !isGuest) {
    if (!showLogin) {
      return <LandingScreen onStart={() => setShowLogin(true)} />;
    }
    return <LoginScreen />;
  }

  return (
    <FinanceProvider>
      <BudgetProvider>
        <NotesProvider>
        <ColaboradoresOrdemProvider>
        <ShoppingListProvider>
        <GoalsProvider>
        <BanksProvider>
          <PlanProvider>
            <ProfileProvider>
              <EmpresaProvider>
              <ValuesVisibilityProvider>
                <AppWithReminders />
              </ValuesVisibilityProvider>
              </EmpresaProvider>
            </ProfileProvider>
          </PlanProvider>
        </BanksProvider>
        </GoalsProvider>
        </ShoppingListProvider>
        </ColaboradoresOrdemProvider>
        </NotesProvider>
      </BudgetProvider>
    </FinanceProvider>
  );
}

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#00000000').catch(() => {});
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
