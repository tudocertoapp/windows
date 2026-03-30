import React, { useRef, useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';

const ITEM_HEIGHT_EST = 52;
const MAX_VISIBLE = 5;
const VISIBLE_HEIGHT = ITEM_HEIGHT_EST * MAX_VISIBLE;
const SCROLL_STRIP_WIDTH = 10;

/**
 * Área de lista com máx 5 itens visíveis.
 * Quando há 6+ itens: scroll habilitado na lista + faixa de rolagem visual à direita + botão Ver mais.
 */
export function ScrollableCardList({
  items,
  renderItem,
  colors,
  accentColor,
  onVerMais,
  emptyText,
  itemMarginBottom = 4,
  fixedVisibleHeight = false,
  scrollStartsAt = 6,
  /** Centraliza a mensagem quando a lista está vazia (ex.: web desktop). */
  centerEmpty = false,
}) {
  const scrollRef = useRef(null);
  const [fillHeight, setFillHeight] = useState(VISIBLE_HEIGHT);
  const visibleHeight = fixedVisibleHeight === 'fill' ? fillHeight : VISIBLE_HEIGHT;
  const contentHeight = items.length * (ITEM_HEIGHT_EST + itemMarginBottom);
  const showStrip = items.length >= Math.max(1, Number(scrollStartsAt) || 6);
  const maxScroll = Math.max(0, contentHeight - visibleHeight);
  const thumbHeight = maxScroll > 0 ? Math.max(20, (visibleHeight / contentHeight) * visibleHeight) : visibleHeight;
  const thumbMaxTop = visibleHeight - thumbHeight;
  const [thumbPos, setThumbPos] = useState(0);

  const handleScroll = useCallback(
    (ev) => {
      if (!showStrip || maxScroll <= 0) return;
      const y = ev.nativeEvent.contentOffset.y;
      setThumbPos((y / maxScroll) * thumbMaxTop);
    },
    [showStrip, maxScroll, thumbMaxTop]
  );

  if (items.length === 0) {
    const textNode = (
      <Text style={[s.emptyText, { color: colors.textSecondary }, centerEmpty && s.emptyTextCentered]}>{emptyText}</Text>
    );
    if (centerEmpty) {
      return (
        <View
          style={[
            s.emptyWrap,
            fixedVisibleHeight === 'fill' ? { flex: 1, minHeight: 0 } : { minHeight: 72 },
          ]}
        >
          {textNode}
        </View>
      );
    }
    return textNode;
  }

  return (
    <View>
      {/*
        fixedVisibleHeight:
        - false: altura natural
        - true: trava em VISIBLE_HEIGHT (comportamento antigo)
        - 'fill': ocupa a altura disponível do pai (usado no grid do web desktop)
      */}
      <View
        style={[
          s.container,
          {
            flexDirection: 'row',
            ...(fixedVisibleHeight === 'fill'
              ? { flex: 1, minHeight: 0 }
              : (fixedVisibleHeight === true || showStrip)
                ? { height: VISIBLE_HEIGHT, maxHeight: VISIBLE_HEIGHT }
                : null),
          },
        ]}
        onLayout={(e) => {
          if (fixedVisibleHeight !== 'fill') return;
          const h = e?.nativeEvent?.layout?.height;
          if (typeof h === 'number' && h > 0 && Math.abs(h - fillHeight) > 1) {
            setFillHeight(h);
          }
        }}
      >
        <ScrollView
          ref={scrollRef}
          scrollEnabled={fixedVisibleHeight === 'fill' ? true : showStrip}
          style={
            (fixedVisibleHeight === 'fill')
              ? { flex: 1, minHeight: 0 }
              : (showStrip || fixedVisibleHeight === true)
              ? { height: VISIBLE_HEIGHT, flex: 1 }
                : { flex: 1 }
          }
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          nestedScrollEnabled
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          {items.map((item, idx) => (
            <View key={item?.id ?? idx} style={{ marginBottom: itemMarginBottom }}>
              {renderItem(item)}
            </View>
          ))}
        </ScrollView>
        {showStrip && (
          <View
            style={[
              s.scrollStrip,
              {
                width: SCROLL_STRIP_WIDTH,
                height: visibleHeight,
                backgroundColor: colors.border + '25',
                marginLeft: 8,
              },
              { pointerEvents: 'none' },
            ]}
          >
            <View
              style={[
                s.scrollThumb,
                {
                  top: thumbPos,
                  height: thumbHeight,
                  backgroundColor: (accentColor || colors.primary) + '80',
                },
              ]}
            />
          </View>
        )}
      </View>
      {items.length > MAX_VISIBLE && onVerMais && fixedVisibleHeight !== 'fill' && (
        <TouchableOpacity
          onPress={onVerMais}
          style={[s.verMaisBtn, { backgroundColor: (accentColor || colors.primary) + '26', borderColor: (accentColor || colors.primary) + '50' }]}
        >
          <Text style={[s.verMaisText, { color: accentColor || colors.primary }]}>Ver mais ({items.length} itens)</Text>
          <AppIcon name="expand-outline" size={20} color={accentColor || colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { overflow: 'hidden' },
  emptyWrap: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  emptyText: { fontSize: 14, paddingLeft: 4 },
  emptyTextCentered: { textAlign: 'center', paddingLeft: 0 },
  scrollStrip: { borderRadius: 5, justifyContent: 'flex-start', alignItems: 'center' },
  scrollThumb: { position: 'absolute', width: 6, borderRadius: 3, left: 2 },
  verMaisBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  verMaisText: { fontSize: 13, fontWeight: '600' },
});
