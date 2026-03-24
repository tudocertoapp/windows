import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { MeusGastosChat } from '../components/MeusGastosChat';

export function MeusGastosScreen({ onClose, isModal }) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom', 'top']}>
      <View style={[s.header, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Meus gastos</Text>
        {isModal && (
          <TouchableOpacity onPress={onClose} style={[s.headerBtn, { backgroundColor: colors.primaryRgba(0.2) }]}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[s.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
          Linha do tempo de gastos: envie comprovante, áudio ou texto que o sistema interpreta e registra sem IA generativa.
        </Text>
      </View>
      <MeusGastosChat transparentBg={false} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
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

