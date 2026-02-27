import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, Modal, TextInput, Alert, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { topBarStyles } from '../components/TopBar';
import { playTapSound } from '../utils/sounds';
import { FREE_COLORS } from '../contexts/ThemeContext';

function hexToHsl(hex) {
  let h = hex.replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hh, ss, ll = (max + min) / 2;
  if (max === min) hh = ss = 0;
  else {
    const d = max - min;
    ss = ll > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: hh = ((b - r) / d + 2) / 6; break;
      default: hh = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(hh * 360), s: Math.round(ss * 100), l: Math.round(ll * 100) };
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

const ts = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1, marginBottom: 16, opacity: 0.8 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 0.5 },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 2, opacity: 0.7 },
  colorListItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, gap: 14 },
  colorSwatch: { width: 40, height: 40, borderRadius: 20 },
  colorName: { flex: 1, fontSize: 15, fontWeight: '500' },
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginRight: 8 },
  upgradeBanner: { marginHorizontal: 20, marginBottom: 16, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  upgradeText: { fontSize: 14, textAlign: 'center', marginBottom: 12, lineHeight: 20 },
  upgradeBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  createColorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16, justifyContent: 'flex-start' },
  colorGridItem: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  colorGridItemSelected: { borderColor: '#fff', elevation: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { borderRadius: 20, padding: 24, maxWidth: 360, alignSelf: 'center', width: '100%' },
  hexInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  modalBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  pickerPreview: { width: 72, height: 72, borderRadius: 16, borderWidth: 3, borderColor: 'rgba(0,0,0,0.1)' },
  hueStrip: { height: 24, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  sliderLabel: { fontSize: 12, fontWeight: '600', width: 28 },
  sliderTrack: { flex: 1, height: 8, borderRadius: 4 },
});

function isValidHex(hex) {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

function CustomSlider({ value, minimumValue, maximumValue, onValueChange, minimumTrackTintColor, maximumTrackTintColor, thumbTintColor }) {
  const trackRef = useRef(null);
  const ratio = Math.max(0, Math.min(1, (value - minimumValue) / (maximumValue - minimumValue)));

  const updateValue = (pageX) => {
    trackRef.current?.measureInWindow((x, _y, width) => {
      const localX = pageX - x;
      const r = Math.max(0, Math.min(1, width > 0 ? localX / width : 0));
      const v = minimumValue + r * (maximumValue - minimumValue);
      onValueChange(Math.round(v));
    });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => updateValue(e.nativeEvent.pageX),
    onPanResponderMove: (e) => updateValue(e.nativeEvent.pageX),
  });

  return (
    <View
      ref={trackRef}
      style={{ height: 36, justifyContent: 'center' }}
      {...panResponder.panHandlers}
    >
      <View style={{ height: 8, borderRadius: 4, backgroundColor: maximumTrackTintColor || '#e5e7eb', overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, width: `${ratio * 100}%`, height: '100%', backgroundColor: minimumTrackTintColor || '#10b981' }} />
      </View>
      <View
        style={{
          position: 'absolute',
          left: `${ratio * 100}%`,
          marginLeft: -12,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: thumbTintColor || '#fff',
          borderWidth: 2,
          borderColor: 'rgba(0,0,0,0.2)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
        }}
      />
    </View>
  );
}

export function TemasScreen({ onClose, isModal, onOpenAssinatura }) {
  const { darkMode, setDarkMode, primaryColor, setPrimaryColor, colors, primaryOptions, favoriteColors, addFavoriteColor, removeFavoriteColor, maxFavorites } = useTheme();
  const { isEmpresa } = usePlan();
  const hasPremiumColors = isEmpresa;
  const [showCreateColor, setShowCreateColor] = useState(false);
  const PICKER_LIGHTNESS = 50;
  const [pickerHue, setPickerHue] = useState(142);
  const [pickerSat, setPickerSat] = useState(65);
  const [customHex, setCustomHex] = useState('#10b981');
  const [customName, setCustomName] = useState('');

  const freeColors = FREE_COLORS;
  const paidColors = primaryOptions.filter((o) => !freeColors.some((f) => f.id === o.id));

  useEffect(() => {
    if (showCreateColor) {
      const { h, s } = hexToHsl(primaryColor);
      setPickerHue(h);
      setPickerSat(Math.max(40, Math.min(90, s)));
      setCustomHex(primaryColor);
    }
  }, [showCreateColor, primaryColor]);

  const pickerHex = hslToHex(pickerHue, pickerSat, PICKER_LIGHTNESS);

  const handleSelectColor = (hex, isLocked) => {
    if (isLocked) {
      playTapSound();
      onOpenAssinatura?.();
      return;
    }
    playTapSound();
    setPrimaryColor(hex);
  };

  const handlePickerChange = (h, s) => {
    setPickerHue(h);
    setPickerSat(s);
    const hex = hslToHex(h, s, PICKER_LIGHTNESS);
    setCustomHex(hex);
    setPrimaryColor(hex);
  };

  const handleHexInputChange = (text) => {
    setCustomHex(text);
    const hex = text.trim().startsWith('#') ? text.trim() : `#${text.trim()}`;
    if (isValidHex(hex)) {
      const { h, s } = hexToHsl(hex);
      setPickerHue(h);
      setPickerSat(Math.max(40, Math.min(90, s)));
      setPrimaryColor(hex.toUpperCase());
    }
  };

  const handleSaveFavorite = () => {
    const exists = favoriteColors.some((f) => f.hex.toLowerCase() === pickerHex.toLowerCase());
    if (exists) {
      Alert.alert('Já existe', 'Esta cor já está nos favoritos.');
      return;
    }
    if (favoriteColors.length >= maxFavorites) {
      Alert.alert('Limite atingido', `Você pode ter no máximo ${maxFavorites} cores favoritas. Remova uma para adicionar outra.`);
      return;
    }
    playTapSound();
    addFavoriteColor(pickerHex, customName.trim() || pickerHex);
    Alert.alert('Salvo!', 'Cor adicionada aos favoritos.');
  };

  const ColorListItem = ({ item, selected, locked }) => (
    <TouchableOpacity
      style={[ts.colorListItem, { borderBottomColor: colors.border }]}
      onPress={() => handleSelectColor(item.hex, locked)}
      activeOpacity={locked ? 1 : 0.6}
    >
      <View style={[ts.colorSwatch, { backgroundColor: item.hex }]} />
      <Text style={[ts.colorName, { color: colors.text }]}>{item.name}</Text>
      {locked && (
        <View style={[ts.lockBadge, { backgroundColor: colors.border + '60' }]}>
          <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>Pro</Text>
        </View>
      )}
      {selected && !locked && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {isModal && onClose && (
        <View style={[topBarStyles.bar, { backgroundColor: colors.bg }]}>
          <Text style={[topBarStyles.title, { color: colors.text }]}>Temas</Text>
          <TouchableOpacity
            style={[topBarStyles.menuBtn, { backgroundColor: colors.primaryRgba(0.2) }]}
            onPress={() => { playTapSound(); onClose(); }}
          >
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={ts.section}>
          <Text style={[ts.sectionTitle, { color: colors.textSecondary }]}>APARÊNCIA</Text>
          <View style={[ts.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[ts.row, ts.rowLast, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[ts.rowLabel, { color: colors.text }]}>Tema</Text>
                <Text style={[ts.rowSub, { color: colors.textSecondary }]}>{darkMode ? 'Escuro' : 'Claro'}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => { playTapSound(); setDarkMode(false); }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: !darkMode ? colors.primaryRgba(0.2) : colors.border + '40',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: !darkMode ? 2 : 0,
                    borderColor: colors.primary,
                  }}
                >
                  <Ionicons name="sunny" size={24} color={!darkMode ? colors.primary : colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { playTapSound(); setDarkMode(true); }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: darkMode ? colors.primaryRgba(0.2) : colors.border + '40',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: darkMode ? 2 : 0,
                    borderColor: colors.primary,
                  }}
                >
                  <Ionicons name="moon" size={24} color={darkMode ? colors.primary : colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={[ts.sectionTitle, { color: colors.textSecondary }]}>COR PRINCIPAL</Text>

          {!hasPremiumColors && (
            <View style={[ts.upgradeBanner, { backgroundColor: colors.primaryRgba(0.08), borderColor: colors.primary + '40' }]}>
              <Text style={[ts.upgradeText, { color: colors.text }]}>
                Troque de plano para usar outras cores e criar cores personalizadas.
              </Text>
              <TouchableOpacity
                style={[ts.upgradeBtn, { backgroundColor: colors.primary }]}
                onPress={() => { playTapSound(); onOpenAssinatura?.(); }}
              >
                <Ionicons name="rocket-outline" size={20} color="#fff" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Atualizar plano</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[ts.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
              <Text style={[ts.rowLabel, { color: colors.text }]}>Cores disponíveis (plano gratuito)</Text>
              <Text style={[ts.rowSub, { color: colors.textSecondary }]}>Toque para aplicar</Text>
            </View>
            {freeColors.map((item) => (
              <ColorListItem key={item.id} item={item} selected={primaryColor.toLowerCase() === item.hex.toLowerCase()} locked={false} />
            ))}
          </View>

          <View style={[ts.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
              <Text style={[ts.rowLabel, { color: colors.text }]}>Criar cor personalizada</Text>
              <Text style={[ts.rowSub, { color: colors.textSecondary }]}>
                {hasPremiumColors ? 'Crie uma cor e salve como favorita' : 'Atualize o plano para criar cores'}
              </Text>
            </View>
            <TouchableOpacity
              style={[ts.createColorRow, ts.rowLast, { borderBottomColor: colors.border }]}
              onPress={() => {
                playTapSound();
                if (hasPremiumColors) setShowCreateColor(true);
                else onOpenAssinatura?.();
              }}
            >
              <View style={[ts.colorSwatch, { backgroundColor: 'transparent', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary }]}>
                <Ionicons name="add" size={24} color={colors.primary} style={{ position: 'absolute', top: 6, left: 6 }} />
              </View>
              <Text style={[ts.colorName, { color: colors.primary, fontWeight: '600' }]}>Criar cor e salvar como favorito</Text>
              {!hasPremiumColors && <View style={[ts.lockBadge, { backgroundColor: colors.border + '60' }]}><Ionicons name="lock-closed" size={14} color={colors.textSecondary} /></View>}
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {hasPremiumColors && favoriteColors.length > 0 && (
            <View style={[ts.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
                <Text style={[ts.rowLabel, { color: colors.text }]}>Favoritas</Text>
                <Text style={[ts.rowSub, { color: colors.textSecondary }]}>{favoriteColors.length}/{maxFavorites ?? 10} cores</Text>
              </View>
              {favoriteColors.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[ts.colorListItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelectColor(item.hex)}
                  onLongPress={() => {
                    playTapSound();
                    Alert.alert('Remover', 'Remover esta cor dos favoritos?', [
                      { text: 'Cancelar' },
                      { text: 'Remover', style: 'destructive', onPress: () => removeFavoriteColor(item.id) },
                    ]);
                  }}
                >
                  <View style={[ts.colorSwatch, { backgroundColor: item.hex }]} />
                  <Text style={[ts.colorName, { color: colors.text }]}>{item.name}</Text>
                  {primaryColor.toLowerCase() === item.hex.toLowerCase() && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={[ts.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
              <Text style={[ts.rowLabel, { color: colors.text }]}>Mais cores</Text>
              <Text style={[ts.rowSub, { color: colors.textSecondary }]}>Toque para aplicar</Text>
            </View>
            <View style={[ts.colorGrid, { paddingHorizontal: 16, paddingBottom: 16 }]}>
              {paidColors.map((item) => {
                const sel = primaryColor.toLowerCase() === item.hex.toLowerCase();
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[ts.colorGridItem, { backgroundColor: item.hex }, sel && ts.colorGridItemSelected]}
                    onPress={() => handleSelectColor(item.hex, !hasPremiumColors)}
                  >
                    {sel && hasPremiumColors && <Ionicons name="checkmark" size={20} color="#fff" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showCreateColor} transparent animationType="fade">
        <TouchableOpacity style={ts.modalOverlay} activeOpacity={1} onPress={() => setShowCreateColor(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[ts.modalContent, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 }}>Criar cor – visual</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <View style={[ts.pickerPreview, { backgroundColor: pickerHex }]} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>Preview em tempo real</Text>
                <TextInput
                  style={[ts.hexInput, { borderColor: colors.border, color: colors.text }]}
                  value={customHex}
                  onChangeText={handleHexInputChange}
                  placeholder="#10b981"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                  maxLength={7}
                />
              </View>
            </View>

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Matiz (Hue)</Text>
            <View style={{ marginBottom: 16 }}>
              <View style={ts.hueStrip}>
                <LinearGradient
                  colors={['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </View>
              <CustomSlider
                minimumValue={0}
                maximumValue={360}
                value={pickerHue}
                onValueChange={(v) => handlePickerChange(v, pickerSat)}
                minimumTrackTintColor={hslToHex(pickerHue, 100, 50)}
                maximumTrackTintColor={colors.border}
                thumbTintColor={hslToHex(pickerHue, 100, 50)}
              />
            </View>

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 8, marginBottom: 4 }}>Saturação (40–90%)</Text>
            <CustomSlider
              minimumValue={40}
              maximumValue={90}
              value={pickerSat}
              onValueChange={(v) => handlePickerChange(pickerHue, v)}
              minimumTrackTintColor={hslToHex(pickerHue, 50, PICKER_LIGHTNESS)}
              maximumTrackTintColor={colors.border}
              thumbTintColor={pickerHex}
            />

            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 12, marginBottom: 6 }}>Nome (opcional)</Text>
            <TextInput
              style={[ts.hexInput, { borderColor: colors.border, color: colors.text }]}
              value={customName}
              onChangeText={setCustomName}
              placeholder="Minha cor"
              placeholderTextColor={colors.textSecondary}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity style={[ts.modalBtn, { flex: 1, backgroundColor: colors.border }]} onPress={() => { playTapSound(); setShowCreateColor(false); }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ts.modalBtn, { flex: 1, backgroundColor: colors.primary }]} onPress={handleSaveFavorite}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>
                  Salvar favorito ({favoriteColors.length}/{maxFavorites})
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
