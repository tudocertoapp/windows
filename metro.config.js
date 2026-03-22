const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');
const defaultResolver = require('metro-resolver').resolve;

const config = getDefaultConfig(__dirname);

// Usa "main" antes de "react-native" para que reanimated use lib/module/index (compilado)
// em vez de src/index (TypeScript que o Metro não resolve em node_modules).
config.resolver.resolverMainFields = ['main', 'react-native', 'browser'];

// Fallback: resolveRequest para garantir o entry do reanimated.
const reanimatedLib = path.resolve(
  __dirname,
  'node_modules',
  'react-native-reanimated',
  'lib',
  'module',
  'index.js'
);

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform, realModuleName) => {
  const norm = (moduleName || '').replace(/\\/g, '/').trim();
  if (norm === 'react-native-reanimated') {
    return { type: 'sourceFile', filePath: reanimatedLib };
  }
  if (platform === 'web') {
    const webStubs = {
      '@react-native-voice/voice': path.join(__dirname, 'src', 'utils', 'voiceStub.web.js'),
      'expo-speech-recognition': path.join(__dirname, 'src', 'utils', 'voiceStub.web.js'),
    };
    if (webStubs[norm]) {
      return { type: 'sourceFile', filePath: webStubs[norm] };
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform, realModuleName);
  }
  return defaultResolver(
    { ...context, resolveRequest: defaultResolver },
    moduleName,
    platform,
    realModuleName
  );
};

module.exports = config;
