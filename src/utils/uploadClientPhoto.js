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
export async function uploadClientPhoto(base64Data, userId, clientId) {
  if (!userId) throw new Error('userId é obrigatório');
  if (!base64Data) throw new Error('Dados da imagem são obrigatórios');

  const arrayBuffer = decode(base64Data);
  const uniqueId = clientId || `temp-${Date.now()}`;
  const path = `${userId}/clients/${uniqueId}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
