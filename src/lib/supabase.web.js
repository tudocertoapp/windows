/**
 * Supabase client - configuração web (detectSessionInUrl para OAuth).
 */
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabasePublicConfig } from './supabaseConfig';

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = getSupabasePublicConfig();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
