import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { useMenu } from '../contexts/MenuContext';
import { MeusGastosChat } from '../components/MeusGastosChat';
import { DockMascot } from '../components/DockMascot';
import { useDockMascot } from '../contexts/DockMascotContext';
import { VisionOcrStatusBadge } from '../components/VisionOcrStatusBadge';
import { TopBar } from '../components/TopBar';
import { ViewModeToggle } from '../components/ViewModeToggle';
import { useIsDesktopLayout } from '../utils/platformLayout';

export function MeusGastosScreen({ onClose, isModal = false }) {
  const { colors } = useTheme();
  const { cue } = useDockMascot();
  const { viewMode, setViewMode, canToggleView, showEmpresaFeatures, planFeatures } = usePlan();
  const { openCalculadoraFull, openMensagensWhatsApp } = useMenu();
  const isWeb = Platform.OS === 'web';
  const isDesktopLayout = useIsDesktopLayout();
  const useWebLayout = isWeb && isDesktopLayout;
  const [ocrReady, setOcrReady] = useState(null);
  const onOcrStatusChange = useCallback((result) => {
    setOcrReady(result?.status === 'ok');
  }, []);
  const now = new Date();
  const headerDate = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

  return (
    <SafeAreaView
      style={{ flex: 1, minHeight: 0, backgroundColor: colors.bg }}
      edges={isModal ? ['left', 'right', 'bottom', 'top'] : ['left', 'right', 'bottom']}
    >
      {!isModal ? (
        <>
          <TopBar
            title="Dock"
            colors={colors}
            useLogoImage
            hideOrganize
            headerDate={headerDate}
            deferFinancePrompt
            inlineToggle={useWebLayout && canToggleView ? <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} colors={colors} inline desktopHeaderSplit /> : null}
            onCalculadora={useWebLayout ? openCalculadoraFull : undefined}
            onWhatsApp={showEmpresaFeatures ? openMensagensWhatsApp : undefined}
          />
          {!(useWebLayout && canToggleView) && canToggleView && (
            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} colors={colors} />
          )}
        </>
      ) : (
        <View style={[s.header, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0, flex: 1, overflow: 'visible' }}>
            <DockMascot expression={cue?.expression || 'feliz'} size={52} />
            <Text style={[s.headerTitle, { color: colors.text }]}>Dock</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={[s.headerBtn, { backgroundColor: colors.primaryRgba(0.2) }]}>
            <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {!planFeatures?.canUseMeusGastos ? (
        <View style={[s.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 8 }}>
            Recurso disponível apenas nos planos pagos.
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            Atualize seu plano para liberar o Dock.
          </Text>
        </View>
      ) : (
        <>
          <View style={[s.infoCard, { backgroundColor: colors.card, borderColor: colors.border, overflow: 'hidden' }]}>
            {!isModal ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, overflow: 'visible' }}>
                <DockMascot expression={cue?.expression || 'feliz'} size={64} />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>Dock</Text>
              </View>
            ) : null}
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
              Conversa com o Dock: comprovante, áudio ou texto. A foto é reduzida no aparelho e lida no servidor.
            </Text>
            <VisionOcrStatusBadge colors={colors} onStatusChange={onOcrStatusChange} />
          </View>
          <View style={s.chatWrap}>
            <MeusGastosChat transparentBg={false} ocrEnabled={ocrReady !== false} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  chatWrap: { flex: 1, minHeight: 0, minWidth: 0 },
  header: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  infoCard: { margin: 12, marginBottom: 4, padding: 12, borderRadius: 12, borderWidth: 1 },
});
