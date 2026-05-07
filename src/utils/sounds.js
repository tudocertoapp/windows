import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

/**
 * Som de toque leve, estilo iOS.
 * Não bloqueia a UI — em APK/release, await no haptic pode travar o app.
 */
export function playTapSound() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

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
  if (Platform.OS === 'web') {
    playWebUiTone(780, 85);
    return;
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function playPdvAddItemSound() {
  if (Platform.OS === 'web') {
    playWebUiTone(910, 70);
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function playPdvEditItemSound() {
  if (Platform.OS === 'web') {
    playWebUiTone(620, 60);
    return;
  }
  Haptics.selectionAsync().catch(() => {});
}

export function playPdvRemoveItemSound() {
  if (Platform.OS === 'web') {
    playWebUiTone(420, 110);
    return;
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

/**
 * Feedback de "gravando" - haptic médio por 1-2 segundos (2 pulsos).
 */
export async function playRecordingBeep() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 800);
  } catch (_) {}
}

/** Bipe curto estilo apps de mensagem (início de gravação de voz). */
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

let nativeStartSound;
let nativeStopSound;
let nativeAudioModeSet;
let nativeBrandIntroSound;

async function ensureNativeRecordSounds() {
  if (Platform.OS === 'web') return;
  try {
    if (!nativeAudioModeSet) {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      nativeAudioModeSet = true;
    }
    if (!nativeStartSound) {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/voice_record_start.wav'),
        { shouldPlay: false },
      );
      nativeStartSound = sound;
    }
    if (!nativeStopSound) {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/voice_record_stop.wav'),
        { shouldPlay: false },
      );
      nativeStopSound = sound;
    }
  } catch (_) {}
}

async function ensureNativeBrandIntroSound() {
  if (Platform.OS === 'web') return;
  try {
    if (!nativeAudioModeSet) {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      nativeAudioModeSet = true;
    }
    if (!nativeBrandIntroSound) {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/brand_intro_tc_v1.wav'),
        { shouldPlay: false },
      );
      nativeBrandIntroSound = sound;
    }
  } catch (_) {}
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

/** Som assinatura do app: tocar uma vez na primeira abertura (splash inicial). */
export function playBrandIntroSound() {
  if (Platform.OS === 'web') {
    playWebBrandIntro();
    return;
  }
  (async () => {
    try {
      await ensureNativeBrandIntroSound();
      await nativeBrandIntroSound?.setPositionAsync(0);
      await nativeBrandIntroSound?.playAsync();
    } catch (_) {}
  })();
}

/**
 * Som ao começar a gravar voz (similar ao feedback de apps como WhatsApp).
 */
export function playVoiceRecordingStartSound() {
  if (Platform.OS === 'web') {
    playWebRecordTone(900, 95);
    return;
  }
  (async () => {
    try {
      await ensureNativeRecordSounds();
      await nativeStartSound?.setPositionAsync(0);
      await nativeStartSound?.playAsync();
    } catch (_) {}
  })();
}

/**
 * Som ao parar a gravação de voz.
 */
export function playVoiceRecordingStopSound() {
  if (Platform.OS === 'web') {
    playWebRecordTone(520, 115);
    return;
  }
  (async () => {
    try {
      await ensureNativeRecordSounds();
      await nativeStopSound?.setPositionAsync(0);
      await nativeStopSound?.playAsync();
    } catch (_) {}
  })();
}
