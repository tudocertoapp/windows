import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Dimensions, PanResponder, Animated, Vibration, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { AVAILABLE_CARD_TYPES } from '../constants/dashboardCards';
import { playTapSound } from '../utils/sounds';

const { height: SH } = Dimensions.get('window');
const LONG_PRESS_MS = 3000;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function getCardById(id) {
  return AVAILABLE_CARD_TYPES.find((c) => c.id === id);
}

export function CardPickerModal({ visible, onClose, visibleIds, onAdd, onRemove, onReorder }) {
  const { colors } = useTheme();
  const [draggingId, setDraggingId] = useState(null);
  const [hoverTargetId, setHoverTargetId] = useState(null);
  const [order, setOrder] = useState(visibleIds);
  const layoutRefs = useRef({});
  const dragPos = useRef({ x: 0, y: 0 });
  const pan = useRef(new Animated.ValueXY()).current;
  const longPressTimer = useRef(null);
  const startDragY = useRef(0);
  const scrollRef = useRef(null);
  const listLayout = useRef({ y: 0 });

  useEffect(() => {
    setOrder(visibleIds);
  }, [visibleIds, visible]);

  const visibleCards = order.map((id) => getCardById(id)).filter(Boolean);
  const toAdd = AVAILABLE_CARD_TYPES.filter((c) => !order.includes(c.id));

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

  const findCardUnderFinger = useCallback((fingerY) => {
    const layouts = layoutRefs.current;
    for (let i = 0; i < order.length; i++) {
      const id = order[i];
      const layout = layouts[id];
      if (!layout || id === draggingId) continue;
      const { y, height } = layout;
      if (fingerY >= y && fingerY <= y + height) {
        return { id, index: i };
      }
    }
    return null;
  }, [order, draggingId]);

  const lastSwappedRef = useRef(null);

  const trySwap = useCallback((fingerY) => {
    if (!draggingId || !onReorder) return;
    const under = findCardUnderFinger(fingerY);
    setHoverTargetId(under?.id || null);
    if (!under || under.id === draggingId) return;
    if (lastSwappedRef.current === under.id) return;
    lastSwappedRef.current = under.id;
    const fromIdx = order.indexOf(draggingId);
    const toIdx = order.indexOf(under.id);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
    playTapSound();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = [...order];
    const [removed] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, removed);
    setOrder(next);
    onReorder(next);
  }, [draggingId, order, onReorder, findCardUnderFinger]);

  useEffect(() => {
    if (!draggingId) {
      lastSwappedRef.current = null;
      setHoverTargetId(null);
    }
  }, [draggingId]);

  const panResponders = useRef({});
  const draggingIdRef = useRef(null);
  draggingIdRef.current = draggingId;

  const getPanResponder = useCallback((cardId) => {
    if (panResponders.current[cardId]) return panResponders.current[cardId];
    panResponders.current[cardId] = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => !!draggingIdRef.current,
      onPanResponderGrant: (e) => {
        longPressTimer.current = setTimeout(() => {
          const node = layoutRefs.current._nodes?.[cardId];
          const applyLayout = (x, y) => {
            Vibration.vibrate(15);
            setDraggingId(cardId);
            dragPos.current = { x, y };
            pan.setOffset({ x, y });
            pan.setValue({ x: 0, y: 0 });
          };
          if (node) {
            node.measureInWindow((x, y, w, h) => {
              layoutRefs.current[cardId] = { x, y, width: w, height: h };
              applyLayout(x, y);
            });
          } else {
            const layout = layoutRefs.current[cardId];
            if (layout) applyLayout(layout.x, layout.y);
            else setDraggingId(cardId);
          }
        }, LONG_PRESS_MS);
      },
      onPanResponderMove: (e, g) => {
        if (draggingIdRef.current !== cardId) return;
        pan.setValue({ x: g.dx, y: g.dy });
        trySwap(e.nativeEvent.pageY);
      },
      onPanResponderRelease: () => {
        clearTimeout(longPressTimer.current);
        if (draggingIdRef.current === cardId) {
          const node = layoutRefs.current._nodes?.[cardId];
          if (node) {
            node.measureInWindow((tx, ty) => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              pan.flattenOffset();
              Animated.spring(pan, {
                toValue: { x: tx, y: ty },
                useNativeDriver: true,
                tension: 120,
                friction: 12,
              }).start(() => {
                pan.setOffset({ x: tx, y: ty });
                pan.setValue({ x: 0, y: 0 });
                setDraggingId(null);
              });
            });
          } else {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            pan.flattenOffset();
            setDraggingId(null);
          }
        } else {
          setDraggingId(null);
        }
      },
    });
    return panResponders.current[cardId];
  }, [pan, trySwap]);

  useEffect(() => {
    panResponders.current = {};
  }, [visible]);

  const handleClose = useCallback(() => {
    clearTimeout(longPressTimer.current);
    setDraggingId(null);
    onClose();
  }, [onClose]);

  const renderCardContent = (card, index) => (
    <>
      <View style={[s.iconWrap, { backgroundColor: 'transparent' }]}>
        <Ionicons name={card.icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.itemLabel, { color: colors.text }]}>{card.label}</Text>
        <Text style={[s.itemScreen, { color: colors.textSecondary }]}>{card.screen}</Text>
      </View>
      <View style={s.reorderBtns}>
        <TouchableOpacity
          onPress={() => moveUp(card.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[s.arrowBtn, index === 0 && s.arrowDisabled]}
          disabled={index === 0}
        >
          <Ionicons name="chevron-up" size={24} color={index === 0 ? colors.textSecondary + '60' : colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => moveDown(card.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[s.arrowBtn, index === visibleCards.length - 1 && s.arrowDisabled]}
          disabled={index === visibleCards.length - 1}
        >
          <Ionicons name="chevron-down" size={24} color={index === visibleCards.length - 1 ? colors.textSecondary + '60' : colors.primary} />
        </TouchableOpacity>
      </View>
      {onRemove && (
        <TouchableOpacity onPress={() => { playTapSound(); onRemove(card.id); setDraggingId(null); setOrder((o) => { const n = o.filter((x) => x !== card.id); onReorder(n); return n; }); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close-circle" size={24} color="#ef4444" />
        </TouchableOpacity>
      )}
    </>
  );

  const draggingCard = draggingId ? getCardById(draggingId) : null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={handleClose}>
        {draggingId && draggingCard && (
          <Animated.View
            pointerEvents="none"
            style={[
              s.floatingCard,
              {
                backgroundColor: colors.primaryRgba(0.2),
                borderColor: colors.primary,
                borderWidth: 2,
                transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: 1.03 }],
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.35,
                shadowRadius: 12,
                elevation: 20,
              },
            ]}
          >
            {renderCardContent(draggingCard, order.indexOf(draggingCard.id))}
          </Animated.View>
        )}
        <View style={[s.content, { backgroundColor: colors.card, borderColor: colors.border }]} onStartShouldSetResponder={() => true}>
          <View style={[s.header, { borderBottomColor: colors.border }]}>
            <Text style={[s.title, { color: colors.text }]}>Organize a tela do seu jeito!</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            ref={scrollRef}
            style={s.list}
            showsVerticalScrollIndicator
            contentContainerStyle={s.listContent}
            scrollEnabled={!draggingId}
            onLayout={(e) => {
              e.target.measureInWindow((x, y) => { listLayout.current = { y }; });
            }}
          >
            <Text style={[s.sectionTitle, { color: colors.text }]}>Cards visíveis na página</Text>
            {visibleCards.length === 0 ? (
              <Text style={[s.empty, { color: colors.textSecondary }]}>Nenhum card na página. Adicione abaixo.</Text>
            ) : (
              visibleCards.map((card, index) => (
                <View
                  key={card.id}
                  onLayout={() => {
                    const node = layoutRefs.current._nodes?.[card.id];
                    if (node) node.measureInWindow((x, y, w, h) => { layoutRefs.current[card.id] = { x, y, width: w, height: h }; });
                  }}
                  ref={(r) => {
                    if (!layoutRefs.current._nodes) layoutRefs.current._nodes = {};
                    layoutRefs.current._nodes[card.id] = r;
                    if (r) r.measureInWindow((x, y, w, h) => { layoutRefs.current[card.id] = { x, y, width: w, height: h }; });
                  }}
                  {...getPanResponder(card.id).panHandlers}
                  collapsable={false}
                >
                  <View
                    style={[
                      s.item,
                      {
                        backgroundColor: draggingId === card.id ? 'transparent' : (hoverTargetId === card.id ? colors.primaryRgba(0.15) : colors.bg),
                        borderColor: hoverTargetId === card.id ? colors.primary : (draggingId === card.id ? 'transparent' : colors.border),
                        borderWidth: hoverTargetId === card.id ? 2 : 1,
                        opacity: draggingId === card.id ? 0.5 : 1,
                      },
                    ]}
                  >
                    {renderCardContent(card, index)}
                  </View>
                </View>
              ))
            )}
            <Text style={[s.hintDrag, { color: colors.textSecondary }]}>
              {draggingId ? 'Arraste e solte sobre outro card para trocar de posição' : 'Segure por 3 segundos e arraste para reorganizar'}
            </Text>
            <Text style={[s.sectionTitle, { color: colors.text, marginTop: 20 }]}>Adicionar card</Text>
            {toAdd.length === 0 ? (
              <Text style={[s.empty, { color: colors.textSecondary }]}>Todos os cards já estão na página</Text>
            ) : (
              toAdd.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[s.item, { backgroundColor: colors.bg, borderColor: colors.border }]}
                  onPress={() => { playTapSound(); onAdd(card.id); setOrder((o) => { const n = [...o, card.id]; onReorder(n); return n; }); }}
                  activeOpacity={0.7}
                >
                  <View style={[s.iconWrap, { backgroundColor: 'transparent' }]}>
                    <Ionicons name={card.icon} size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.itemLabel, { color: colors.text }]}>{card.label}</Text>
                    <Text style={[s.itemScreen, { color: colors.textSecondary }]}>{card.screen}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: Math.min(SH * 0.92, 700), borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  list: { flex: 1, padding: 16 },
  listContent: { paddingBottom: 40 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 10, gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  itemLabel: { fontSize: 15, fontWeight: '600' },
  itemScreen: { fontSize: 12, marginTop: 2 },
  reorderBtns: { flexDirection: 'column', gap: 2 },
  arrowBtn: { padding: 4 },
  arrowDisabled: { opacity: 0.4 },
  hintDrag: { fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 8 },
  empty: { textAlign: 'center', paddingVertical: 32, fontSize: 14 },
  floatingCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    marginHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
    zIndex: 1000,
    minHeight: 72,
  },
});
