/**
 * Configuração Expo - lê a chave Google Vision de variável de ambiente.
 * Crie um arquivo .env com: EXPO_PUBLIC_GOOGLE_VISION_API_KEY=sua_chave
 * O Expo carrega .env automaticamente ao iniciar.
 *
 * Versão mobile: edite mobile-version.json (ou `npm run sync:mobile-version`).
 * android.versionCode e ios.buildNumber derivam automaticamente do semver (monótonos).
 */
try { require('dotenv').config(); } catch (_) {}

const fs = require('fs');
const path = require('path');

const mobilePath = path.join(__dirname, 'mobile-version.json');
let MOBILE_APP_VERSION = '1.0.10';
if (fs.existsSync(mobilePath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(mobilePath, 'utf8'));
    MOBILE_APP_VERSION = (raw.version || MOBILE_APP_VERSION).trim() || MOBILE_APP_VERSION;
  } catch (_) {}
}

/** major*1e6 + minor*1e3 + patch — até 999 por segmento (Play / App Store monótonos com semver crescente). */
function semverToNativeBuildNumber(semver) {
  const base = String(semver).split('-')[0];
  const m = base.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return 1;
  const major = Math.min(999, parseInt(m[1], 10) || 0);
  const minor = Math.min(999, parseInt(m[2], 10) || 0);
  const patch = Math.min(999, parseInt(m[3], 10) || 0);
  return major * 1_000_000 + minor * 1_000 + patch;
}

const nativeBuild = semverToNativeBuildNumber(MOBILE_APP_VERSION);

const config = {
  expo: {
    name: 'Tudo Certo - Agenda e Finanças',
    slug: 'snack-833373eb-44e8-4aff-9e0e-96392f657b4c',
    version: MOBILE_APP_VERSION,
    scheme: 'tudocerto',
    orientation: 'portrait',
    icon: './assets/icon-safe.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    plugins: [
      ['expo-build-properties', { android: { enablePngCrunchInReleaseBuilds: false } }],
      [
        'expo-image-picker',
        {
          photosPermission: 'O app precisa acessar suas fotos para enviar comprovantes em Meus gastos.',
          cameraPermission: 'O app precisa da câmera para fotografar comprovantes em Meus gastos.',
        },
      ],
      ['expo-contacts', { contactsPermission: 'Permitir acessar contatos para importar e cadastrar clientes.' }],
      'expo-speech-recognition',
      ['expo-media-library', { photosPermission: 'Salvar imagens no álbum', savePhotosPermission: 'Salvar imagens geradas' }],
      ['expo-web-browser', { experimentalLauncherActivity: true }],
      ['expo-navigation-bar', { backgroundColor: '#00000000', position: 'relative', visibility: 'visible', barStyle: 'auto' }],
      [
        '@react-native-community/datetimepicker',
        {
          android: {
            timePicker: {
              numbersSelectorColor: { light: '#10b981', dark: '#10b981' },
              numbersTextColor: { light: '#1f2937', dark: '#f9fafb' },
            },
          },
        },
      ],
      'expo-font',
      '@react-native-voice/voice',
    ],
    ios: {
      buildNumber: String(nativeBuild),
      supportsTablet: true,
      infoPlist: {
        NSSpeechRecognitionUsageDescription:
          'O Tudo Certo usa reconhecimento de voz para registrar gastos e comandos pelo microfone.',
        NSMicrophoneUsageDescription:
          'O Tudo Certo precisa do microfone para transcrever o que você fala em Meus gastos e no assistente.',
        NSFaceIDUsageDescription: 'Use Face ID para revelar valores financeiros.',
        NSCameraUsageDescription: 'Fotografar comprovantes para registrar gastos.',
        NSPhotoLibraryUsageDescription: 'Escolher fotos de comprovantes na galeria.',
      },
    },
    android: {
      versionCode: nativeBuild,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon-safe.png',
        backgroundColor: '#000000',
      },
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: false,
          data: [
            { scheme: 'tudocerto', host: 'auth', pathPrefix: '/callback' },
            { scheme: 'tudocerto', pathPrefix: '/' },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
      permissions: [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO',
        'android.permission.READ_MEDIA_AUDIO',
      ],
      package: 'com.tudocertoapp.snack833373eb44e84aff9e0e96392f657b4c',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      'expo-navigation-bar': { backgroundColor: '#00000000', position: 'relative', visibility: 'visible', barStyle: 'auto' },
      eas: { projectId: 'a78ed1ea-e90c-4080-b124-2536a33f7b5b' },
      googleVisionApiKey: process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || '',
    },
  },
};

module.exports = config;
