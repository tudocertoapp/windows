/**
 * Microfone contínuo: um stream getUserMedia fica aberto (ícone do Chrome estável)
 * e um único SpeechRecognition, sem abortar a cada silêncio.
 */

function ctor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isWebSpeechAvailable() {
  return !!ctor();
}

export async function micPermissionState() {
  try {
    const perm = await navigator.permissions?.query?.({ name: 'microphone' });
    return String(perm?.state || 'unknown');
  } catch (_) {
    return 'unknown';
  }
}

let rec = null;
let owner = null;
let keepAlive = false;
let running = false;
let heldStream = null;
let handlers = { onResult: null, onError: null, onEnd: null };
const registry = Object.create(null);

function applyOwner(nextOwner) {
  owner = nextOwner;
  handlers = registry[nextOwner] || { onResult: null, onError: null, onEnd: null };
}

function ensureRec() {
  if (rec) return rec;
  const Ctor = ctor();
  if (!Ctor) return null;
  rec = new Ctor();
  rec.lang = 'pt-BR';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.onresult = (ev) => {
    running = true;
    handlers.onResult?.(ev);
  };
  rec.onerror = (ev) => {
    const code = String(ev?.error || '');
    if (code === 'no-speech' || code === 'aborted') return;
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      keepAlive = false;
      running = false;
      handlers.onError?.(ev);
    }
  };
  rec.onstart = () => {
    running = true;
  };
  rec.onend = () => {
    running = false;
    handlers.onEnd?.();
    if (!keepAlive || !owner) return;
    window.setTimeout(tryStart, 80);
  };
  return rec;
}

function tryStart() {
  const r = ensureRec();
  if (!r || !keepAlive) return;
  if (running) return;
  try {
    r.start();
    running = true;
  } catch (_) {
    running = false;
  }
}

export function registerWebSpeech(name, nextHandlers) {
  registry[name] = nextHandlers || {};
  if (owner === name) handlers = registry[name];
}

export function unregisterWebSpeech(name) {
  if (registry[name] === handlers) {
    handlers = { onResult: null, onError: null, onEnd: null };
  }
  delete registry[name];
}

export async function unlockWebMic() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('mic-unsupported');
  }
  if (heldStream && heldStream.getTracks().some((t) => t.readyState === 'live')) {
    return true;
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
  heldStream = stream;
  stream.getAudioTracks().forEach((t) => {
    t.enabled = true;
  });
  return true;
}

export function startWebSpeech(name) {
  if (!ctor()) throw new Error('speech-unsupported');
  applyOwner(name);
  keepAlive = true;
  tryStart();
  return true;
}

export function stopWebSpeech(name) {
  if (name && owner && owner !== name) return;
  if (name === 'dictation' && registry.wake) {
    applyOwner('wake');
    keepAlive = true;
    tryStart();
    return;
  }
  keepAlive = false;
  running = false;
  owner = null;
  try {
    rec?.stop();
  } catch (_) {}
}

export function takeWebSpeech(name) {
  applyOwner(name);
  keepAlive = true;
  tryStart();
  return true;
}

export function getHeldStream() {
  return heldStream;
}
