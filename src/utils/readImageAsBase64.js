/**
 * Native: converte URI de arquivo para base64 usando FileSystem.
 */
import * as FileSystem from 'expo-file-system/legacy';

export async function readImageAsBase64(uri) {
  if (!uri || typeof uri !== 'string') throw new Error('URI inválida');
  return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}
