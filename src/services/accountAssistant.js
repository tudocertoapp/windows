import axios from 'axios';
import { supabase } from '../lib/supabase';
import { getAssistantChatEndpoint } from '../lib/assistantApi';

export async function askAccountAssistant({ message, history = [] }) {
  const endpoint = getAssistantChatEndpoint();
  if (!endpoint) {
    return { ok: false, error: 'Servidor do assistente não configurado. Faça deploy na Vercel ou use npm run web:api.' };
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    return { ok: false, error: 'Faça login para eu ler os dados da sua conta.' };
  }
  try {
    const { data } = await axios.post(
      endpoint,
      { message, history, task: 'assistant' },
      {
        timeout: 28000,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const reply = String(data?.reply || '').trim();
    if (!reply) return { ok: false, error: 'A IA não devolveu texto. Tente de novo.' };
    return { ok: true, reply, provider: data?.provider };
  } catch (e) {
    const msg = e?.response?.data?.error || e?.message || 'Não consegui falar com a IA agora.';
    return { ok: false, error: String(msg) };
  }
}
