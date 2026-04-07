import React, { useState, useEffect } from 'react';
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
import { BanksProvider, useBanks } from './src/contexts/BanksContext';
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
import { Ionicons } from '@expo/vector-icons';

/** Atualiza quando dados iniciais (nuvem / AsyncStorage convidado) estão prontos. */
function MainBootstrapBridge({ onMainDataReady }) {
  const { user, isGuest } = useAuth();
  const { loading: financeLoading } = useFinance();
  const { banksHydrated } = useBanks();
  useEffect(() => {
    const ready = user ? !financeLoading : isGuest ? banksHydrated : false;
    onMainDataReady(!!ready);
  }, [user, isGuest, financeLoading, banksHydrated, onMainDataReady]);
  return null;
}

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
  const { user, isGuest, loading: authLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [reuseDesktopLandingCta, setReuseDesktopLandingCta] = useState(false);
  const [mainDataReady, setMainDataReady] = useState(true);
  const [splashClosedForBoot, setSplashClosedForBoot] = useState(false);

  useEffect(() => {
    if (user || isGuest) {
      setMainDataReady(false);
    } else {
      setMainDataReady(true);
    }
  }, [user?.id, isGuest]);

  useEffect(() => {
    if (user || isGuest) {
      setSplashClosedForBoot(false);
    }
  }, [user?.id, isGuest]);

  const sessionNeedsMainData = !!(user || isGuest);
  const dataReady =
    !authLoading && (sessionNeedsMainData ? mainDataReady : true);
  const showSplash = authLoading || !splashClosedForBoot;

  const mainTree =
    (user || isGuest) && (
      <BanksProvider>
        <FinanceProvider>
          <BudgetProvider>
            <NotesProvider>
              <ColaboradoresOrdemProvider>
                <ShoppingListProvider>
                  <GoalsProvider>
                    <PlanProvider>
                      <ProfileProvider>
                        <ThemeSync>
                          <EmpresaProvider>
                            <ValuesVisibilityProvider>
                              <MainBootstrapBridge onMainDataReady={setMainDataReady} />
                              <AppWithReminders />
                            </ValuesVisibilityProvider>
                          </EmpresaProvider>
                        </ThemeSync>
                      </ProfileProvider>
                    </PlanProvider>
                  </GoalsProvider>
                </ShoppingListProvider>
              </ColaboradoresOrdemProvider>
            </NotesProvider>
          </BudgetProvider>
        </FinanceProvider>
      </BanksProvider>
    );

  const landingOrLogin =
    !authLoading &&
    !user &&
    !isGuest &&
    (!showLogin ? (
      <LandingScreen
        onStart={() => {
          setReuseDesktopLandingCta(true);
          setShowLogin(true);
        }}
      />
    ) : (
      <LoginScreen
        desktopReuseLandingCta={reuseDesktopLandingCta}
        onBackToLanding={() => {
          setReuseDesktopLandingCta(false);
          setShowLogin(false);
        }}
      />
    ));

  return (
    <View style={{ flex: 1, backgroundColor: '#111827' }}>
      {mainTree}
      {landingOrLogin}
      {showSplash && (
        <SplashScreen
          overlay
          dataReady={dataReady}
          minHoldMs={sessionNeedsMainData ? 4000 : 0}
          onFinish={() => setSplashClosedForBoot(true)}
        />
      )}
    </View>
  );
}

export default function App() {
  const isWeb = Platform.OS === 'web';
  const [ioniconsReady, setIoniconsReady] = useState(Platform.OS !== 'web');
  const rootStyle = isWeb
    ? { flex: 1, width: '100%', minWidth: '100%', minHeight: '100vh', maxWidth: '100%', zoom: 1.12 }
    : { flex: 1 };

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    let alive = true;
    (async () => {
      try {
        const p = Ionicons.loadFont?.();
        if (p && typeof p.then === 'function') await p;
      } catch (e) {
        console.warn('[App] Ionicons.loadFont falhou:', e?.message || e);
      }
      // expo-font pode resolver antes do ficheiro estar aplicado (ex.: FontFaceObserver);
      // document.fonts garante que "ionicons" está realmente pronta antes de montar a UI.
      try {
        if (typeof document !== 'undefined' && document.fonts?.load) {
          await Promise.race([
            document.fonts.load('24px ionicons'),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000)),
          ]);
        }
      } catch (e) {
        console.warn('[App] Espera por ionicons (document.fonts):', e?.message || e);
      }
      try {
        if (typeof document !== 'undefined' && document.fonts?.ready) {
          await document.fonts.ready;
        }
      } catch (_) {}
      if (alive) setIoniconsReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

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

  if (isWeb && !ioniconsReady) {
    return <View style={{ flex: 1, backgroundColor: '#111827' }} />;
  }

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
