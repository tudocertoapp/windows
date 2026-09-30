let workerPromise = null;
let tesseractPromise = null;

function loadTesseractFromCdn() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('OCR local só funciona no navegador.'));
  }
  if (window.Tesseract?.createWorker) return Promise.resolve(window.Tesseract);
  if (tesseractPromise) return tesseractPromise;
  tesseractPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-tudocerto-tesseract]');
    if (existing && window.Tesseract?.createWorker) {
      resolve(window.Tesseract);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    script.async = true;
    script.dataset.tudocertoTesseract = '1';
    script.onload = () => {
      if (window.Tesseract?.createWorker) resolve(window.Tesseract);
      else reject(new Error('Não carreguei o leitor de imagem.'));
    };
    script.onerror = () => reject(new Error('Sem internet para carregar o leitor de comprovante.'));
    document.head.appendChild(script);
  });
  return tesseractPromise;
}

async function imageToDataUrl(image) {
  if (!image) throw new Error('Imagem ausente');
  if (typeof image === 'string') {
    if (image.startsWith('data:')) return image;
    const res = await fetch(image);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string' && result.startsWith('data:')) resolve(result);
        else reject(new Error('Falha ao converter imagem'));
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(blob);
    });
  }
  if (typeof image === 'object') {
    if (typeof image.base64 === 'string' && image.base64.trim()) {
      const b = image.base64.trim();
      return b.startsWith('data:') ? b : `data:image/jpeg;base64,${b}`;
    }
    if (typeof image.uri === 'string' && image.uri.trim()) {
      return imageToDataUrl(image.uri);
    }
  }
  throw new Error('Formato de imagem inválido');
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const Tesseract = await loadTesseractFromCdn();
      return Tesseract.createWorker('por+eng');
    })();
  }
  return workerPromise;
}

/** OCR no navegador (Tesseract via CDN). Sem Google Vision e sem empacotar tesseract.js no Metro. */
export async function localOcrText(image) {
  const dataUrl = await imageToDataUrl(image);
  const worker = await getWorker();
  const { data } = await worker.recognize(dataUrl);
  const text = String(data?.text || '').trim();
  if (!text) throw new Error('Não encontrei texto nítido na foto. Tente outra imagem, mais próxima e com boa luz.');
  return text;
}

export function isLocalOcrAvailable() {
  return true;
}
