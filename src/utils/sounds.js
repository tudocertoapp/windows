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
