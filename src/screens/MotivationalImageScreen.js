import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Image, SafeAreaView, TextInput, Alert, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getQuoteOfDay } from '../utils/quotes';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

const logoImage = require('../../assets/logo.png');
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;
const CARD_HEIGHT = Math.round(CARD_WIDTH * (16 / 9)); // 9:16 formato Stories Instagram
/** Visor na tela = 15% do cartão; captura (ViewShot) mantém CARD_* para qualidade ao partilhar. */
const PREVIEW_SCALE = 0.15;
const PREVIEW_W = Math.round(CARD_WIDTH * PREVIEW_SCALE);
const PREVIEW_H = Math.round(CARD_HEIGHT * PREVIEW_SCALE);

const CTA_PHRASE = 'Agenda e finanças em um app. Tudo Certo.';

const BACKGROUNDS = [
  { id: 'roxo', colors: ['#667eea', '#764ba2'], label: 'Roxo' },
  { id: 'rosa', colors: ['#f093fb', '#f5576c'], label: 'Rosa' },
  { id: 'ceu', colors: ['#4facfe', '#00f2fe'], label: 'Céu' },
  { id: 'verde', colors: ['#43e97b', '#38f9d7'], label: 'Verde' },
  { id: 'pordosol', colors: ['#fa709a', '#fee140'], label: 'Pôr do sol' },
  { id: 'natureza', colors: ['#134e5e', '#71b280', '#a8e6cf'], label: 'Natureza' },
];

const mis = StyleSheet.create({
  card: { margin: 16, borderRadius: 20, overflow: 'hidden' },
  quoteArea: { flex: 1, justifyContent: 'center', padding: 24, alignItems: 'center' },
  quoteText: { fontSize: 20, fontWeight: '600', fontStyle: 'italic', textAlign: 'center', lineHeight: 30 },
  logoArea: { padding: 16, alignItems: 'center' },
  logo: { width: 48, height: 48 },
  cta: { fontSize: 12, marginTop: 8, fontWeight: '600', letterSpacing: 0.5 },
  bgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16, justifyContent: 'center' },
  bgOption: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16, margin: 16 },
  customInput: { borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 80, textAlignVertical: 'top' },
});

export function MotivationalImageScreen({ onClose, isModal, initialQuote, initialQuoteType }) {
  const { colors } = useTheme();
  const viewShotRef = useRef(null);
  const [bg, setBg] = useState(BACKGROUNDS[0]);
  const [quoteType, setQuoteType] = useState(initialQuoteType || 'motivacional');
  const [customText, setCustomText] = useState(initialQuote || '');
  const [showLogo, setShowLogo] = useState(true);
  const baseQuote = getQuoteOfDay(quoteType);
  const quote = customText.trim() || baseQuote;
  const ctaText = CTA_PHRASE;

  const captureAndShare = async () => {
    try {
      if (!viewShotRef.current?.capture) return;
      const uri = await viewShotRef.current.capture();
      await Share.share({
        url: Platform.OS !== 'web' ? uri : undefined,
        message: Platform.OS === 'web' ? `${quote}\n\n${ctaText}` : undefined,
        title: 'Tudo Certo - Frase do dia',
      });
    } catch (e) {
      Share.share({ message: `${quote}\n\n${ctaText}`, title: 'Tudo Certo' });
    }
  };

  const saveToGallery = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão', 'É necessário permitir acesso à galeria para salvar.');
        return;
      }
      if (!viewShotRef.current?.capture) return;
      const uri = await viewShotRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Sucesso', 'Imagem salva na galeria!');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a imagem.');
    }
  };

  const handleShare = async () => {
    if (Platform.OS === 'web') {
      Share.share({ message: `${quote}\n\n${ctaText}`, title: 'Tudo Certo' });
      return;
    }
    await captureAndShare();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {isModal && onClose ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, backgroundColor: colors.card, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Criar imagem</Text>
          <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : null}
      <ScrollView showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', padding: 16 }}>Crie e compartilhe sua imagem.</Text>
        <View
          style={{
            alignSelf: 'center',
            width: PREVIEW_W,
            height: PREVIEW_H,
            marginVertical: 8,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              marginLeft: -CARD_WIDTH / 2,
              marginTop: -CARD_HEIGHT / 2,
              transform: [{ scale: PREVIEW_SCALE }],
            }}
          >
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'png', quality: 1, width: CARD_WIDTH, height: CARD_HEIGHT }}
              style={[mis.card, { width: CARD_WIDTH, height: CARD_HEIGHT, margin: 0 }]}
            >
          <LinearGradient colors={bg.colors} style={{ flex: 1, borderRadius: 20, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)' }} />
              <View style={{ position: 'absolute', bottom: 100, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <View style={{ position: 'absolute', top: '25%', right: 10, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.06)' }} />
              <View style={{ position: 'absolute', bottom: '40%', left: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' }} />
              <View style={{ position: 'absolute', top: '55%', left: '10%', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)' }} />
              <View style={{ position: 'absolute', bottom: '20%', right: '15%', width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.04)', transform: [{ rotate: '15deg' }] }} />
              <View style={{ position: 'absolute', top: '15%', left: '20%', width: 30, height: 60, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.03)', transform: [{ rotate: '-10deg' }] }} />
            </View>
            <View style={[mis.quoteArea, { flex: 1 }]}>
              <Text
                style={[
                  mis.quoteText,
                  {
                    color: '#fff',
                    ...(Platform.OS === 'web'
                      ? {}
                      : { textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 6 }),
                  },
                ]}
              >
                "{quote}"
              </Text>
            </View>
            {showLogo && (
              <View style={[mis.logoArea, { backgroundColor: 'rgba(0,0,0,0.25)', width: '100%', paddingVertical: 18, alignItems: 'center', justifyContent: 'center' }]}>
                <Image source={logoImage} style={mis.logo} resizeMode="contain" />
                <Text style={[mis.cta, { color: '#fff', fontSize: 13, textAlign: 'center', marginTop: 8, paddingHorizontal: 16 }]} numberOfLines={2}>{ctaText}</Text>
              </View>
            )}
          </LinearGradient>
            </ViewShot>
          </View>
        </View>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, paddingHorizontal: 16, marginTop: 16 }}>Escolha o fundo:</Text>
        <View style={[mis.bgGrid, { paddingTop: 12 }]}>
          {BACKGROUNDS.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={[
                mis.bgOption,
                {
                  borderWidth: bg.id === b.id ? 3 : 0,
                  borderColor: colors.primary,
                  overflow: 'hidden',
                  ...(Platform.OS === 'web'
                    ? {}
                    : {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: bg.id === b.id ? 0.3 : 0.1,
                        shadowRadius: 4,
                        elevation: bg.id === b.id ? 4 : 1,
                      }),
                },
              ]}
              onPress={() => setBg(b)}
            >
              <LinearGradient colors={b.colors} style={{ width: '100%', height: '100%', borderRadius: 28 }} />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, paddingHorizontal: 16, marginTop: 16 }}>Tipo de frase:</Text>
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 8 }}>
          <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: quoteType === 'motivacional' ? colors.primary : colors.primaryRgba(0.12), borderWidth: quoteType === 'motivacional' ? 0 : 1, borderColor: colors.primary + '80', ...(Platform.OS === 'web' ? {} : { elevation: quoteType === 'motivacional' ? 4 : 0, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: quoteType === 'motivacional' ? 0.3 : 0, shadowRadius: 4 }) }} onPress={() => { setQuoteType('motivacional'); setCustomText(''); }}>
            <Ionicons name="chatbubble-outline" size={20} color={quoteType === 'motivacional' ? '#fff' : colors.primary} />
            <Text style={{ color: quoteType === 'motivacional' ? '#fff' : colors.primary, fontWeight: '700', fontSize: 14 }}>Citação</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: quoteType === 'verso' ? colors.primary : colors.primaryRgba(0.12), borderWidth: quoteType === 'verso' ? 0 : 1, borderColor: colors.primary + '80', ...(Platform.OS === 'web' ? {} : { elevation: quoteType === 'verso' ? 4 : 0, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: quoteType === 'verso' ? 0.3 : 0, shadowRadius: 4 }) }} onPress={() => { setQuoteType('verso'); setCustomText(''); }}>
            <Ionicons name="book-outline" size={20} color={quoteType === 'verso' ? '#fff' : colors.primary} />
            <Text style={{ color: quoteType === 'verso' ? '#fff' : colors.primary, fontWeight: '700', fontSize: 14 }}>Versículo</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, paddingHorizontal: 16, marginTop: 16 }}>Ou digite sua frase:</Text>
        <TextInput
          style={[mis.customInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
          placeholder="Escreva sua citação ou versículo..."
          placeholderTextColor={colors.textSecondary}
          value={customText}
          onChangeText={setCustomText}
          multiline
          autoCorrect={true}
          spellCheck={true}
          autoCapitalize="sentences"
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 8, gap: 8 }}>
          <TouchableOpacity onPress={() => setShowLogo(!showLogo)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, backgroundColor: showLogo ? colors.primary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
              {showLogo && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={{ fontSize: 14, color: colors.text }}>Mostrar logo</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 16 }}>
            <TouchableOpacity style={[mis.shareBtn, { flex: 1, backgroundColor: colors.primary, ...(Platform.OS === 'web' ? {} : { elevation: 4, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6 }) }]} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={22} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Compartilhar frase</Text>
          </TouchableOpacity>
          {Platform.OS !== 'web' ? (
            <TouchableOpacity style={[mis.shareBtn, { flex: 1, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary }]} onPress={saveToGallery}>
              <Ionicons name="download-outline" size={22} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>Salvar na galeria</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
