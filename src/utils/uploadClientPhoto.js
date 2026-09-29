/**
 * Faz upload da foto do cliente para Supabase Storage e retorna a URL pública.
 * Usa o bucket "avatars" com path {userId}/clients/{uniqueId}.jpg
 *
 * Pré-requisito: política de storage que permita avatars/{userId}/clients/*
 * (a política existente de avatars usa (storage.foldername(name))[1] = userId)
 */
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';

const BUCKET = 'avatars';

/**
 * @param {string} base64Data - Base64 da imagem (ex: ImagePicker com base64: true)
 * @param {string} userId - ID do usuário
 * @param {string} [clientId] - ID do cliente (opcional, para edição)
 * @returns {Promise<string>} URL pública da foto
 */
/**
 * @param {string} base64Data
 * @param {string} userId
 * @param {string} [clientId]
 * @param {{ ext?: string, contentType?: string }} [options]
 */
export async function uploadClientPhoto(base64Data, userId, clientId, options = {}) {
  if (!userId) throw new Error('userId é obrigatório');
  if (!base64Data) throw new Error('Dados da imagem são obrigatórios');

  const raw = String(base64Data).includes(',') ? String(base64Data).split(',')[1] : base64Data;
  const arrayBuffer = decode(raw);
  const uniqueId = clientId || `temp-${Date.now()}`;
  const ext = options.ext || 'jpg';
  const contentType = options.contentType || 'image/jpeg';
  const path = `${userId}/clients/${uniqueId}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType,
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
