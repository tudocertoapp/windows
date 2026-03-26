import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const NavigationBar = Platform.OS !== 'web' ? require('expo-navigation-bar') : null;
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { FinanceProvider, useFinance } from './src/contexts/FinanceContext';
import { PlanProvider } from './src/contexts/PlanContext';
import { ProfileProvider } from './src/contexts/ProfileContext';
import { ThemeSync } from './src/components/ThemeSync';
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
import { ErrorBoundary } from './src/components/ErrorBoundary';

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

  const isWeb = Platform.OS === 'web';
  const showSplash = loading || !splashDone || postLoginSplash;
  const splashDuration = isWeb ? 1500 : 4000;

  if (showSplash) {
    return (
      <SplashScreen
        duration={splashDuration}
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
              <ThemeSync>
                <EmpresaProvider>
                  <ValuesVisibilityProvider>
                    <AppWithReminders />
                  </ValuesVisibilityProvider>
                </EmpresaProvider>
              </ThemeSync>
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
  const isWeb = Platform.OS === 'web';
  const rootStyle = isWeb
    ? { flex: 1, width: '100%', minWidth: '100%', minHeight: '100vh', maxWidth: '100%', zoom: 1.12 }
    : { flex: 1 };

  useEffect(() => {
    if (Platform.OS === 'android' && NavigationBar) {
      NavigationBar.setBackgroundColorAsync('#00000000').catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const STYLE_ID = 'tc-web-scrollbars-style';
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.type = 'text/css';
    // Chrome/Edge (WebKit): esconder scrollbar mantendo scroll.
    // Escopado para a timeline da Agenda (className no ScrollView).
    style.appendChild(document.createTextNode(`
      .tc-agenda-timeline-scroll::-webkit-scrollbar { width: 0px; height: 0px; }
      .tc-agenda-timeline-scroll::-webkit-scrollbar-thumb { background: transparent; }
      .tc-agenda-timeline-scroll::-webkit-scrollbar-track { background: transparent; }
    `));
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const h = (e) => {
        console.error('[App] Uncaught error:', e?.error || e?.message || e);
      };
      window.addEventListener('error', h);
      window.addEventListener('unhandledrejection', (e) => {
        console.error('[App] Unhandled promise:', e?.reason);
      });
      return () => {
        window.removeEventListener('error', h);
      };
    }
  }, []);

  const RootView = isWeb ? View : GestureHandlerRootView;

  return (
    <ErrorBoundary>
      <AuthProvider>
        <RootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <View style={[s.root, isWeb && s.rootWeb]}>
              <View style={rootStyle}>
                <ThemeProvider>
                  <LanguageProvider>
                    <AppContent />
                  </LanguageProvider>
                </ThemeProvider>
              </View>
            </View>
          </SafeAreaProvider>
        </RootView>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  root: { flex: 1 },
  rootWeb: { flex: 1, width: '100%', backgroundColor: '#111827', minHeight: '100vh' },
});
