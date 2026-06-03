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

function playWebBrandIntro() {
  try {
    if (typeof window === 'undefined') return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const notes = [
      { f: 392, d: 0.16, g: 0.20 },
      { f: 523.25, d: 0.16, g: 0.23 },
      { f: 659.25, d: 0.20, g: 0.26 },
      { f: 784, d: 0.30, g: 0.28 },
    ];
    let t = ctx.currentTime + 0.02;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, t);
      osc.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(n.g, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + n.d);
      osc.start(t);
      osc.stop(t + n.d + 0.03);
      t += n.d + 0.03;
    }
    setTimeout(() => ctx.close?.().catch(() => {}), 1800);
  } catch (_) {}
}

export function playBrandIntroSound() {
  playWebBrandIntro();
}
