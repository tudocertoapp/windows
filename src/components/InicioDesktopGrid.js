import React, { useCallback, useMemo, useRef } from 'react';
import { Platform, View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playTapSound } from '../utils/sounds';
import {
  clampCardsPerRow,
  clampRowSpan,
  getPackedNeighbors,
  packInicioDesktop,
  originGridCells,
  rowHeightKey,
  MIN_CARDS_PER_ROW,
  MAX_CARDS_PER_ROW,
  DEFAULT_CARDS_PER_ROW,
} from '../utils/inicioDesktopLayout';
import { DraggableCard } from './DraggableCard';

const MIN_ROW_H = 148;

function ResizeHandle({ onDelta, axis = 'x' }) {
  const dragging = useRef(false);
  const last = useRef(0);
  const vertical = axis === 'y';

  const onDown = useCallback((e) => {
    dragging.current = true;
    last.current = vertical
      ? (e?.clientY ?? e?.nativeEvent?.pageY ?? 0)
      : (e?.clientX ?? e?.nativeEvent?.pageX ?? 0);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const move = (ev) => {
        if (!dragging.current) return;
        const cur = vertical ? ev.clientY : ev.clientX;
        const d = cur - last.current;
        last.current = cur;
        if (d) onDelta(d);
      };
      const up = () => {
        dragging.current = false;
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    }
    e?.preventDefault?.();
    e?.stopPropagation?.();
  }, [onDelta, vertical]);

  if (Platform.OS !== 'web') return null;
  return (
    <View
      pointerEvents="auto"
      onMouseDown={onDown}
      style={
        vertical
          ? {
              position: 'absolute',
              left: 20,
              right: 20,
              bottom: 2,
              height: 14,
              zIndex: 8,
              cursor: 'row-resize',
              alignItems: 'center',
              justifyContent: 'center',
            }
          : {
              position: 'absolute',
              top: 20,
              bottom: 20,
              right: 2,
              width: 14,
              zIndex: 8,
              cursor: 'col-resize',
              alignItems: 'center',
              justifyContent: 'center',
            }
      }
    >
      <View
        style={
          vertical
            ? { height: 3, width: '40%', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)' }
            : { width: 3, height: '70%', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)' }
        }
      />
    </View>
  );
}

function Chip({ label, active, colors, onPress, small }) {
  return (
    <TouchableOpacity
      onPress={() => {
        playTapSound();
        onPress?.();
      }}
      style={{
        minWidth: small ? 28 : 36,
        height: small ? 26 : 32,
        paddingHorizontal: small ? 6 : 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text style={{ fontSize: small ? 11 : 13, fontWeight: '700', color: active ? colors.primary : colors.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

function MovePad({ id, packed, colors, onMove }) {
  const n = getPackedNeighbors(packed, id);
  const btn = (dir, icon, enabled) => (
    <TouchableOpacity
      disabled={!enabled}
      onPress={() => {
        if (!enabled) return;
        playTapSound();
        onMove?.(id, dir);
      }}
      accessibilityLabel={`Mover card para ${dir}`}
      style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: enabled ? 1 : 0.28,
      }}
    >
      <Ionicons name={icon} size={14} color={enabled ? colors.text : colors.textSecondary} />
    </TouchableOpacity>
  );
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 8,
        bottom: 8,
        zIndex: 32,
        alignItems: 'center',
      }}
    >
      {btn('up', 'chevron-up', !!n.up)}
      <View style={{ flexDirection: 'row', gap: 4, marginVertical: 4 }}>
        {btn('left', 'chevron-back', !!n.left)}
        {btn('right', 'chevron-forward', !!n.right)}
      </View>
      {btn('down', 'chevron-down', !!n.down)}
    </View>
  );
}

function CellChrome({
  id,
  editMode,
  colors,
  onHide,
  onMove,
  packed,
  children,
  rowSpan,
  spanSide,
  rowCols,
  onRowColsChange,
  onRowSpanChange,
  onSpanSideChange,
  rowIndex,
}) {
  return (
    <View style={{ flex: 1, minWidth: 0, minHeight: 0, height: '100%', width: '100%', position: 'relative', overflow: 'hidden' }}>
      {children}
      {editMode ? (
        <>
          <MovePad id={id} packed={packed} colors={colors} onMove={onMove} />
          <View
            pointerEvents="auto"
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 40,
              padding: 6,
              borderRadius: 10,
              backgroundColor: colors.bg || colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              maxWidth: '78%',
              gap: 6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>Por linha</Text>
              {Array.from({ length: MAX_CARDS_PER_ROW - MIN_CARDS_PER_ROW + 1 }, (_, i) => MIN_CARDS_PER_ROW + i).map((n) => (
                <Chip
                  key={`cols-${n}`}
                  small
                  label={String(n)}
                  active={n === rowCols}
                  colors={colors}
                  onPress={() =>
                    onRowColsChange?.((prev) => ({
                      ...(prev || {}),
                      [rowIndex]: n,
                    }))
                  }
                />
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>Altura</Text>
              {[1, 2, 3].map((n) => (
                <Chip
                  key={`span-${n}`}
                  small
                  label={`${n}v`}
                  active={clampRowSpan(rowSpan) === n}
                  colors={colors}
                  onPress={() => onRowSpanChange?.(id, n)}
                />
              ))}
              {clampRowSpan(rowSpan) > 1 ? (
                <>
                  <Chip small label="◄" active={spanSide !== 'right'} colors={colors} onPress={() => onSpanSideChange?.(id, 'left')} />
                  <Chip small label="►" active={spanSide === 'right'} colors={colors} onPress={() => onSpanSideChange?.(id, 'right')} />
                </>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              playTapSound();
              onHide?.(id);
            }}
            accessibilityLabel="Ocultar card"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 40,
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="eye-off-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

function rowPx(heights, index, fallback) {
  return Math.max(MIN_ROW_H, Number(heights?.[rowHeightKey(index)] > 0 ? heights[rowHeightKey(index)] : fallback) || MIN_ROW_H);
}

export function InicioDesktopGrid({
  order,
  gap,
  heroMinHeight,
  defaultRowHeight,
  heights,
  onHeightsChange,
  editMode,
  colors,
  renderCard,
  onHide,
  onMove,
  dragProps,
  cardsPerRow = DEFAULT_CARDS_PER_ROW,
  onCardsPerRowChange,
  rowCols = {},
  rowSpans = {},
  spanSide = {},
  onRowColsChange,
  onRowSpansChange,
  onSpanSideChange,
}) {
  const defaultH = Math.max(MIN_ROW_H, defaultRowHeight || MIN_ROW_H);
  const fallbackH = defaultH;
  const defaultCols = clampCardsPerRow(cardsPerRow);
  const rowGap = Math.max(12, Number(gap) || 16);

  const packed = useMemo(
    () =>
      packInicioDesktop({
        order,
        defaultCols,
        rowCols,
        rowSpans,
        spanSide,
      }),
    [order, defaultCols, rowCols, rowSpans, spanSide]
  );

  const cells = useMemo(() => originGridCells(packed), [packed]);

  const templateRows = packed.map((_, i) => `${rowPx(heights, i, fallbackH)}px`).join(' ');

  return (
    <View style={{ width: '100%', zIndex: 0 }}>
      {editMode ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: rowGap,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 12,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Cards por linha</Text>
          {Array.from({ length: MAX_CARDS_PER_ROW - MIN_CARDS_PER_ROW + 1 }, (_, i) => MIN_CARDS_PER_ROW + i).map((n) => (
            <Chip
              key={n}
              label={String(n)}
              active={n === defaultCols}
              colors={colors}
              onPress={() => {
                onCardsPerRowChange?.(n);
                onRowColsChange?.({});
              }}
            />
          ))}
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Padrão para linhas novas. Em cada card dá para mudar só aquela linha.</Text>
        </View>
      ) : null}
      <View
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
          gridTemplateRows: templateRows || `${fallbackH}px`,
          columnGap: rowGap,
          rowGap,
        }}
      >
        {cells.map((cell) => (
          <View
            key={`slot-${cell.id}`}
            style={{
              gridColumnStart: (cell.trackStart || 0) + 1,
              gridColumnEnd: `span ${Math.max(1, cell.trackWidth || 1)}`,
              gridRowStart: cell.index + 1,
              gridRowEnd: `span ${cell.span}`,
              minWidth: 0,
              minHeight: 0,
              height: '100%',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <DraggableCard id={cell.id} editMode={false} {...dragProps} isFloating={false}>
              <CellChrome
                id={cell.id}
                editMode={editMode}
                colors={colors}
                onHide={onHide}
                onMove={onMove}
                packed={packed}
                rowSpan={rowSpans[cell.id] || 1}
                spanSide={spanSide[cell.id] || 'left'}
                rowCols={cell.cols}
                rowIndex={cell.index}
                onRowColsChange={onRowColsChange}
                onRowSpanChange={onRowSpansChange}
                onSpanSideChange={onSpanSideChange}
              >
                {renderCard(cell.id)}
              </CellChrome>
            </DraggableCard>
            {editMode ? (
              <ResizeHandle
                axis="y"
                onDelta={(dy) => {
                  onHeightsChange((prev) => {
                    const a = rowPx(prev, cell.index, fallbackH);
                    return { ...(prev || {}), [rowHeightKey(cell.index)]: Math.max(MIN_ROW_H, a + dy) };
                  });
                }}
              />
            ) : null}
          </View>
        ))}
      </View>
      {editMode ? (
        <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 10 }}>
          “Por linha” escolhe 1 a 4 cards na horizontal. “Altura” 1v–3v faz o card descer sem cobrir os vizinhos.
        </Text>
      ) : null}
    </View>
  );
}
