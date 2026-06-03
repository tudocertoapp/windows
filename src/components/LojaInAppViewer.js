import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { buildLojaPublicUrl } from '../utils/lojaPublicLink';
import { LojaPublicaScreen } from '../screens/LojaPublicaScreen';
import { playTapSound } from '../utils/sounds';

let WebViewComponent = null;
if (Platform.OS !== 'web') {
  try {
    WebViewComponent = require('react-native-webview').WebView;
  } catch (_) {
    WebViewComponent = null;
  }
}

export function LojaInAppViewer({ ownerUserId, title, onClose, colors }) {
  const [loading, setLoading] = useState(true);
  const url = buildLojaPublicUrl(ownerUserId);
  const headerTitle = title || 'Loja';

  const useEmbeddedNative = Platform.OS !== 'web' && WebViewComponent;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => { playTapSound(); onClose?.(); }} style={s.backBtn} accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>{headerTitle}</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>Agendar · Carrinho · WhatsApp</Text>
        </View>
        <TouchableOpacity onPress={() => { playTapSound(); onClose?.(); }} style={s.backBtn}>
          <Ionicons name="close" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {useEmbeddedNative ? (
        <View style={{ flex: 1 }}>
          {loading && (
            <View style={s.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Abrindo loja...</Text>
            </View>
          )}
          <WebViewComponent
            source={{ uri: url }}
            style={{ flex: 1, opacity: loading ? 0 : 1 }}
            onLoadEnd={() => setLoading(false)}
            startInLoadingState={false}
            javaScriptEnabled
            domStorageEnabled
            allowsBackForwardNavigationGestures
            setSupportMultipleWindows={false}
          />
        </View>
      ) : (
        <LojaPublicaScreen ownerUserId={ownerUserId} />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub: { fontSize: 11, marginTop: 2 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
});
