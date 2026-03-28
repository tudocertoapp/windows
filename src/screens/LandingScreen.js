import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { playTapSound } from '../utils/sounds';
import { useIsDesktopLayout } from '../utils/platformLayout';

const logoImage = require('../../assets/logo.png');

export function LandingScreen({ onStart }) {
  const { colors } = useTheme();
  const isWebDesktop = Platform.OS === 'web' && useIsDesktopLayout();

  const body = (
    <>
      <View style={[s.logoSection, isWebDesktop && s.logoSectionDesktop]}>
        <Image source={logoImage} style={[s.logo, isWebDesktop && s.logoDesktop]} resizeMode="contain" />
        <View style={s.titleRow}>
          <Text style={[s.title, isWebDesktop && s.titleDesktop, { color: colors.text }]}>TUDO CERTO</Text>
        </View>
      </View>

      <Text style={[s.headline, isWebDesktop && s.headlineDesktop]}>
        <Text style={{ color: colors.text }}>Sua vida, </Text>
        <Text style={{ color: colors.primary, fontWeight: '800' }}>organizada.</Text>
      </Text>

      <Text style={[s.description, isWebDesktop && s.descriptionDesktop, { color: colors.textSecondary }]}>
        Pessoal ou empresa: agenda, tarefas e finanças juntos. Pra ficar tudo certo.
      </Text>
    </>
  );

  const cta = (
    <TouchableOpacity
      style={[s.ctaBtn, isWebDesktop && s.ctaBtnDesktop, { backgroundColor: colors.primary }]}
      onPress={() => {
        playTapSound();
        onStart?.();
      }}
      activeOpacity={0.85}
    >
      <Text style={[s.ctaText, isWebDesktop && s.ctaTextDesktop]}>Vamos começar</Text>
      <Ionicons name="arrow-forward" size={isWebDesktop ? 16 : 22} color="#fff" />
    </TouchableOpacity>
  );

  if (isWebDesktop) {
    return (
      <SafeAreaView style={[s.containerDesktopOuter, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <View style={s.desktopColumn}>
          {body}
          {cta}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={s.content}>{body}</View>
      {cta}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 28, paddingVertical: 40 },
  containerDesktopOuter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  /** Bloco único centrado na viewport: texto + botão logo abaixo (sem colar no rodapé). */
  desktopColumn: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    alignSelf: 'center',
  },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 20 },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoSectionDesktop: { marginBottom: 18 },
  logo: { width: 80, height: 80, marginBottom: 16 },
  logoDesktop: { width: 52, height: 52, marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  titleDesktop: { fontSize: 20 },
  headline: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 16, lineHeight: 34 },
  headlineDesktop: { fontSize: 19, lineHeight: 26, marginBottom: 12 },
  description: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 12 },
  descriptionDesktop: { fontSize: 14, lineHeight: 21, paddingHorizontal: 4, marginBottom: 22 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  ctaBtnDesktop: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 11,
    marginBottom: 0,
    marginTop: 0,
    maxWidth: 200,
    width: '100%',
    alignSelf: 'center',
    gap: 8,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  ctaTextDesktop: { fontSize: 14, fontWeight: '600' },
});
