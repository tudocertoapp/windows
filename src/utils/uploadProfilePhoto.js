/**
 * Faz upload da foto do perfil para Supabase Storage e retorna a URL pública.
 * A foto é salva em avatars/{userId}/avatar.jpg para persistir entre sessões.
 *
 * Pré-requisito: criar bucket "avatars" no Supabase Storage com acesso público.
 * Dashboard > Storage > New bucket > nome: avatars, Public: ON
 */
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';

const BUCKET = 'avatars';

/**
 * @param {string} base64Data - Base64 da imagem (ex: resultado de ImagePicker com base64: true)
 * @param {string} userId - ID do usuário
 * @returns {Promise<string>} URL pública da foto
 */
export async function uploadProfilePhotoFromBase64(base64Data, userId) {
  if (!userId) throw new Error('userId é obrigatório');
  if (!base64Data) throw new Error('Dados da imagem são obrigatórios');

  const arrayBuffer = decode(base64Data);
  const path = `${userId}/avatar.jpg`;

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
