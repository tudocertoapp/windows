/**
 * Configuração Expo - lê a chave Google Vision de variável de ambiente.
 * Crie um arquivo .env com: EXPO_PUBLIC_GOOGLE_VISION_API_KEY=sua_chave
 * O Expo carrega .env automaticamente ao iniciar.
 */
try { require('dotenv').config(); } catch (_) {}

const config = {
  expo: {
    name: 'Tudo Certo - Agenda e Finanças',
    slug: 'snack-833373eb-44e8-4aff-9e0e-96392f657b4c',
    version: '1.0.0',
    scheme: 'tudocerto',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    plugins: [
      ['expo-build-properties', { android: { enablePngCrunchInReleaseBuilds: false } }],
      ['expo-contacts', { contactsPermission: 'Permitir acessar contatos para importar e cadastrar clientes.' }],
      'expo-speech-recognition',
      ['expo-media-library', { photosPermission: 'Salvar imagens no álbum', savePhotosPermission: 'Salvar imagens geradas' }],
      ['expo-web-browser'],
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
      supportsTablet: true,
      infoPlist: {
        NSSpeechRecognitionUsageDescription: 'Allow $(PRODUCT_NAME) to use speech recognition.',
        NSMicrophoneUsageDescription: 'Allow $(PRODUCT_NAME) to use the microphone.',
        NSFaceIDUsageDescription: 'Use Face ID para revelar valores financeiros.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#111827',
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
    web: { favicon: './assets/favicon.png' },
    extra: {
      'expo-navigation-bar': { backgroundColor: '#00000000', position: 'relative', visibility: 'visible', barStyle: 'auto' },
      eas: { projectId: 'a78ed1ea-e90c-4080-b124-2536a33f7b5b' },
      googleVisionApiKey: process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || '',
    },
  },
};

module.exports = config;
