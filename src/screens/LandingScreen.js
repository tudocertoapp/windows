import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { playTapSound } from '../utils/sounds';

const logoImage = require('../../assets/logo.png');

export function LandingScreen({ onStart }) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={s.content}>
        <View style={s.logoSection}>
          <Image source={logoImage} style={s.logo} resizeMode="contain" />
          <View style={s.titleRow}>
            <Text style={[s.title, { color: colors.text }]}>TUDO CERTO</Text>
            <Ionicons name="checkmark-circle" size={36} color={colors.primary} style={{ marginLeft: 8 }} />
          </View>
        </View>

        <Text style={s.headline}>
          <Text style={{ color: colors.text }}>Sua vida, </Text>
          <Text style={{ color: colors.primary, fontWeight: '800' }}>organizada.</Text>
        </Text>

        <Text style={[s.description, { color: colors.textSecondary }]}>
          Pessoal ou empresa: agenda, tarefas e finanças juntos. Pra ficar tudo certo.
        </Text>
      </View>

      <TouchableOpacity
        style={[s.ctaBtn, { backgroundColor: colors.primary }]}
        onPress={() => {
          playTapSound();
          onStart?.();
        }}
        activeOpacity={0.85}
      >
        <Text style={s.ctaText}>Vamos começar</Text>
        <Ionicons name="arrow-forward" size={22} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 28, paddingVertical: 40 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 20 },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 80, height: 80, marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  headline: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 16, lineHeight: 34 },
  description: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 12 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
