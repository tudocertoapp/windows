import { forVoice } from './dockSpeechText';
import { bumpDockVoiceEnergy } from './dockAudioPulse';
import { DOCK_VOICE_DEFAULT, resolveDockVoice } from '../constants/dockVoices';

/** Voz do Dock via speechSynthesis, com 5 presets escolhidos no palco. */

let selectedVoiceId = DOCK_VOICE_DEFAULT;
const voiceByPreset = new Map();
let voicesReady = false;

function foldName(v) {
  return `${v?.name || ''} ${v?.lang || ''}`.toLowerCase();
}

const FEM_RE = /maria|francisca|luciana|thalita|brenda|heloisa|helisa|vit[oó]ria|victoria|female|femin/;

function pickVoice(preset) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const cached = voiceByPreset.get(preset.id);
  if (cached) return cached;
  const list = window.speechSynthesis.getVoices() || [];
  if (!list.length) return null;
  voicesReady = true;
  const pt = list.filter((v) => /pt(-|_|\s)?br|portuguese/i.test(foldName(v)));
  const pool = pt.length ? pt : list;
  let pickFrom = pool;
  if (preset.gender === 'female') {
    const fem = pool.filter((v) => FEM_RE.test(foldName(v)));
    if (fem.length) pickFrom = fem;
  } else if (preset.gender === 'male') {
    const male = pool.filter((v) => !FEM_RE.test(foldName(v)));
    if (male.length) pickFrom = male;
  }
  let hit = null;
  for (const re of preset.prefer || []) {
    hit = pickFrom.find((v) => re.test(foldName(v)));
    if (hit) break;
  }
  hit = hit || pickFrom[0] || pool[0] || null;
  if (hit) voiceByPreset.set(preset.id, hit);
  return hit;
}

export function setDockVoiceId(id) {
  selectedVoiceId = resolveDockVoice(id).id;
}

export function getDockVoiceId() {
  return selectedVoiceId;
}

export function warmDockVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const grab = () => {
    voiceByPreset.clear();
    pickVoice(resolveDockVoice(selectedVoiceId));
  };
  grab();
  if (!voicesReady && window.speechSynthesis.addEventListener) {
    window.speechSynthesis.addEventListener('voiceschanged', grab, { once: true });
  } else {
    window.speechSynthesis.onvoiceschanged = grab;
  }
}

export function getDockVoice() {
  if (!voicesReady) warmDockVoices();
  return pickVoice(resolveDockVoice(selectedVoiceId));
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
export function speakDock(text, { speakingRef, onStart, onEnd, onBoundary, voiceId } = {}) {
  const said = forVoice(text);
  if (!said || typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd?.();
    return () => {};
  }
  warmDockVoices();
  try {
    window.speechSynthesis.cancel();
  } catch (_) {}

  const preset = resolveDockVoice(voiceId || selectedVoiceId);
  const u = new SpeechSynthesisUtterance(said);
  const voice = pickVoice(preset);
  if (voice) u.voice = voice;
  u.lang = voice?.lang || 'pt-BR';
  u.pitch = preset.pitch;
  u.rate = preset.rate;
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
