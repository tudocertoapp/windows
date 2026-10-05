import React, { useRef, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { AppIcon } from './AppIcon';
import { CardScrollbar, CARD_SCROLLBAR_W } from './CardScrollbar';

const ITEM_HEIGHT_EST = 52;
const MAX_VISIBLE = 5;
const VISIBLE_HEIGHT = ITEM_HEIGHT_EST * MAX_VISIBLE;

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
  scrollStripSide = 'right',
  /** Centraliza a mensagem quando a lista está vazia (ex.: web desktop). */
  centerEmpty = false,
  /** No card da home: exibe só os N primeiros; o restante via Ver mais. */
  maxPreviewItems = null,
}) {
  const allItems = items || [];
  const displayItems =
    maxPreviewItems != null && maxPreviewItems > 0
      ? allItems.slice(0, maxPreviewItems)
      : allItems;
  const hasMorePreview =
    maxPreviewItems != null && maxPreviewItems > 0 && allItems.length > maxPreviewItems;
  const totalCount = allItems.length;
  const scrollRef = useRef(null);
  const [fillHeight, setFillHeight] = useState(VISIBLE_HEIGHT);
  const visibleHeight = fixedVisibleHeight === 'fill' ? fillHeight : VISIBLE_HEIGHT;
  const contentHeight = displayItems.length * (ITEM_HEIGHT_EST + itemMarginBottom);
  const minScrollItems = Math.max(1, Number(scrollStartsAt) || 6);
  const overflowByHeight = contentHeight > visibleHeight + 2;
  const showStrip =
    !hasMorePreview &&
    (fixedVisibleHeight === 'fill'
      ? overflowByHeight || displayItems.length >= minScrollItems
      : displayItems.length >= minScrollItems);
  const maxScroll = Math.max(0, contentHeight - visibleHeight);
  const thumbHeight = maxScroll > 0 ? Math.max(20, (visibleHeight / contentHeight) * visibleHeight) : visibleHeight;
  const thumbMaxTop = visibleHeight - thumbHeight;
  const [thumbPos, setThumbPos] = useState(0);
  const stripOnLeft = showStrip && scrollStripSide === 'left';
  const stripOnRight = showStrip && scrollStripSide !== 'left';

  const handleScroll = useCallback(
    (ev) => {
      if (maxScroll <= 0) return;
      const y = ev.nativeEvent.contentOffset.y;
      setThumbPos(Math.max(0, Math.min((y / maxScroll) * thumbMaxTop, thumbMaxTop)));
    },
    [maxScroll, thumbMaxTop]
  );

  const scrollViewStyle = useMemo(() => {
    const pad = showStrip ? CARD_SCROLLBAR_W + 4 : 0;
    const sidePad = stripOnLeft ? { paddingLeft: pad } : stripOnRight ? { paddingRight: pad } : null;
    if (fixedVisibleHeight === 'fill') {
      const base = { flex: 1, minHeight: 0, ...sidePad };
      if (Platform.OS === 'web') {
        return { ...base, overflow: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' };
      }
      return base;
    }
    if (showStrip || fixedVisibleHeight === true) {
      return { height: VISIBLE_HEIGHT, flex: 1, ...sidePad };
    }
    return { flex: 1, ...sidePad };
  }, [fixedVisibleHeight, showStrip, stripOnLeft, stripOnRight]);

  if (displayItems.length === 0) {
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

  const strip = (
    <CardScrollbar
      visible={showStrip}
      height={visibleHeight}
      thumbTop={thumbPos}
      thumbHeight={thumbHeight}
      colors={colors}
      accentColor={accentColor}
    />
  );

  return (
    <View style={fixedVisibleHeight === 'fill' ? { flex: 1, minHeight: 0 } : null}>
      <View
        style={[
          s.container,
          fixedVisibleHeight === 'fill' && Platform.OS === 'web' ? s.containerWebFill : null,
          {
            position: 'relative',
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
        {stripOnLeft ? strip : null}
        <ScrollView
          ref={scrollRef}
          scrollEnabled={fixedVisibleHeight === 'fill' || showStrip}
          style={scrollViewStyle}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 8, flexGrow: 0 }}
          {...(Platform.OS === 'web' ? { className: 'tc-card-scroll' } : null)}
        >
          {displayItems.map((item, idx) => (
            <View key={item?.id ?? idx} style={{ marginBottom: itemMarginBottom }}>
              {renderItem(item)}
            </View>
          ))}
        </ScrollView>
        {stripOnRight ? strip : null}
      </View>
      {onVerMais && (hasMorePreview || (displayItems.length > MAX_VISIBLE && fixedVisibleHeight !== 'fill')) && (
        <TouchableOpacity
          onPress={onVerMais}
          style={[s.verMaisBtn, { backgroundColor: (accentColor || colors.primary) + '26', borderColor: (accentColor || colors.primary) + '50' }]}
        >
          <Text style={[s.verMaisText, { color: accentColor || colors.primary }]}>
            {hasMorePreview
              ? `Ver mais (${totalCount} itens)`
              : `Ver mais (${displayItems.length} itens)`}
          </Text>
          <AppIcon name="expand-outline" size={20} color={accentColor || colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { overflow: 'hidden' },
  containerWebFill: { overflow: 'visible' },
  emptyWrap: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  emptyText: { fontSize: 14, paddingLeft: 4 },
  emptyTextCentered: { textAlign: 'center', paddingLeft: 0 },
  verMaisBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  verMaisText: { fontSize: 13, fontWeight: '600' },
});
