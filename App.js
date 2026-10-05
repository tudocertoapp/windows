import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
import { KeyboardShortcutsProvider } from './src/contexts/KeyboardShortcutsContext';
import { DockMascotProvider } from './src/contexts/DockMascotContext';
import { EmpresaProvider } from './src/contexts/EmpresaContext';
import { ColaboradoresOrdemProvider } from './src/contexts/ColaboradoresOrdemContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LandingScreen } from './src/screens/LandingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SplashScreen } from './src/components/SplashScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { CadastroClientePublicoScreen } from './src/screens/CadastroClientePublicoScreen';
import { playBrandIntroSound } from './src/utils/sounds';
import { CLIENT_REGISTRATION_PATH } from './src/utils/clientRegistrationLink';
import { getPublicLojaRoute } from './src/utils/lojaPublicLink';
import { LojaPublicaScreen } from './src/screens/LojaPublicaScreen';

const BRAND_INTRO_ONCE_KEY = '@tudocerto_brand_intro_once_v1';

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

function getPublicCadastroOwnerId() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const path = (window.location.pathname || '').replace(/\/$/, '') || '/';
  if (path !== CLIENT_REGISTRATION_PATH && !path.endsWith(CLIENT_REGISTRATION_PATH)) return null;
  return new URLSearchParams(window.location.search).get('ref') || '';
}

/** Na web, /inicio e o app pedem login. Só loja pública e cadastro de cliente ficam abertos. */
function webPathWantsLoginScreen() {
  if (typeof window === 'undefined') return false;
  const path = (window.location.pathname || '/').replace(/\/$/, '') || '/';
  if (path === '/' || path === '') return false;
  const first = path.split('/').filter(Boolean)[0] || '';
  const lower = first.toLowerCase();
  if (lower === 'loja' || lower === 'cadastro-cliente') return false;
  return true;
}

function AppContent() {
  const publicCadastroOwnerId = getPublicCadastroOwnerId();
  const publicLojaRoute = Platform.OS === 'web' ? getPublicLojaRoute() : null;
  const { user, isGuest, loading } = useAuth();
  const isWeb = Platform.OS === 'web';
  const canUseApp = Boolean(user) || (!isWeb && isGuest);
  const [showLogin, setShowLogin] = useState(() => (isWeb ? webPathWantsLoginScreen() : false));
  const [splashDone, setSplashDone] = useState(false);
  const [postLoginSplash, setPostLoginSplash] = useState(false);
  const hadUserRef = useRef(false);
  const brandIntroCheckedRef = useRef(false);
  const brandIntroPlayedRef = useRef(false);

  useEffect(() => {
    if (canUseApp) {
      if (!hadUserRef.current && showLogin) setPostLoginSplash(true);
      hadUserRef.current = true;
    } else hadUserRef.current = false;
  }, [canUseApp, showLogin]);

  useEffect(() => {
    if (!isWeb || user || loading) return;
    if (webPathWantsLoginScreen()) setShowLogin(true);
  }, [isWeb, user, loading]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const path = (window.location.pathname || '/').replace(/\/$/, '') || '/';
    // /sucesso: PlanContext sincroniza session_id antes de limpar a URL
    if (path === '/cancelado') {
      window.history.replaceState({}, '', '/');
    }
  }, [user?.id]);

  useEffect(() => {
    if (brandIntroCheckedRef.current) return;
    brandIntroCheckedRef.current = true;

    const tryPlayBrandIntroOnce = async () => {
      if (brandIntroPlayedRef.current) return;
      try {
        const played = await AsyncStorage.getItem(BRAND_INTRO_ONCE_KEY);
        if (played === '1') {
          brandIntroPlayedRef.current = true;
          return;
        }
        playBrandIntroSound();
        await AsyncStorage.setItem(BRAND_INTRO_ONCE_KEY, '1');
        brandIntroPlayedRef.current = true;
      } catch (_) {
        // fallback: toca mesmo sem conseguir persistir
        playBrandIntroSound();
        brandIntroPlayedRef.current = true;
      }
    };

    // Tentativa imediata (nativo/electron costuma funcionar sem gesto).
    (async () => {
      await tryPlayBrandIntroOnce();
    })();

    // Web: alguns navegadores bloqueiam autoplay sem interação.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onFirstUserGesture = () => {
        tryPlayBrandIntroOnce().catch(() => {});
        window.removeEventListener('pointerdown', onFirstUserGesture);
        window.removeEventListener('keydown', onFirstUserGesture);
        window.removeEventListener('touchstart', onFirstUserGesture);
      };
      window.addEventListener('pointerdown', onFirstUserGesture, { once: true, passive: true });
      window.addEventListener('keydown', onFirstUserGesture, { once: true });
      window.addEventListener('touchstart', onFirstUserGesture, { once: true, passive: true });

      return () => {
        window.removeEventListener('pointerdown', onFirstUserGesture);
        window.removeEventListener('keydown', onFirstUserGesture);
        window.removeEventListener('touchstart', onFirstUserGesture);
      };
    }
  }, []);

  const showSplash = loading || !splashDone || postLoginSplash;
  const splashDuration = isWeb ? 1500 : 4000;

  if (publicCadastroOwnerId !== null) {
    return (
      <ThemeProvider>
        <CadastroClientePublicoScreen ownerUserId={publicCadastroOwnerId} />
      </ThemeProvider>
    );
  }

  if (publicLojaRoute) {
    return (
      <ThemeProvider>
        <LojaPublicaScreen ownerUserId={publicLojaRoute.ownerUserId} lojaSlug={publicLojaRoute.slug} />
      </ThemeProvider>
    );
  }

  if (showSplash) {
    return (
      <SplashScreen
        dataReady={!loading}
        minHoldMs={splashDuration}
        onFinish={() => {
          setSplashDone(true);
          setPostLoginSplash(false);
        }}
        backgroundColor="#111827"
      />
    );
  }

  if (!canUseApp) {
    if (!showLogin) {
      return <LandingScreen onStart={() => setShowLogin(true)} />;
    }
    return <LoginScreen onBackToLanding={() => setShowLogin(false)} />;
  }

  return (
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
                      <KeyboardShortcutsProvider>
                        <DockMascotProvider>
                          <AppWithReminders />
                        </DockMascotProvider>
                      </KeyboardShortcutsProvider>
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
}

export default function App() {
  const isWeb = Platform.OS === 'web';
  const publicLojaRoute = isWeb ? getPublicLojaRoute() : null;
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
    const STYLE_ID = 'tc-web-scrollbars-style-v2';
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.type = 'text/css';
    style.appendChild(document.createTextNode(`
      .tc-agenda-timeline-scroll::-webkit-scrollbar { width: 0px; height: 0px; }
      .tc-agenda-timeline-scroll::-webkit-scrollbar-thumb { background: transparent; }
      .tc-agenda-timeline-scroll::-webkit-scrollbar-track { background: transparent; }
      .tc-card-scroll { scrollbar-width: none; -ms-overflow-style: none; }
      .tc-card-scroll::-webkit-scrollbar { width: 0px; height: 0px; }
      .tc-card-scroll::-webkit-scrollbar-thumb { background: transparent; }
      .tc-card-scroll::-webkit-scrollbar-track { background: transparent; }
      .tc-page-scroll::-webkit-scrollbar { width: 0px; height: 0px; }
      .tc-page-scroll::-webkit-scrollbar-thumb { background: transparent; }
      .tc-page-scroll::-webkit-scrollbar-track { background: transparent; }
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

  if (publicLojaRoute) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <LojaPublicaScreen ownerUserId={publicLojaRoute.ownerUserId} lojaSlug={publicLojaRoute.slug} />
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

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
