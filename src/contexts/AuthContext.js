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
      .catch(() => {
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
    // No APK, makeRedirectUri sem scheme retorna URL do Supabase. Forçar scheme do app para voltar ao app.
    const redirectTo = makeRedirectUri({ scheme: 'tudocerto', path: 'auth/callback' }) || Linking.createURL('auth/callback') || makeRedirectUri({ path: 'auth/callback' });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('Não foi possível iniciar o login com Google.');

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      createTask: false,
      showInRecents: false,
    });
    if (res.type === 'success' && res.url) {
      const { params, errorCode } = QueryParams.getQueryParams(res.url);
      if (errorCode) throw new Error(errorCode);
      const { access_token, refresh_token } = params;
      if (!access_token) throw new Error('Sessão não recebida.');
      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
      if (sessionError) throw sessionError;
    } else if (res.type === 'cancel') {
      throw new Error('Login cancelado.');
    } else if (res.type === 'dismiss') {
      throw new Error('O login com Google não retorna ao app no Expo Go com tunnel. Adicione no Supabase (Auth > URL Config): https://*.exp.direct/** e exp://** — ou use um Development Build: npx expo prebuild && npx expo run:android');
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
