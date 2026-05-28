import { supabase } from '../lib/supabase';

export function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''));
}

/**
 * Remove linha no Supabase (com user_id).
 * @returns {{ ok: true } | { ok: false, error: object }}
 */
export async function deleteSupabaseRow(table, id, userId) {
  const rowId = String(id || '');
  if (!rowId) return { ok: false, error: { message: 'ID inválido' } };
  if (!userId) return { ok: true };
  if (!isUuid(rowId)) return { ok: true };
  const { error } = await supabase.from(table).delete().eq('id', rowId).eq('user_id', userId);
  if (error) return { ok: false, error };
  return { ok: true };
}
