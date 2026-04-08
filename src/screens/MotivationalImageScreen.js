import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Image, SafeAreaView, TextInput, Alert, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getQuoteOfDay } from '../utils/quotes';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';

const logoImage = require('../../assets/logo-pages.png');
const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;
const CARD_HEIGHT = Math.round(CARD_WIDTH * (16 / 9)); // 9:16 formato Stories Instagram
/** Visor na tela = 15% do cartão; captura (ViewShot) mantém CARD_* para qualidade ao partilhar. */
const PREVIEW_SCALE = 0.15;
const PREVIEW_W = Math.round(CARD_WIDTH * PREVIEW_SCALE);
const PREVIEW_H = Math.round(CARD_HEIGHT * PREVIEW_SCALE);

const CTA_PHRASE = 'Agenda e finanças em um app. Tudo Certo.';
const FONT_SIZES = [20, 24, 27, 30, 34, 38];

const BACKGROUNDS = [
  { id: 'roxo', colors: ['#667eea', '#764ba2'], label: 'Roxo' },
  { id: 'rosa', colors: ['#f093fb', '#f5576c'], label: 'Rosa' },
  { id: 'ceu', colors: ['#4facfe', '#00f2fe'], label: 'Céu' },
  { id: 'verde', colors: ['#43e97b', '#38f9d7'], label: 'Verde' },
  { id: 'pordosol', colors: ['#fa709a', '#fee140'], label: 'Pôr do sol' },
  { id: 'natureza', colors: ['#134e5e', '#71b280', '#a8e6cf'], label: 'Natureza' },
];

const INSPIRING_FONTS = [
  { id: 'fonte-1', label: 'Serif Clássica', family: Platform.OS === 'web' ? 'Georgia' : 'serif' },
  { id: 'fonte-2', label: 'Elegante', family: Platform.OS === 'web' ? 'Times New Roman' : 'serif' },
  { id: 'fonte-3', label: 'Moderna', family: Platform.OS === 'web' ? 'Trebuchet MS' : 'sans-serif' },
  { id: 'fonte-4', label: 'Limpa', family: Platform.OS === 'web' ? 'Verdana' : 'sans-serif' },
  { id: 'fonte-5', label: 'Neutra', family: Platform.OS === 'web' ? 'Arial' : 'sans-serif' },
  { id: 'fonte-6', label: 'Suave', family: Platform.OS === 'web' ? 'Palatino Linotype' : 'serif' },
  { id: 'fonte-7', label: 'Script', family: Platform.OS === 'web' ? 'cursive' : 'sans-serif' },
  { id: 'fonte-8', label: 'Poética', family: Platform.OS === 'web' ? 'Garamond' : 'serif' },
  { id: 'fonte-9', label: 'Livro', family: Platform.OS === 'web' ? 'Cambria' : 'serif' },
  { id: 'fonte-10', label: 'Minimal', family: Platform.OS === 'web' ? 'system-ui' : 'sans-serif' },
];

const mis = StyleSheet.create({
  card: { margin: 16, borderRadius: 20, overflow: 'hidden' },
  quoteArea: { flex: 1, justifyContent: 'center', padding: 24, alignItems: 'center' },
  quoteText: { fontSize: 27, fontWeight: '700', textAlign: 'center', lineHeight: 38 },
  logoArea: { padding: 16, alignItems: 'center' },
  logo: { width: 180, height: 52 },
  cta: { fontSize: 12, marginTop: 8, fontWeight: '600', letterSpacing: 0.5 },
  bgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, justifyContent: 'center' },
  bgOption: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16, margin: 16 },
  customInput: { borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 80, textAlignVertical: 'top' },
});

export function MotivationalImageScreen({ onClose, isModal, initialQuote, initialQuoteType }) {
  const { colors } = useTheme();
  const isWebDesktop = Platform.OS === 'web';
  const viewShotRef = useRef(null);
  const [bg, setBg] = useState(BACKGROUNDS[0]);
  const [quoteType, setQuoteType] = useState(initialQuoteType || 'motivacional');
  const [customText, setCustomText] = useState(initialQuote || '');
  const [showLogo, setShowLogo] = useState(true);
  const [bgImageUri, setBgImageUri] = useState(null);
  const [fontPreset, setFontPreset] = useState(INSPIRING_FONTS[0]);
  const [fontSize, setFontSize] = useState(27);
  const [showFontList, setShowFontList] = useState(false);
  const [showFontSizeList, setShowFontSizeList] = useState(false);
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
    if (Platform.OS === 'web') {
      try {
        if (!viewShotRef.current?.capture) return;
        const dataUri = await viewShotRef.current.capture({ result: 'data-uri' });
        const a = document.createElement('a');
        a.href = dataUri;
        a.download = 'tudo-certo-frase.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (e) {
        Alert.alert('Erro', 'Não foi possível salvar a imagem no navegador.');
      }
      return;
    }
    try {
      if (!viewShotRef.current?.capture) return;
      const uri = await viewShotRef.current.capture();
      Alert.alert(
        'Salvar imagem',
        'Onde você quer salvar?',
        [
          {
            text: 'Galeria',
            onPress: async () => {
              try {
                const { status } = await MediaLibrary.requestPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permissão', 'É necessário permitir acesso à galeria para salvar.');
                  return;
                }
                await MediaLibrary.saveToLibraryAsync(uri);
                Alert.alert('Sucesso', 'Imagem salva na galeria!');
              } catch (_) {
                Alert.alert('Erro', 'Não foi possível salvar na galeria.');
              }
            },
          },
          {
            text: 'Escolher local',
            onPress: async () => {
              try {
                await Share.share({
                  url: uri,
                  title: 'Salvar imagem',
                  message: 'Escolha onde salvar a imagem',
                });
              } catch (_) {
                Alert.alert('Erro', 'Não foi possível abrir as opções de salvamento.');
              }
            },
          },
          { text: 'Cancelar', style: 'cancel' },
        ],
        { cancelable: true }
      );
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

  const pickBackgroundImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão', 'Permita acesso às fotos para usar uma imagem de fundo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setBgImageUri(result.assets[0].uri);
      }
    } catch (_) {
      Alert.alert('Erro', 'Não foi possível abrir a galeria.');
    }
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
        <View style={{ flexDirection: isWebDesktop ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 16 }}>
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
            {bgImageUri ? (
              <Image
                source={{ uri: bgImageUri }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : null}
            {bgImageUri ? (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' }} />
            ) : null}
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
                    fontFamily: fontPreset.family,
                    fontSize,
                    lineHeight: Math.round(fontSize * 1.35),
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
          {isWebDesktop ? (
            <View style={{ width: 280, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12, gap: 8, alignSelf: 'stretch' }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>Editar</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: quoteType === 'motivacional' ? colors.primary : colors.primaryRgba(0.12) }} onPress={() => { setQuoteType('motivacional'); setCustomText(''); }}>
                  <Text style={{ color: quoteType === 'motivacional' ? '#fff' : colors.primary, fontWeight: '700', fontSize: 12 }}>Citação</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: quoteType === 'verso' ? colors.primary : colors.primaryRgba(0.12) }} onPress={() => { setQuoteType('verso'); setCustomText(''); }}>
                  <Text style={{ color: quoteType === 'verso' ? '#fff' : colors.primary, fontWeight: '700', fontSize: 12 }}>Versículo</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[mis.shareBtn, { margin: 0, paddingVertical: 10, backgroundColor: colors.primaryRgba(0.12), borderWidth: 1, borderColor: colors.primary }]} onPress={() => { setShowFontList((v) => !v); setShowFontSizeList(false); }}>
                <Ionicons name="text-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Fonte: {fontPreset.label}</Text>
              </TouchableOpacity>
              {showFontList ? (
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                  {INSPIRING_FONTS.map((f) => (
                    <TouchableOpacity key={f.id} onPress={() => { setFontPreset(f); setShowFontList(false); }} style={{ paddingVertical: 8 }}>
                      <Text style={{ color: colors.text, fontFamily: f.family, fontSize: 13 }}>{f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}
              <TouchableOpacity style={[mis.shareBtn, { margin: 0, paddingVertical: 10, backgroundColor: colors.primaryRgba(0.12), borderWidth: 1, borderColor: colors.primary }]} onPress={() => { setShowFontSizeList((v) => !v); setShowFontList(false); }}>
                <Ionicons name="resize-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Tamanho: {fontSize}</Text>
              </TouchableOpacity>
              {showFontSizeList ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {FONT_SIZES.map((s) => (
                    <TouchableOpacity key={s} onPress={() => { setFontSize(s); setShowFontSizeList(false); }} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: fontSize === s ? colors.primary : colors.border, backgroundColor: fontSize === s ? colors.primaryRgba(0.2) : 'transparent' }}>
                      <Text style={{ color: fontSize === s ? colors.primary : colors.text, fontWeight: '700', fontSize: 12 }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[mis.shareBtn, { flex: 1, margin: 0, paddingVertical: 10, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary }]} onPress={pickBackgroundImage}>
                  <Ionicons name="image-outline" size={18} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Foto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[mis.shareBtn, { flex: 1, margin: 0, paddingVertical: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]} onPress={() => setBgImageUri(null)}>
                  <Ionicons name="close-circle-outline" size={18} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 12 }}>Limpar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
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
        {!isWebDesktop ? <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, paddingHorizontal: 16, marginTop: 16 }}>Tipo de frase:</Text> : null}
        {!isWebDesktop ? <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 8 }}>
          <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: quoteType === 'motivacional' ? colors.primary : colors.primaryRgba(0.12), borderWidth: quoteType === 'motivacional' ? 0 : 1, borderColor: colors.primary + '80', ...(Platform.OS === 'web' ? {} : { elevation: quoteType === 'motivacional' ? 3 : 0, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: quoteType === 'motivacional' ? 0.25 : 0, shadowRadius: 3 }) }} onPress={() => { setQuoteType('motivacional'); setCustomText(''); }}>
            <Ionicons name="chatbubble-outline" size={18} color={quoteType === 'motivacional' ? '#fff' : colors.primary} />
            <Text style={{ color: quoteType === 'motivacional' ? '#fff' : colors.primary, fontWeight: '700', fontSize: 13 }}>Citação</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: quoteType === 'verso' ? colors.primary : colors.primaryRgba(0.12), borderWidth: quoteType === 'verso' ? 0 : 1, borderColor: colors.primary + '80', ...(Platform.OS === 'web' ? {} : { elevation: quoteType === 'verso' ? 3 : 0, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: quoteType === 'verso' ? 0.25 : 0, shadowRadius: 3 }) }} onPress={() => { setQuoteType('verso'); setCustomText(''); }}>
            <Ionicons name="book-outline" size={18} color={quoteType === 'verso' ? '#fff' : colors.primary} />
            <Text style={{ color: quoteType === 'verso' ? '#fff' : colors.primary, fontWeight: '700', fontSize: 13 }}>Versículo</Text>
          </TouchableOpacity>
        </View> : null}
        {!isWebDesktop ? <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, paddingHorizontal: 16, marginTop: 16 }}>Fonte inspiradora:</Text> : null}
        {!isWebDesktop ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 10 }}>
          {INSPIRING_FONTS.map((f) => {
            const active = fontPreset.id === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFontPreset(f)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primaryRgba(0.18) : colors.card,
                }}
              >
                <Text style={{ color: active ? colors.primary : colors.text, fontFamily: f.family, fontSize: 13, fontWeight: '600' }}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View> : null}
        {!isWebDesktop ? <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, paddingHorizontal: 16, marginTop: 16 }}>Foto de fundo:</Text> : null}
        {!isWebDesktop ? <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 8 }}>
          <TouchableOpacity style={[mis.shareBtn, { flex: 1, margin: 0, paddingVertical: 12, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary }]} onPress={pickBackgroundImage}>
            <Ionicons name="image-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Escolher foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[mis.shareBtn, { flex: 1, margin: 0, paddingVertical: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]} onPress={() => setBgImageUri(null)}>
            <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 13 }}>Remover foto</Text>
          </TouchableOpacity>
        </View> : null}
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
          <TouchableOpacity style={[mis.shareBtn, { flex: 1, backgroundColor: colors.primaryRgba(0.15), borderWidth: 1, borderColor: colors.primary }]} onPress={saveToGallery}>
            <Ionicons name="download-outline" size={22} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>{Platform.OS === 'web' ? 'Salvar imagem' : 'Salvar na galeria'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
