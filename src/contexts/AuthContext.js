import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// WebBrowser.maybeCompleteAuthSession - necessário para completar OAuth callback (web e native)
try {
  const WebBrowser = require('expo-web-browser');
  if (WebBrowser?.maybeCompleteAuthSession) WebBrowser.maybeCompleteAuthSession();
} catch (_) {}

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, Platform.OS === 'web' ? 5000 : 8000);

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
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, metadata = {}) => {
    const emailTrim = String(email || '').trim();
    const nomeRaw = String(metadata?.nome ?? metadata?.full_name ?? '').trim().slice(0, 240);
    const nome = nomeRaw || emailTrim.split('@')[0] || 'Usuário';
    const userMeta = { nome, full_name: nome };

    const emailRedirectTo =
      Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin.replace(/\/$/, '')}/`
        : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: emailTrim,
      password,
      options: {
        data: userMeta,
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
      },
    });
    if (error) {
      const msg = (error.message || '').toLowerCase();
      const st = error.status;
      if (st >= 500 || msg.includes('internal server error') || msg.includes('unexpected_failure')) {
        throw new Error('AUTH_SIGNUP_SERVER');
      }
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

  /**
   * Apaga a conta no Supabase (RPC `delete_my_account` — ver `supabase-delete-my-account.sql`).
   * Só funciona no servidor se o plano na metadata for `pessoal`; caso contrário a RPC falha.
   */
  const deleteAccount = async () => {
    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw error;
    await signOut();
  };

  const enterAsGuest = () => setIsGuest(true);

  /** Web: envia e-mail com link para redefinir senha (Supabase Auth > URL Configuration deve incluir o redirectTo). */
  const resetPasswordForEmail = async (email) => {
    const redirectTo =
      Platform.OS === 'web' && typeof window !== 'undefined' && window.location
        ? `${window.location.origin}/`
        : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      ...(redirectTo ? { redirectTo } : {}),
    });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    if (Platform.OS === 'web') {
      // Usa a origem atual (ex: http://localhost:8081) - deve estar em Supabase > Auth > URL Configuration > Redirect URLs
      const redirectTo = typeof window !== 'undefined' && window.location ? window.location.origin : undefined;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Não foi possível iniciar o login com Google.');
      }
      return;
    }

    const Constants = require('expo-constants').default;
    const Linking = require('expo-linking');
    const { makeRedirectUri } = require('expo-auth-session');
    const QueryParams = require('expo-auth-session/build/QueryParams');
    const WebBrowser = require('expo-web-browser');
    const isExpoGo = Constants.appOwnership === 'expo';
    const redirectTo = !isExpoGo ? 'tudocerto://auth/callback' : (Linking.createURL('auth/callback') || makeRedirectUri({ scheme: 'tudocerto', path: 'auth/callback', useProxy: false }) || 'tudocerto://auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account', display: 'page' },
      },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('Não foi possível iniciar o login com Google.');

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      createTask: false,
      showInRecents: true,
    });
    if (res.type === 'success' && res.url) {
      let params = {};
      let oauthError = null;
      try {
        const parsed = QueryParams.getQueryParams(res.url);
        params = parsed.params || {};
        if (parsed.errorCode) oauthError = new Error(params?.error_description || parsed.errorCode);
      } catch (_) {}
      if (oauthError) throw oauthError;
      if (Object.keys(params).length === 0 && res.url) {
        const url = res.url;
        const q = url.indexOf('?');
        const h = url.indexOf('#');
        const qs = q >= 0 ? (h >= 0 && h > q ? url.slice(q + 1, h) : url.slice(q + 1)) : '';
        const hs = h >= 0 ? url.slice(h + 1) : '';
        const parse = (s) => {
          if (!s) return {};
          const out = {};
          s.split('&').forEach((p) => {
            const eq = p.indexOf('=');
            if (eq > 0) {
              try {
                out[decodeURIComponent(p.slice(0, eq))] = decodeURIComponent(p.slice(eq + 1));
              } catch (_) {}
            }
          });
          return out;
        };
        params = { ...parse(qs), ...parse(hs) };
      }
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
    <AuthContext.Provider
      value={{
        session,
        user,
        isGuest,
        loading,
        signIn,
        signUp,
        signOut,
        deleteAccount,
        signInWithGoogle,
        enterAsGuest,
        resetPasswordForEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
