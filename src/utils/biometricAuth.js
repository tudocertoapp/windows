import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Solicita autenticação biométrica (Face ID / Touch ID / impressão digital)
 * ou PIN/senha do dispositivo para revelar valores sensíveis.
 * @returns {Promise<boolean>} true se autenticado com sucesso
 */
export async function authenticateToRevealValues() {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return true;
    }
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return true;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Autentique-se para visualizar os valores',
      fallbackLabel: 'Usar senha do dispositivo',
      disableDeviceFallback: false,
    });
    return result?.success === true;
  } catch (_) {
    return false;
  }
}
