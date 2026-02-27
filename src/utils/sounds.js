import * as Haptics from 'expo-haptics';

/**
 * Som de toque leve, estilo iOS.
 * No iOS usa apenas haptic (feedback tátil nativo).
 * No Android usa haptic light para sensação similar.
 */
export async function playTapSound() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (_) {}
}
