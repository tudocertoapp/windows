import * as Haptics from 'expo-haptics';

/**
 * Som de toque leve, estilo iOS.
 */
export async function playTapSound() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (_) {}
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
