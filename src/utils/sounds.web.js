/**
 * Web: haptics não disponível; sons de gravação via Web Audio (paridade com sounds.js).
 */
export function playTapSound() {}

export async function playRecordingBeep() {}

function playWebUiTone(freqHz, durationMs) {
  try {
    if (typeof window === 'undefined') return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freqHz;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t0 = ctx.currentTime;
    const dur = durationMs / 1000;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.15, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
    setTimeout(() => ctx.close?.().catch(() => {}), Math.ceil(durationMs + 120));
  } catch (_) {}
}

export function playPdvOpenSound() {
  playWebUiTone(780, 85);
}

export function playPdvAddItemSound() {
  playWebUiTone(910, 70);
}

export function playPdvEditItemSound() {
  playWebUiTone(620, 60);
}

export function playPdvRemoveItemSound() {
  playWebUiTone(420, 110);
}

function playWebRecordTone(freqHz, durationMs) {
  try {
    if (typeof window === 'undefined') return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freqHz;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t0 = ctx.currentTime;
    const dur = durationMs / 1000;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
    setTimeout(() => ctx.close?.().catch(() => {}), Math.ceil(durationMs + 120));
  } catch (_) {}
}

/** Igual a sounds.js — necessário porque o Metro resolve `sounds.web.js` na plataforma web. */
export function playVoiceRecordingStartSound() {
  playWebRecordTone(900, 95);
}

export function playVoiceRecordingStopSound() {
  playWebRecordTone(520, 115);
}
