import Constants from 'expo-constants';

const DEFAULT_SUPABASE_URL = 'https://azvfiuvggppnulfepwbc.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6dmZpdXZnZ3BwbnVsZmVwd2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTc1OTUsImV4cCI6MjA4NTE5MzU5NX0.eZUbc2sveWDRCu_Nm6z0chP7T6-hqDJf7omatgiB2Pk';

/** URL + anon key do Supabase (app). Lê .env / app.config extra, com fallback do projeto. */
export function getSupabasePublicConfig() {
  const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
  const url =
    extra.supabaseUrl ||
    (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_SUPABASE_URL : '') ||
    DEFAULT_SUPABASE_URL;
  const anonKey =
    extra.supabaseAnonKey ||
    (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY : '') ||
    DEFAULT_SUPABASE_ANON_KEY;
  return { url: String(url).trim(), anonKey: String(anonKey).trim() };
}
