import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://azvfiuvggppnulfepwbc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6dmZpdXZnZ3BwbnVsZmVwd2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTc1OTUsImV4cCI6MjA4NTE5MzU5NX0.eZUbc2sveWDRCu_Nm6z0chP7T6-hqDJf7omatgiB2Pk';

// Na web, detecta o hash #access_token no retorno do OAuth para restaurar a sessão
const isWeb = Platform.OS === 'web';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
    flowType: 'pkce',
  },
});
