/**
 * Web: converte URI (blob:, http:, data:) para base64 usando Fetch API.
 * Usado quando FileSystem não está disponível.
 */
export async function readImageAsBase64(uri) {
  if (!uri || typeof uri !== 'string') throw new Error('URI inválida');
  if (uri.startsWith('data:')) {
    const base64 = uri.split(',')[1];
    if (base64) return base64;
  }
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string' && result.startsWith('data:')) {
        resolve(result.split(',')[1] || '');
      } else {
        reject(new Error('Falha ao converter imagem'));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(blob);
  });
}
