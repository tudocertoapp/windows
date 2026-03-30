import React from 'react';
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
import { TopBar } from '../components/TopBar';
import { ViewModeToggle } from '../components/ViewModeToggle';
import { useIsDesktopLayout } from '../utils/platformLayout';

export function MeusGastosScreen({ onClose, isModal = false }) {
  const { colors } = useTheme();
  const { viewMode, setViewMode, canToggleView, showEmpresaFeatures } = usePlan();
  const { openCalculadoraFull, openMensagensWhatsApp } = useMenu();
  const isWeb = Platform.OS === 'web';
  const isDesktopLayout = useIsDesktopLayout();
  const useWebLayout = isWeb && isDesktopLayout;
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
            title="Meus gastos"
            colors={colors}
            useLogoImage
            hideOrganize
            headerDate={headerDate}
            deferFinancePrompt
            inlineToggle={useWebLayout && canToggleView ? <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} colors={colors} inline /> : null}
            onCalculadora={useWebLayout ? openCalculadoraFull : undefined}
            onWhatsApp={showEmpresaFeatures ? openMensagensWhatsApp : undefined}
          />
          {!(useWebLayout && canToggleView) && canToggleView && (
            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} colors={colors} />
          )}
        </>
      ) : (
        <View style={[s.header, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Meus gastos</Text>
          <TouchableOpacity onPress={onClose} style={[s.headerBtn, { backgroundColor: colors.primaryRgba(0.2) }]}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[s.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
          Linha do tempo de gastos: envie comprovante, áudio ou texto que o sistema interpreta e registra sem IA generativa.
        </Text>
      </View>
      {/* flex:1 + minHeight:0 + height:0 (web desktop): força o Yoga/CSS a limitar altura para a barra de input não ficar abaixo da viewport */}
      <View
        style={[
          s.chatWrap,
          useWebLayout && isWeb ? { height: 0, overflow: 'hidden' } : null,
        ]}
      >
        <MeusGastosChat transparentBg={false} />
      </View>
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
