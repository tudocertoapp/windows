import { forVoice } from './dockSpeechText';
import { bumpDockVoiceEnergy } from './dockAudioPulse';

/** Voz do Dock: masculina, séria, pt-BR. */

let cachedVoice = null;
let voicesReady = false;

function foldName(v) {
  return `${v?.name || ''} ${v?.lang || ''}`.toLowerCase();
}

export function warmDockVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const grab = () => {
    const list = window.speechSynthesis.getVoices() || [];
    if (!list.length) return;
    voicesReady = true;
    const pt = list.filter((v) => /pt(-|_|\s)?br|portuguese/i.test(foldName(v)));
    const pool = pt.length ? pt : list;
    const avoidFem = /maria|francisca|luciana|thalita|brenda|heloisa|helisa|vit[oó]ria|victoria|female|femin/;
    const prefer = [
      /microsoft antonio/,
      /antonio/,
      /microsoft daniel/,
      /daniel/,
      /google português do brasil/,
      /ricardo/,
      /felipe/,
      /google português/,
      /pt-br/,
    ];
    const malePool = pool.filter((v) => !avoidFem.test(foldName(v)));
    const pickFrom = malePool.length ? malePool : pool;
    for (const re of prefer) {
      const hit = pickFrom.find((v) => re.test(foldName(v)));
      if (hit) {
        cachedVoice = hit;
        return;
      }
    }
    cachedVoice = pickFrom[0] || pool[0] || null;
  };
  grab();
  if (!voicesReady && window.speechSynthesis.addEventListener) {
    window.speechSynthesis.addEventListener('voiceschanged', grab, { once: true });
  } else {
    window.speechSynthesis.onvoiceschanged = grab;
  }
}

export function getDockVoice() {
  if (!cachedVoice) warmDockVoices();
  return cachedVoice;
}

export function stopDockSpeak() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch (_) {}
}

/**
 * Fala com a voz do Dock. onBoundary dispara a cada palavra (legenda ao vivo).
 */
export function speakDock(text, { speakingRef, onStart, onEnd, onBoundary } = {}) {
  const said = forVoice(text);
  if (!said || typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd?.();
    return () => {};
  }
  warmDockVoices();
  try {
    window.speechSynthesis.cancel();
  } catch (_) {}

  const u = new SpeechSynthesisUtterance(said);
  const voice = getDockVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang || 'pt-BR';
  u.pitch = 0.9;
  u.rate = 1.14;
  u.volume = 1;

  if (speakingRef) speakingRef.current = true;
  u.onstart = () => {
    if (speakingRef) speakingRef.current = true;
    bumpDockVoiceEnergy(0.85);
    onStart?.(said);
  };
  u.onboundary = (ev) => {
    if (ev?.name && ev.name !== 'word') return;
    bumpDockVoiceEnergy(0.95);
    const i = Number(ev.charIndex || 0);
    const chunk = said.slice(0, Math.min(said.length, i + Math.max(1, Number(ev.charLength || 8))));
    onBoundary?.(chunk, said);
  };
  const done = () => {
    if (speakingRef) speakingRef.current = false;
    onEnd?.();
  };
  u.onend = done;
  u.onerror = done;

  const kick = () => {
    try {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      window.speechSynthesis.speak(u);
    } catch (_) {
      done();
    }
  };
  kick();

  return () => {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
    done();
  };
}

export const DOCK_INTRO = () => 'Pode falar.';
