import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ScrollView as RNGHScrollView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedRef, useAnimatedScrollHandler, scrollTo, runOnJS } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { useMenu } from '../contexts/MenuContext';
import { usePlan } from '../contexts/PlanContext';
import { TopBar } from '../components/TopBar';
import { AgendaFormModal } from '../components/AgendaFormModal';
import { playTapSound } from '../utils/sounds';
import { formatCurrency } from '../utils/format';

const { width: SW } = Dimensions.get('window');
const DAY_WIDTH = 44;
const DAY_MARGIN = 6;
const DAY_ITEM_WIDTH = DAY_WIDTH + DAY_MARGIN * 2;
const HOUR_HEIGHT = 56;
const CAROUSEL_PADDING_V = 5;
const MIN_ZOOM = 0.84;
const MAX_ZOOM = 3;

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const as = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    paddingTop: 2,
  },
  headerLeft: { flex: 1, alignItems: 'center' },
  monthBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  monthText: { fontSize: 18, fontWeight: '700', textTransform: 'uppercase' },
  dayText: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCarousel: {
    paddingTop: 4,
    paddingBottom: 2,
    paddingHorizontal: 12,
    marginTop: 0,
    marginBottom: 0,
    overflow: 'visible',
  },
  dayItem: {
    width: DAY_WIDTH,
    marginHorizontal: DAY_MARGIN,
    borderRadius: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCount: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  dayNum: { fontSize: 16, fontWeight: '700' },
  timelineRow: {
    flexDirection: 'row',
    flex: 1,
    minHeight: HOUR_HEIGHT,
    borderBottomWidth: 1,
    overflow: 'visible',
  },
  timelineHour: { width: 52, paddingTop: 6, paddingRight: 8, alignItems: 'flex-end', position: 'relative' },
  hourText: { fontSize: 12, fontWeight: '500' },
  timelineContent: { flex: 1, position: 'relative', minHeight: 1, overflow: 'visible' },
  timelineContentFull: { flex: 1, position: 'relative', overflow: 'visible', borderLeftWidth: 1, borderColor: 'transparent' },
  eventBlock: {
    position: 'absolute',
    borderRadius: 10,
    padding: 8,
    paddingRight: 44,
    borderLeftWidth: 4,
    overflow: 'visible',
    minHeight: 80,
  },
  eventBlockContent: { flex: 1, flexDirection: 'column', justifyContent: 'flex-start' },
  eventTitle: { fontSize: 12, fontWeight: '600' },
  eventTime: { fontSize: 10, marginTop: 2 },
  eventMeta: { fontSize: 9, marginTop: 2 },
  eventActionsWrap: { position: 'absolute', top: 4, right: 4, alignItems: 'center', zIndex: 5 },
  eventMenuBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  eventActionsList: { flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 4, marginTop: 2 },
  eventActionBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  pickerCard: { borderRadius: 20, borderWidth: 1, padding: 20, maxHeight: 420 },
  pickerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  pickerItem: { paddingVertical: 14, borderBottomWidth: 1 },
  pickerClose: { marginTop: 12, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  calendarYearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, gap: 16 },
  calendarMonthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8, gap: 12 },
  calendarWeekRow: { flexDirection: 'row', marginBottom: 4 },
  calendarWeekday: { flex: 1, alignItems: 'center', paddingVertical: 6 },
});

function formatDayKey(d) {
  if (!d) return '';
  const day = d.getDate();
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  return `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

function normalizeDateKey(str) {
  if (!str || !String(str).trim()) return '';
  const s = String(str).trim();
  const parts = s.split(/[/\-]/);
  if (parts.length < 3) return '';
  let day, month, year;
  if (parts[0].length === 4) {
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  }
  if (isNaN(day) || isNaN(month) || isNaN(year)) return '';
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function parseTimeToMinutes(str) {
  if (!str || !str.trim()) return 0;
  const [h, m] = str.trim().split(/[:\h]/).map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

const MAX_LANES = 5;

function getEventLayouts(events) {
  const withTimes = events.map((e) => {
    const startM = parseTimeToMinutes(e.time);
    const endM = e.timeEnd ? parseTimeToMinutes(e.timeEnd) : startM + 60;
    const duration = Math.max(15, endM - startM);
    return { event: e, startM, endM, duration };
  }).sort((a, b) => a.startM - b.startM);

  const laneEnds = Array(MAX_LANES).fill(0);
  let maxLaneUsed = 0;
  const layouts = withTimes.map(({ event, startM, endM, duration }) => {
    let lane = 0;
    for (let i = 0; i < MAX_LANES; i++) {
      if (laneEnds[i] <= startM) {
        lane = i;
        laneEnds[i] = endM;
        maxLaneUsed = Math.max(maxLaneUsed, lane + 1);
        break;
      }
    }
    if (laneEnds[lane] <= startM) laneEnds[lane] = endM;
    return { event, startM, endM, duration, lane };
  });
  const lanesUsed = Math.max(1, maxLaneUsed);
  return layouts.map((l) => ({ ...l, lanesUsed }));
}

function getDaysAround(base, count = 90) {
  const arr = [];
  const start = new Date(base);
  start.setDate(start.getDate() - Math.floor(count / 2));
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    arr.push(d);
  }
  return arr;
}

function getCalendarGrid(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay();
  const daysInMonth = last.getDate();
  const cells = [];
  const before = startDow;
  for (let i = 0; i < before; i++) {
    const d = new Date(year, month, 1 - (before - i));
    cells.push({ date: d, empty: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), empty: false });
  }
  const remaining = 42 - cells.length;
  for (let i = 0; i < remaining; i++) {
    cells.push({ date: new Date(year, month + 1, i + 1), empty: true });
  }
  return cells;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function AgendaScreen() {
  const { agendaEvents, deleteAgendaEvent, updateAgendaEvent, checkListItems, clients } = useFinance();
  const { colors } = useTheme();
  const { openAddModal } = useMenu();
  const { showEmpresaFeatures } = usePlan();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [displayedMonthDate, setDisplayedMonthDate] = useState(() => new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [agendaFormState, setAgendaFormState] = useState({ visible: false, editingEvent: null });
  const [openEventActionsId, setOpenEventActionsId] = useState(null);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(() => new Date().getMonth());
  const [isPinching, setIsPinching] = useState(false);
  const dayScrollRef = useRef(null);
  const lastCenteredIndexRef = useRef(-1);
  const containerRef = useRef(null);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const pinchPrevScale = useSharedValue(1);
  const pinchPrevFocalY = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const viewHeight = useSharedValue(400);
  const mainScrollRef = useAnimatedRef();
  const AnimatedScrollView = useMemo(() => Animated.createAnimatedComponent(RNGHScrollView), []);

  const setPinchingJS = useCallback((v) => setIsPinching(v), []);

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin((e) => {
          'worklet';
          runOnJS(setPinchingJS)(true);
          savedScale.value = scale.value;
          pinchPrevScale.value = scale.value;
          const vh = viewHeight.value;
          pinchPrevFocalY.value = Math.max(0, Math.min(vh, e.focalY));
        })
        .onUpdate((e) => {
          'worklet';
          const vh = viewHeight.value;
          const focal = Math.max(0, Math.min(vh, e.focalY));
          const startScale = savedScale.value;
          const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, startScale * e.scale));
          const prevScale = pinchPrevScale.value;
          if (prevScale <= 0) return;

          const ratio = newScale / prevScale;
          const panDy = focal - pinchPrevFocalY.value;
          const currentScroll = scrollY.value;
          let nextScroll = (currentScroll + focal) * ratio - focal - panDy;
          const contentH = 24 * HOUR_HEIGHT * newScale + 20;
          const maxScroll = Math.max(0, contentH - vh);
          nextScroll = Math.max(0, Math.min(nextScroll, maxScroll));

          scale.value = newScale;
          pinchPrevScale.value = newScale;
          pinchPrevFocalY.value = focal;
          scrollY.value = nextScroll;
          scrollTo(mainScrollRef, 0, nextScroll, false);
        })
        .onFinalize(() => {
          'worklet';
          runOnJS(setPinchingJS)(false);
        }),
    [setPinchingJS]
  );

  const handleAddPress = () => {
    Alert.alert('Adicionar', 'O que deseja criar?', [
      { text: 'Novo evento', onPress: () => openAddModal?.('agenda', { date: formatDayKey(selectedDate) }) },
      { text: 'Nova tarefa', onPress: () => openAddModal?.('tarefa') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const daysToShow = useMemo(() => getDaysAround(selectedDate, 90), [selectedDate.getTime()]);
  const eventsByDay = useMemo(() => {
    const map = {};
    agendaEvents.forEach((e) => {
      const key = normalizeDateKey(e.date);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
    });
    return map;
  }, [agendaEvents]);

  const daysWithContent = useMemo(() => {
    const set = new Set();
    agendaEvents.forEach((e) => {
      const k = normalizeDateKey(e.date);
      if (k) set.add(k);
    });
    checkListItems.forEach((t) => {
      const k = normalizeDateKey(t.date);
      if (k) set.add(k);
    });
    return set;
  }, [agendaEvents, checkListItems]);

  const selectedKey = formatDayKey(selectedDate);
  const eventsForSelected = eventsByDay[selectedKey] || [];

  const isToday = (d) => {
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentMonthIdx = displayedMonthDate.getMonth();
  const currentMonthName = MONTHS[currentMonthIdx];
  const currentDay = now.getDate();

  const scrollToCenterDay = useCallback((index) => {
    const paddingH = 12;
    const centerX = paddingH + DAY_MARGIN + DAY_WIDTH / 2 + index * DAY_ITEM_WIDTH;
    const scrollX = Math.max(0, centerX - SW / 2);
    dayScrollRef.current?.scrollTo({ x: scrollX, animated: true });
  }, []);

  const handleDayScroll = useCallback(
    (e) => {
      const offset = e.nativeEvent.contentOffset.x;
      const paddingH = 12;
      const centerOffset = offset + SW / 2 - (paddingH + DAY_MARGIN + DAY_WIDTH / 2);
      const dayIndex = Math.round(centerOffset / DAY_ITEM_WIDTH);
      const clamped = Math.max(0, Math.min(dayIndex, daysToShow.length - 1));
      if (clamped !== lastCenteredIndexRef.current) {
        lastCenteredIndexRef.current = clamped;
      }
      const d = daysToShow[clamped];
      if (d && (d.getMonth() !== displayedMonthDate.getMonth() || d.getFullYear() !== displayedMonthDate.getFullYear())) {
        setDisplayedMonthDate(new Date(d));
      }
    },
    [daysToShow, displayedMonthDate]
  );

  const CENTER_DAY_INDEX = Math.floor(90 / 2);

  const handleDayPress = useCallback(
    (d) => {
      playTapSound();
      setSelectedDate(new Date(d));
      setDisplayedMonthDate(new Date(d));
      setTimeout(() => scrollToCenterDay(CENTER_DAY_INDEX), 80);
    },
    [scrollToCenterDay]
  );

  const handleCalendarDaySelect = useCallback((d) => {
    playTapSound();
    setSelectedDate(new Date(d));
    setDisplayedMonthDate(new Date(d));
    setShowMonthPicker(false);
    setTimeout(() => scrollToCenterDay(CENTER_DAY_INDEX), 100);
  }, [scrollToCenterDay]);

  useEffect(() => {
    const t = setTimeout(() => scrollToCenterDay(CENTER_DAY_INDEX), 100);
    return () => clearTimeout(t);
  }, [scrollToCenterDay]);

  useEffect(() => {
    if (showMonthPicker) {
      setPickerYear(displayedMonthDate.getFullYear());
      setPickerMonth(displayedMonthDate.getMonth());
    }
  }, [showMonthPicker, displayedMonthDate]);

  const isTodaySelected = isToday(selectedDate);

  const animatedTimelineStyle = useAnimatedStyle(() => ({
    height: 24 * HOUR_HEIGHT * scale.value,
  }));

  const onTimelineScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <TopBar title="Agenda" colors={colors} hideOrganize hideMenu hideLogoIcon />
      <View ref={containerRef} style={{ flex: 1 }} collapsable={false}>
        {/* Parte fixa: header, carousel de dias, cabeçalho do cronograma */}
        <View style={{ backgroundColor: colors.bg }}>
          <View style={[as.header, { backgroundColor: colors.bg }]}>
            <View style={as.headerLeft}>
              <TouchableOpacity
                style={as.monthBtn}
                onPress={() => {
                  playTapSound();
                  setShowMonthPicker(true);
                }}
              >
                <Text style={[as.monthText, { color: colors.text }]}>{currentMonthName.toUpperCase()} {displayedMonthDate.getFullYear()}</Text>
                <Ionicons name="chevron-down" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={[as.dayText, { color: colors.textSecondary }]}>{isToday(selectedDate) ? 'Dia atual' : `DIA ${selectedDate.getDate()}`}</Text>
            </View>
            <TouchableOpacity
              style={[as.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                playTapSound();
                handleAddPress();
              }}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={dayScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            persistentScrollbar={false}
            contentContainerStyle={[as.dayCarousel, { backgroundColor: colors.card }]}
            snapToInterval={DAY_ITEM_WIDTH}
            snapToAlignment="center"
            decelerationRate="fast"
            onScroll={handleDayScroll}
            onMomentumScrollEnd={handleDayScroll}
            onScrollEndDrag={handleDayScroll}
            scrollEventThrottle={100}
          >
            {daysToShow.map((d) => {
              const key = formatDayKey(d);
              const selected = key === selectedKey;
              const count = (eventsByDay[key] || []).length;
              const hasContent = daysWithContent.has(key);
              const dayIsToday = isToday(d);
              return (
                <TouchableOpacity
                  key={d.getTime()}
                  style={[
                    as.dayItem,
                    {
                      backgroundColor: selected ? (dayIsToday ? colors.primary : colors.primary) : colors.bg,
                      borderWidth: dayIsToday ? 2 : 0,
                      borderColor: dayIsToday ? (selected ? '#fff' : colors.primary) : 'transparent',
                    },
                  ]}
                  onPress={() => handleDayPress(d)}
                >
                  {hasContent && <View style={{ position: 'absolute', top: 6, right: 8, width: 5, height: 5, borderRadius: 3, backgroundColor: selected ? 'rgba(255,255,255,0.9)' : colors.primary }} />}
                  <Text style={[as.dayCount, { color: selected ? 'rgba(255,255,255,0.9)' : colors.textSecondary }]}>{count}</Text>
                  <Text style={[as.dayNum, { color: selected ? '#fff' : colors.text }]}>{d.getDate()}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
            <View style={{ width: 52 }} />
            <View style={{ flex: 1 }} />
          </View>
        </View>

        <GestureDetector gesture={pinchGesture}>
        <View
          style={{ flex: 1 }}
          onLayout={(e) => {
            const { height } = e.nativeEvent.layout;
            viewHeight.value = height;
          }}
          collapsable={false}
        >
        <AnimatedScrollView
          ref={mainScrollRef}
          style={{ flex: 1 }}
          scrollEnabled={!isPinching}
          onScroll={onTimelineScroll}
          scrollEventThrottle={1}
          showsVerticalScrollIndicator
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <Animated.View style={[animatedTimelineStyle, { flexDirection: 'row' }]}>
            <View style={{ width: 52, borderRightWidth: 1, borderColor: colors.border }}>
              {HOURS.map((hour) => (
                <View key={hour} style={[as.timelineHour, { height: `${100 / 24}%`, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <Text style={[as.hourText, { color: colors.textSecondary }]}>{String(hour).padStart(2, '0')}:00</Text>
                </View>
              ))}
            </View>
            <View style={[as.timelineContentFull, { height: '100%', borderColor: colors.border }]}>
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {HOURS.map((hour) => (
                  <View
                    key={`hour-grid-${hour}`}
                    style={{
                      height: `${100 / 24}%`,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      opacity: 0.8,
                    }}
                  />
                ))}
              </View>
              {isTodaySelected && (
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: `${(currentMinutes / 1440) * 100}%`,
                    height: 2,
                    backgroundColor: colors.primary,
                    zIndex: 10,
                  }}
                />
              )}
              {getEventLayouts(eventsForSelected).map(({ event: e, startM, endM, duration, lane, lanesUsed }) => {
                const isConcluido = e.status === 'concluido';
                const isActionsOpen = openEventActionsId === e.id;
                const openEdit = () => {
                  playTapSound();
                  setAgendaFormState({ visible: true, editingEvent: e });
                };
                const slotWidth = (100 - (lanesUsed - 1) * 1) / lanesUsed;
                const left = lane * (slotWidth + 1);
                const width = slotWidth;
                return (
                  <TouchableOpacity
                    key={e.id}
                    activeOpacity={0.8}
                    onPress={openEdit}
                    style={[
                      as.eventBlock,
                      {
                        left: `${left}%`,
                        width: `${width}%`,
                        top: `${(startM / 1440) * 100}%`,
                        height: `${(duration / 1440) * 100}%`,
                        minHeight: 80,
                        backgroundColor: isConcluido ? colors.primaryRgba(0.08) : colors.primaryRgba(0.15),
                        borderLeftColor: isConcluido ? colors.textSecondary : colors.primary,
                        opacity: isConcluido ? 0.85 : 1,
                      },
                    ]}
                  >
                    <View style={[as.eventBlockContent, { flex: 1 }]}>
                      <Text style={[as.eventTitle, { color: colors.text, textDecorationLine: isConcluido ? 'line-through' : 'none' }]}>
                        {((e.tipo === 'empresa' && e.clientId) ? (clients?.find((c) => c.id === e.clientId)?.name) : null) || (e.title || '').replace(/^Pré-pedido\s*[-–]\s*/i, '').trim() || 'Evento'}
                      </Text>
                      <Text style={[as.eventTime, { color: colors.primary }]}>
                        {e.time || '--:--'}{e.timeEnd ? ` - ${e.timeEnd}` : ''}
                      </Text>
                      {e.tipo === 'empresa' && (() => {
                        const p = [];
                        if (e.amount > 0) p.push(formatCurrency(e.amount));
                        if (e.type === 'venda') p.push('Venda');
                        else if (e.type === 'orcamento') p.push('Orçamento');
                        else if (e.type === 'manutencao') p.push('Garantia');
                        return p.length ? (
                          <Text style={[as.eventMeta, { color: colors.textSecondary }]}>{p.join(' · ')}</Text>
                        ) : null;
                      })()}
                    </View>
                    <View style={as.eventActionsWrap}>
                      <TouchableOpacity
                        onPress={(ev) => {
                          ev?.stopPropagation?.();
                          playTapSound();
                          setOpenEventActionsId((prev) => (prev === e.id ? null : e.id));
                        }}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={[as.eventMenuBtn, { backgroundColor: colors.bg + 'CC' }]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={isActionsOpen ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal'} size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      {isActionsOpen && (
                        <View style={as.eventActionsList}>
                          <TouchableOpacity
                            onPress={(ev) => { ev?.stopPropagation?.(); openEdit(); }}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={[as.eventActionBtn, { backgroundColor: colors.bg + 'E6' }]}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="pencil" size={18} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={(ev) => {
                              ev?.stopPropagation?.();
                              playTapSound();
                              const isEmpresaEvent = showEmpresaFeatures && (e.tipo === 'empresa');
                              if (isEmpresaEvent && !isConcluido) {
                                openAddModal?.('receita', { fromAgendaEvent: e });
                              } else {
                                updateAgendaEvent(e.id, { status: isConcluido ? 'pendente' : 'concluido' });
                              }
                            }}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={[as.eventActionBtn, { backgroundColor: colors.bg + 'E6' }]}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="checkmark-done" size={18} color="#10b981" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={(ev) => {
                              ev?.stopPropagation?.();
                              playTapSound();
                              Alert.alert('Excluir', 'Quer realmente excluir este evento?', [
                                { text: 'Cancelar' },
                                { text: 'Excluir', style: 'destructive', onPress: () => deleteAgendaEvent(e.id) },
                              ]);
                            }}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={[as.eventActionBtn, { backgroundColor: colors.bg + 'E6' }]}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {eventsForSelected.length === 0 && (
            <View style={[as.empty, { marginTop: 24 }]}>
              <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
              <Text style={{ fontSize: 15, color: colors.textSecondary }}>Nenhum evento neste dia</Text>
            </View>
          )}

          <View style={{ height: 80 }} />
        </AnimatedScrollView>
        </View>
        </GestureDetector>
      </View>

      <Modal visible={showMonthPicker} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowMonthPicker(false)} />
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[as.pickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[as.calendarYearRow, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12 }]}>
              <TouchableOpacity
                onPress={() => {
                  playTapSound();
                  setPickerYear((y) => Math.max(2020, y - 1));
                }}
                style={{ padding: 8 }}
              >
                <Ionicons name="chevron-back" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, minWidth: 60, textAlign: 'center' }}>{pickerYear}</Text>
              <TouchableOpacity
                onPress={() => {
                  playTapSound();
                  setPickerYear((y) => Math.min(2035, y + 1));
                }}
                style={{ padding: 8 }}
              >
                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={[as.calendarMonthRow, { marginTop: 8 }]}>
              <TouchableOpacity
                onPress={() => {
                  playTapSound();
                  setPickerMonth((m) => (m <= 0 ? 11 : m - 1));
                  if (pickerMonth <= 0) setPickerYear((y) => y - 1);
                }}
                style={{ padding: 6 }}
              >
                <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, minWidth: 120, textAlign: 'center' }}>{MONTHS[pickerMonth]}</Text>
              <TouchableOpacity
                onPress={() => {
                  playTapSound();
                  setPickerMonth((m) => (m >= 11 ? 0 : m + 1));
                  if (pickerMonth >= 11) setPickerYear((y) => y + 1);
                }}
                style={{ padding: 6 }}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[as.calendarWeekRow, { marginTop: 8 }]}>
              {WEEKDAYS.map((wd) => (
                <View key={wd} style={[as.calendarWeekday]}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>{wd}</Text>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 8 }}>
              {[0, 1, 2, 3, 4, 5].map((row) => (
                <View key={row} style={{ flexDirection: 'row' }}>
                  {getCalendarGrid(pickerYear, pickerMonth).slice(row * 7, row * 7 + 7).map((cell, idx) => {
                    const key = formatDayKey(cell.date);
                    const sel = !cell.empty && key === selectedKey;
                    const isCurMonth = !cell.empty && cell.date.getMonth() === pickerMonth;
                    const dayIsToday = !cell.empty && isToday(cell.date);
                    const hasContent = !cell.empty && daysWithContent.has(key);
                    return (
                      <TouchableOpacity
                        key={row * 7 + idx}
                        style={[
                          { flex: 1, paddingVertical: 8, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', position: 'relative' },
                          {
                            backgroundColor: sel ? colors.primary : 'transparent',
                            borderRadius: 18,
                            opacity: cell.empty ? 0.25 : isCurMonth ? 1 : 0.5,
                            borderWidth: dayIsToday ? 2 : 0,
                            borderColor: dayIsToday ? (sel ? '#fff' : colors.primary) : 'transparent',
                          },
                        ]}
                        onPress={() => !cell.empty && handleCalendarDaySelect(cell.date)}
                      >
                        {hasContent && <View style={{ position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: sel ? 'rgba(255,255,255,0.9)' : colors.primary }} />}
                        <Text style={{ fontSize: 14, fontWeight: sel ? '700' : '500', color: sel ? '#fff' : colors.text }}>{cell.date.getDate()}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[as.pickerClose, { backgroundColor: colors.primary }]}
              onPress={() => {
                playTapSound();
                setShowMonthPicker(false);
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Fechar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>

      <AgendaFormModal
        visible={agendaFormState.visible}
        editingEvent={agendaFormState.editingEvent}
        initialDate={formatDayKey(selectedDate)}
        onClose={() => setAgendaFormState({ visible: false, editingEvent: null })}
        onOpenNewClient={() => openAddModal?.('cliente')}
        onOpenNewService={() => openAddModal?.('servico')}
      />
    </SafeAreaView>
  );
}
