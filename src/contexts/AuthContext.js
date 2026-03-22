import React, { createContext, useContext, useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!cancelled) {
          setSession(session);
          setUser(session?.user ?? null);
        }
      })
      .catch((err) => {
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('invalid') && msg.includes('refresh')) {
          supabase.auth.signOut().catch(() => {});
        }
        if (!cancelled) {
          setSession(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('user already registered') || msg.includes('already been registered')) {
        throw new Error('E-mail já cadastrado. Use "Entrar" para acessar sua conta.');
      }
      throw error;
    }
    if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
      throw new Error('E-mail já cadastrado. Use "Entrar" para acessar sua conta.');
    }
    return data;
  };

  const signOut = async () => {
    setIsGuest(false);
    setSession(null);
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Erro ao desconectar:', e);
    }
  };

  const enterAsGuest = () => setIsGuest(true);

  const signInWithGoogle = async () => {
    // APK/standalone: scheme do app para o redirect voltar ao app (ex: tudocerto://auth/callback)
    const redirectTo =
      Linking.createURL('auth/callback') ||
      makeRedirectUri({ scheme: 'tudocerto', path: 'auth/callback', useProxy: false }) ||
      'tudocerto://auth/callback';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('Não foi possível iniciar o login com Google.');

    // Android: createTask: true (padrão) permite o redirect tudocerto:// voltar ao app
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      createTask: true,
      showInRecents: false,
    });
    if (res.type === 'success' && res.url) {
      const { params, errorCode } = QueryParams.getQueryParams(res.url);
      if (errorCode) throw new Error(params?.error_description || errorCode);
      const { access_token, refresh_token, code } = params;

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      } else if (access_token && refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
        if (sessionError) throw sessionError;
      } else {
        throw new Error(
          'Sessão não recebida. Verifique no Supabase (Auth > URL Config) se está permitido: tudocerto://auth/callback'
        );
      }
    } else if (res.type === 'cancel') {
      throw new Error('Login cancelado.');
    } else if (res.type === 'dismiss') {
      throw new Error(
        'O login não retornou ao app. No Supabase (Auth > URL Config) adicione: tudocerto://auth/callback e tudocerto://**'
      );
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, isGuest, loading, signIn, signUp, signOut, signInWithGoogle, enterAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
