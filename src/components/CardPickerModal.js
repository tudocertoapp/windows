import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Dimensions, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { AVAILABLE_CARD_TYPES } from '../constants/dashboardCards';
import { playTapSound } from '../utils/sounds';

const { height: SH } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function getCardById(id, cardTypes) {
  return cardTypes.find((c) => c.id === id);
}

export function CardPickerModal({ visible, onClose, visibleIds, onReorder, cardTypes = AVAILABLE_CARD_TYPES, addableFromDinheiro = [], addableCardTypes = [], onAddCard, onRemoveCard }) {
  const { colors } = useTheme();
  const [order, setOrder] = useState(visibleIds);

  useEffect(() => {
    setOrder(visibleIds);
  }, [visibleIds, visible]);

  const visibleCards = order.map((id) => getCardById(id, cardTypes)).filter(Boolean);
  const addableCards = addableFromDinheiro.map((id) => getCardById(id, addableCardTypes.length ? addableCardTypes : cardTypes)).filter(Boolean);

  const moveUp = useCallback((id) => {
    const idx = order.indexOf(id);
    if (idx <= 0 || !onReorder) return;
    playTapSound();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = [...order];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setOrder(next);
    onReorder(next);
  }, [order, onReorder]);

  const moveDown = useCallback((id) => {
    const idx = order.indexOf(id);
    if (idx < 0 || idx >= order.length - 1 || !onReorder) return;
    playTapSound();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = [...order];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setOrder(next);
    onReorder(next);
  }, [order, onReorder]);

  const handleArrowPress = useCallback((direction, cardId) => {
    requestAnimationFrame(() => {
      if (direction === 'up') moveUp(cardId);
      else moveDown(cardId);
    });
  }, [moveUp, moveDown]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessible={false}
        />
        <View style={[s.content, { backgroundColor: colors.card, borderColor: colors.border }]} pointerEvents="box-none">
          <View style={[s.header, { borderBottomColor: colors.border }]}>
            <Text style={[s.title, { color: colors.text }]}>Organize a tela do seu jeito!</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={s.list}
            showsVerticalScrollIndicator={true}
            scrollEventThrottle={16}
            nestedScrollEnabled={Platform.OS === 'android'}
            bounces={true}
            contentContainerStyle={s.listContent}
          >
            <Text style={[s.sectionTitle, { color: colors.text }]}>Use as setas para organizar a ordem dos cards</Text>
            {visibleCards.length === 0 ? (
              <Text style={[s.empty, { color: colors.textSecondary }]}>Nenhum card na página.</Text>
            ) : (
              visibleCards.map((card, index) => (
                <View key={card.id} style={[s.item, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <View style={[s.iconWrap, { backgroundColor: 'transparent' }]}>
                    <Ionicons name={card.icon} size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.itemLabel, { color: colors.text }]}>{card.label}</Text>
                    <Text style={[s.itemScreen, { color: colors.textSecondary }]}>{card.screen}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={s.reorderBtns}>
                      <TouchableOpacity
                        onPress={() => handleArrowPress('up', card.id)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={[s.arrowBtn, index === 0 && s.arrowDisabled]}
                        disabled={index === 0}
                        activeOpacity={1}
                      >
                        <Ionicons name="chevron-up" size={24} color={index === 0 ? colors.textSecondary + '60' : colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleArrowPress('down', card.id)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={[s.arrowBtn, index === visibleCards.length - 1 && s.arrowDisabled]}
                        disabled={index === visibleCards.length - 1}
                        activeOpacity={1}
                      >
                        <Ionicons name="chevron-down" size={24} color={index === visibleCards.length - 1 ? colors.textSecondary + '60' : colors.primary} />
                      </TouchableOpacity>
                    </View>
                    {onRemoveCard && (
                      <TouchableOpacity onPress={() => { playTapSound(); onRemoveCard(card.id); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 6 }}>
                        <Ionicons name="close-circle-outline" size={22} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
            {addableCards.length > 0 && onAddCard && (
              <>
                <Text style={[s.sectionTitle, { color: colors.text, marginTop: 20 }]}>Adicionar da página Dinheiro</Text>
                <Text style={[s.sectionSubtitle, { color: colors.textSecondary }]}>Toque para trazer o card para a tela inicial</Text>
                {addableCards.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    onPress={() => { playTapSound(); onAddCard(card.id); }}
                    style={[s.item, s.addableItem, { backgroundColor: colors.bg, borderColor: colors.primary + '50', borderStyle: 'dashed' }]}
                    activeOpacity={0.8}
                  >
                    <View style={[s.iconWrap, { backgroundColor: colors.primaryRgba?.(0.15) ?? colors.primary + '25' }]}>
                      <Ionicons name={card.icon} size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.itemLabel, { color: colors.text }]}>{card.label}</Text>
                      <Text style={[s.itemScreen, { color: colors.textSecondary }]}>Página Dinheiro</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Adicionar</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: Math.min(SH * 0.92, 700), borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  sectionSubtitle: { fontSize: 12, marginBottom: 12 },
  list: { flex: 1, padding: 16 },
  listContent: { paddingBottom: 60 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 10, gap: 12 },
  addableItem: { borderWidth: 2 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  itemLabel: { fontSize: 15, fontWeight: '600' },
  itemScreen: { fontSize: 12, marginTop: 2 },
  reorderBtns: { flexDirection: 'column', gap: 2 },
  arrowBtn: { padding: 6 },
  arrowDisabled: { opacity: 0.4 },
  empty: { textAlign: 'center', paddingVertical: 32, fontSize: 14 },
});
