import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabasePublicConfig } from './supabaseConfig';

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = getSupabasePublicConfig();

// Na web, detecta o hash #access_token no retorno do OAuth para restaurar a sessão
const isWeb = Platform.OS === 'web';

/** Web: localStorage direto evita falhas de sessão/PKCE com AsyncStorage em alguns browsers. */
const webAuthStorage =
  isWeb && typeof window !== 'undefined'
    ? {
        getItem: (key) => Promise.resolve(window.localStorage.getItem(key)),
        setItem: (key, value) => {
          window.localStorage.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key) => {
          window.localStorage.removeItem(key);
          return Promise.resolve();
        },
      }
    : null;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: webAuthStorage || AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
    flowType: 'pkce',
  },
});
