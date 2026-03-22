import React, { useState, useMemo, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  InteractionManager,
} from 'react-native';
import { Gesture, GestureDetector, ScrollView as RNGHScrollView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedRef, useAnimatedScrollHandler, scrollTo, runOnJS, withTiming, withSpring, Easing, cancelAnimation } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { useMenu } from '../contexts/MenuContext';
import { usePlan } from '../contexts/PlanContext';
import { AgendaFormModal } from '../components/AgendaFormModal';
import { playTapSound } from '../utils/sounds';
import { formatCurrency } from '../utils/format';

const { width: SW } = Dimensions.get('window');
const WEEK_CAROUSEL_PADDING_H = 12;
const AVAILABLE_WEEK_WIDTH = SW - 2 * WEEK_CAROUSEL_PADDING_H;
const DAY_ITEM_WIDTH = AVAILABLE_WEEK_WIDTH / 7;
const DAY_MARGIN = 4;
const DAY_WIDTH = Math.max(40, DAY_ITEM_WIDTH - DAY_MARGIN * 2);
const HOUR_HEIGHT = 56;
const CAROUSEL_PADDING_V = 5;
const MIN_ZOOM = 0.84;
const MAX_ZOOM = 3;
const CARD_GAP_PERCENT = 0.5;
const TIMELINE_PADDING = 8;
const SHOW_EVENT_MENU = false;

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const as = StyleSheet.create({
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  compactTitle: { fontSize: 18, fontWeight: '700', marginRight: 4 },
  compactMonthBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  compactMonthText: { fontSize: 15, fontWeight: '600' },
  compactIconBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  compactAddBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
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
    paddingTop: 6,
    paddingBottom: 8,
    marginTop: 0,
    marginBottom: 0,
    overflow: 'visible',
  },
  weekdayHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 4,
  },
  weekdayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  weekdayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    gap: 4,
  },
  dayItem: {
    width: DAY_WIDTH,
    marginHorizontal: DAY_MARGIN,
    borderRadius: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCount: { fontSize: 11, fontWeight: '600', marginTop: 4 },
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
  timelineContentFull: { flex: 1, position: 'relative', overflow: 'hidden' },
  eventBlock: {
    position: 'absolute',
    borderRadius: 10,
    padding: 8,
    paddingRight: 44,
    borderLeftWidth: 4,
    overflow: 'hidden',
    minHeight: 80,
  },
  eventBlockContent: { flex: 1, flexDirection: 'column', justifyContent: 'flex-start' },
  eventTitle: { fontSize: 12, fontWeight: '600' },
  eventTime: { fontSize: 10, marginTop: 2 },
  eventMeta: { fontSize: 9, marginTop: 2 },
  eventActionsWrap: { position: 'absolute', top: 5, right: 7, alignItems: 'center', zIndex: 9999, elevation: 9999 },
  eventMenuBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', zIndex: 10000, elevation: 10000 },
  eventActionsList: { flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 4, marginTop: 2 },
  eventActionBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  searchModalCard: { borderRadius: 20, borderWidth: 1, padding: 16, width: '100%', maxWidth: 400 },
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

  // Agrupa por primeira hora de início para dividir largura horizontal.
  // Ex: 2 eventos na mesma hora inicial => 50% cada; 3 => 33.333% cada.
  const byStartHour = {};
  layouts.forEach((l) => {
    const key = String(Math.floor(l.startM / 60));
    if (!byStartHour[key]) byStartHour[key] = [];
    byStartHour[key].push(l);
  });
  Object.keys(byStartHour).forEach((k) => {
    byStartHour[k].sort((a, b) => a.startM - b.startM || a.endM - b.endM);
  });

  const hourMeta = new Map();
  Object.keys(byStartHour).forEach((k) => {
    const list = byStartHour[k];
    const hourStartM = parseInt(k, 10) * 60;
    list.forEach((item, idx) => {
      hourMeta.set(item.event.id, {
        sameHourIndex: idx,
        sameHourCount: list.length,
        hourStartM,
      });
    });
  });

  const lanesUsed = Math.max(1, maxLaneUsed);
  return layouts.map((l) => ({
    ...l,
    lanesUsed,
    sameHourIndex: hourMeta.get(l.event.id)?.sameHourIndex || 0,
    sameHourCount: hourMeta.get(l.event.id)?.sameHourCount || 1,
    hourStartM: hourMeta.get(l.event.id)?.hourStartM,
  }));
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

const AGENDA_START_YEAR = 1970;
const AGENDA_END_YEAR = 2080;

/** Todas as semanas de AGENDA_START_YEAR a AGENDA_END_YEAR (domingo a sábado) */
function getAllWeeks() {
  const start = new Date(AGENDA_START_YEAR, 0, 1);
  const dow = start.getDay();
  start.setDate(start.getDate() - dow);
  const end = new Date(AGENDA_END_YEAR, 11, 31);
  const weeks = [];
  const current = new Date(start);
  while (current <= end) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

const ALL_WEEKS = getAllWeeks();

function getWeekIndexForDate(date) {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - dow);
  const start = new Date(AGENDA_START_YEAR, 0, 1);
  const startDow = start.getDay();
  start.setDate(start.getDate() - startDow);
  const diffMs = d - start;
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return Math.max(0, Math.floor(diffDays / 7));
}

function getDisplayMonthForWeek(week, isTodayFn) {
  if (!week || week.length === 0) return null;
  const monthCounts = {};
  let todayMonthKey = null;
  for (const d of week) {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthCounts[key] = (monthCounts[key] || 0) + 1;
    if (isTodayFn(d)) todayMonthKey = key;
  }
  const entries = Object.entries(monthCounts);
  if (entries.length === 0) return week[0];
  const maxEntry = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  if (todayMonthKey && todayMonthKey !== maxEntry[0]) {
    const todayCount = monthCounts[todayMonthKey] || 0;
    if (todayCount < maxEntry[1]) {
      const [y, m] = todayMonthKey.split('-').map(Number);
      return new Date(y, m, 15);
    }
  }
  const [y, m] = maxEntry[0].split('-').map(Number);
  return new Date(y, m, 15);
}

function getWeeksAround(base, weekCount = 26) {
  const weeks = [];
  const start = new Date(base);
  const startDow = start.getDay();
  start.setDate(start.getDate() - startDow - 7 * Math.floor(weekCount / 2));
  for (let w = 0; w < weekCount; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      week.push(date);
    }
    weeks.push(week);
  }
  return weeks;
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
  const { agendaEvents, deleteAgendaEvent, updateAgendaEvent, refreshAgendaEvents, checkListItems, clients } = useFinance();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
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
  const weekScrollRef = useRef(null);
  const containerRef = useRef(null);
  const scrollToTodayInProgress = useRef(false);
  const prevFocusedRef = useRef(false);
  const needsInitialWeekScroll = useRef(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const timelineSlideX = useSharedValue(0);
  const contentPanX = useSharedValue(0);
  const slideDirectionRef = useRef(0);
  const pinchPrevScale = useSharedValue(1);
  const pinchPrevFocalY = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const viewHeight = useSharedValue(400);
  const mainScrollRef = useAnimatedRef();
  const AnimatedScrollView = useMemo(() => Animated.createAnimatedComponent(RNGHScrollView), []);

  const setPinchingJS = useCallback((v) => setIsPinching(v), []);

  const SWIPE_DURATION = 420;
  const SWIPE_THRESHOLD = 50;
  const commitSwipeNext = useCallback(() => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    timelineSlideX.value = 0;
    setSelectedDate(next);
    setDisplayedMonthDate(next);
    scrollToWeek(getWeekIndexForDate(next));
  }, [selectedDate, scrollToWeek]);

  const commitSwipePrev = useCallback(() => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    timelineSlideX.value = 0;
    setSelectedDate(prev);
    setDisplayedMonthDate(prev);
    scrollToWeek(getWeekIndexForDate(prev));
  }, [selectedDate, scrollToWeek]);

  const panSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-25, 25])
        .onUpdate((e) => {
          'worklet';
          const maxDrag = SW * 0.85;
          contentPanX.value = Math.max(-maxDrag, Math.min(maxDrag, e.translationX));
        })
        .onEnd((e) => {
          'worklet';
          const { translationX, velocityX } = e;
          const goNext = translationX < -SWIPE_THRESHOLD || velocityX < -350;
          const goPrev = translationX > SWIPE_THRESHOLD || velocityX > 350;
          if (goNext) {
            contentPanX.value = withTiming(-SW, { duration: SWIPE_DURATION, easing: Easing.out(Easing.cubic) }, (finished) => {
              if (finished) runOnJS(commitSwipeNext)();
            });
          } else if (goPrev) {
            contentPanX.value = withTiming(SW, { duration: SWIPE_DURATION, easing: Easing.out(Easing.cubic) }, (finished) => {
              if (finished) runOnJS(commitSwipePrev)();
            });
          } else {
            contentPanX.value = withSpring(0, { damping: 22, stiffness: 260 });
          }
        }),
    [commitSwipeNext, commitSwipePrev]
  );

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

  const isToday = useCallback((d) => {
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  }, []);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const currentMonthIdx = displayedMonthDate.getMonth();
  const currentMonthName = MONTHS[currentMonthIdx];
  const currentDay = now.getDate();

  const weekItemWidth = 7 * DAY_ITEM_WIDTH;
  const weekPaddingH = (SW - weekItemWidth) / 2;
  const scrollToWeek = useCallback((weekIndex, animated = false) => {
    const clamped = Math.max(0, Math.min(weekIndex, ALL_WEEKS.length - 1));
    const scrollX = clamped * weekItemWidth;
    weekScrollRef.current?.scrollToOffset?.({ offset: scrollX, animated });
  }, []);

  const scrollToToday = useCallback(() => {
    playTapSound();
    const today = new Date();
    scrollToTodayInProgress.current = true;
    setSelectedDate(new Date(today));
    setDisplayedMonthDate(new Date(today));
    const weekIdx = getWeekIndexForDate(today);
    scrollToWeek(weekIdx, false);
    setTimeout(() => {
      scrollToTodayInProgress.current = false;
      const mins = today.getHours() * 60 + today.getMinutes();
      const totalH = 24 * HOUR_HEIGHT * scale.value + 20;
      const targetY = Math.max(0, Math.min((mins / 1440) * totalH - 120, totalH - 400));
      scrollTo(mainScrollRef, 0, targetY, true);
    }, 150);
  }, [scrollToWeek]);

  const goToPrevDay = useCallback(() => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    slideDirectionRef.current = -1;
    timelineSlideX.value = -SW;
    setSelectedDate(prev);
    setDisplayedMonthDate(prev);
    scrollToWeek(getWeekIndexForDate(prev));
  }, [selectedDate, scrollToWeek]);

  const goToNextDay = useCallback(() => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    slideDirectionRef.current = 1;
    timelineSlideX.value = SW;
    setSelectedDate(next);
    setDisplayedMonthDate(next);
    scrollToWeek(getWeekIndexForDate(next));
  }, [selectedDate, scrollToWeek]);

  const handleDayPress = useCallback((d) => {
    playTapSound();
    const newD = new Date(d);
    const direction = newD.getTime() > selectedDate.getTime() ? 1 : -1;
    slideDirectionRef.current = direction;
    timelineSlideX.value = direction * SW;
    setSelectedDate(newD);
    setDisplayedMonthDate(newD);
  }, [selectedDate]);

  const updateSelectionForWeek = useCallback(
    (weekIndex) => {
      const week = ALL_WEEKS[weekIndex];
      if (!week || week.length < 7) return;
      if (scrollToTodayInProgress.current) {
        const todayKey = formatDayKey(new Date());
        const todayInList = week.find((d) => formatDayKey(d) === todayKey);
        if (todayInList) setSelectedDate(new Date(todayInList));
      } else {
        const dow = selectedDate.getDay();
        const dayInWeek = week[dow];
        if (!dayInWeek) return;
        const newKey = formatDayKey(dayInWeek);
        if (newKey !== formatDayKey(selectedDate)) {
          const direction = dayInWeek.getTime() > selectedDate.getTime() ? 1 : -1;
          slideDirectionRef.current = direction;
          timelineSlideX.value = direction * SW;
          setSelectedDate(new Date(dayInWeek));
        }
      }
      const midDay = week[3];
      if (midDay) setDisplayedMonthDate(new Date(midDay));
    },
    [selectedDate]
  );

  const lastScrollWeekRef = useRef(-1);
  const handleWeekScroll = useCallback(
    (e) => {
      const offset = e.nativeEvent.contentOffset.x;
      const weekIndex = Math.round(offset / weekItemWidth);
      if (weekIndex !== lastScrollWeekRef.current && weekIndex >= 0 && weekIndex < ALL_WEEKS.length) {
        lastScrollWeekRef.current = weekIndex;
        updateSelectionForWeek(weekIndex);
      }
    },
    [updateSelectionForWeek]
  );

  const handleWeekScrollEnd = useCallback(
    (e) => {
      const offset = e.nativeEvent.contentOffset.x;
      const weekIndex = Math.round(offset / weekItemWidth);
      updateSelectionForWeek(weekIndex);
    },
    [updateSelectionForWeek]
  );

  const handleCalendarDaySelect = useCallback((d) => {
    playTapSound();
    setSelectedDate(new Date(d));
    setDisplayedMonthDate(new Date(d));
    setShowMonthPicker(false);
    scrollToWeek(getWeekIndexForDate(d));
  }, [scrollToWeek]);

  useEffect(() => {
    setDisplayedMonthDate((prev) => {
      if (prev.getMonth() === selectedDate.getMonth() && prev.getFullYear() === selectedDate.getFullYear()) return prev;
      return new Date(selectedDate);
    });
  }, [selectedKey]);

  useEffect(() => {
    if (isFocused && !prevFocusedRef.current) {
      prevFocusedRef.current = true;
      const today = new Date();
      scrollToTodayInProgress.current = true;
      needsInitialWeekScroll.current = true;
      setSelectedDate(new Date(today));
      setDisplayedMonthDate(new Date(today));
      setTimeout(() => { scrollToTodayInProgress.current = false; }, 150);
    }
    if (!isFocused) prevFocusedRef.current = false;
  }, [isFocused]);

  useEffect(() => {
    if (isFocused && refreshAgendaEvents) {
      const t = setTimeout(() => refreshAgendaEvents(), 800);
      return () => clearTimeout(t);
    }
  }, [isFocused, refreshAgendaEvents]);

  useEffect(() => {
    const weekIndex = Math.min(getWeekIndexForDate(selectedDate), ALL_WEEKS.length - 1);
    if (weekIndex < 0) return;
    if (needsInitialWeekScroll.current) {
      needsInitialWeekScroll.current = false;
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => scrollToWeek(weekIndex, false), 100);
      });
    } else {
      scrollToWeek(weekIndex, false);
    }
  }, [scrollToWeek, selectedKey, selectedDate]);

  useEffect(() => {
    if (showMonthPicker) {
      const today = new Date();
      setPickerYear(today.getFullYear());
      setPickerMonth(today.getMonth());
    }
  }, [showMonthPicker]);

  const isTodaySelected = isToday(selectedDate);

  const animatedTimelineStyle = useAnimatedStyle(() => ({
    height: 24 * HOUR_HEIGHT * scale.value,
    transform: [{ translateX: timelineSlideX.value }],
  }));


  const prevDate = useMemo(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    return d;
  }, [selectedDate]);
  const nextDate = useMemo(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    return d;
  }, [selectedDate]);
  const prevKey = formatDayKey(prevDate);
  const nextKey = formatDayKey(nextDate);
  const panelsData = useMemo(
    () => [
      { events: eventsByDay[prevKey] || [], showTodayLine: false },
      { events: eventsForSelected, showTodayLine: isTodaySelected },
      { events: eventsByDay[nextKey] || [], showTodayLine: false },
    ],
    [prevKey, selectedKey, nextKey, eventsForSelected, eventsByDay, isTodaySelected]
  );

  const timelineSwipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -SW + contentPanX.value }],
  }));

  useLayoutEffect(() => {
    cancelAnimation(contentPanX);
    contentPanX.value = 0;
  }, [selectedKey]);

  useEffect(() => {
    if (slideDirectionRef.current !== 0) {
      timelineSlideX.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      slideDirectionRef.current = 0;
    }
  }, [selectedKey]);

  const onTimelineScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchResults = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return [];
    const getDisplayName = (e) => ((e.tipo === 'empresa' && e.clientId) ? (clients?.find((c) => c.id === e.clientId)?.name) : null) || (e.title || '').trim() || 'Evento';
    const matches = agendaEvents.filter((e) => {
      const name = getDisplayName(e);
      return name.toLowerCase().includes(q) || (e.title || '').toLowerCase().includes(q);
    });
    const byName = {};
    matches.forEach((e) => {
      const name = getDisplayName(e);
      if (!byName[name]) byName[name] = [];
      byName[name].push(e);
    });
    return Object.entries(byName).map(([name, events]) => ({ name, events, count: events.length })).sort((a, b) => b.count - a.count);
  }, [agendaEvents, searchQuery, clients]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <View style={{ flex: 1, paddingTop: insets.top || 0 }}>
        <View ref={containerRef} style={{ flex: 1 }} collapsable={false}>
          <View style={[as.compactHeader, { backgroundColor: colors.bg }]}>
          <TouchableOpacity
            style={as.compactMonthBtn}
            onPress={() => { playTapSound(); setShowMonthPicker(true); }}
          >
            <Text style={[as.compactMonthText, { color: colors.text }]} numberOfLines={1}>
              {currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1).toLowerCase()} {displayedMonthDate.getFullYear()}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              style={[as.compactIconBtn, { backgroundColor: colors.bg }]}
              onPress={() => { playTapSound(); setSearchQuery(''); setShowSearchModal(true); }}
            >
              <Ionicons name="search" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { playTapSound(); scrollToToday(); }}
              style={[as.compactIconBtn, { backgroundColor: isToday(selectedDate) ? colors.primaryRgba?.(0.2) ?? colors.primary + '33' : colors.bg }]}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Hoje</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[as.compactAddBtn, { backgroundColor: colors.bg }]}
              onPress={() => { playTapSound(); handleAddPress(); }}
            >
              <Ionicons name="add" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ backgroundColor: colors.bg }}>
          <FlatList
            ref={weekScrollRef}
            data={ALL_WEEKS}
            keyExtractor={(week) => String(week[0]?.getTime() ?? 0)}
            horizontal
            snapToInterval={weekItemWidth}
            snapToAlignment="center"
            decelerationRate="normal"
            bounces={false}
            overScrollMode="never"
            showsHorizontalScrollIndicator={false}
            onScroll={handleWeekScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleWeekScrollEnd}
            onScrollEndDrag={handleWeekScrollEnd}
            contentContainerStyle={[as.dayCarousel, { paddingHorizontal: weekPaddingH }]}
            initialScrollIndex={Math.min(getWeekIndexForDate(new Date()), Math.max(0, ALL_WEEKS.length - 1))}
            getItemLayout={(_, index) => ({ length: weekItemWidth, offset: weekPaddingH + index * weekItemWidth, index })}
            initialNumToRender={5}
            maxToRenderPerBatch={3}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            renderItem={({ item: week }) => (
              <View style={{ width: weekItemWidth, flexDirection: 'row', marginBottom: 4 }}>
                {week.map((d) => {
                  const key = formatDayKey(d);
                  const selected = key === selectedKey;
                  const count = (eventsByDay[key] || []).length;
                  const hasAgenda = count > 0;
                  const dayIsToday = isToday(d);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const dayNumColor = selected ? '#fff' : (dayIsToday ? colors.primary : (isWeekend ? (colors.textSecondary + '99') : colors.text));
                  const dayLetterColor = isWeekend ? (colors.textSecondary + '99') : colors.textSecondary;
                  return (
                    <View key={d.getTime()} style={{ width: DAY_ITEM_WIDTH, alignItems: 'center' }}>
                      <Text style={[as.weekdayHeaderText, { color: dayLetterColor, fontSize: 12 }]}>{WEEKDAY_LETTERS[d.getDay()]}</Text>
                      <TouchableOpacity
                        style={[
                          as.dayItem,
                          {
                            width: DAY_WIDTH,
                            marginHorizontal: DAY_MARGIN,
                            backgroundColor: selected ? 'transparent' : colors.bg,
                          },
                        ]}
                        onPress={() => handleDayPress(d)}
                        activeOpacity={0.7}
                      >
                        <View style={{ width: Math.min(50, DAY_WIDTH + 6), height: Math.min(50, DAY_WIDTH + 6), alignItems: 'center', justifyContent: 'center' }}>
                          {selected && (
                            <View style={[StyleSheet.absoluteFillObject, { borderRadius: Math.min(25, (DAY_WIDTH + 6) / 2), backgroundColor: isWeekend ? '#dc2626' : colors.primary }]} />
                          )}
                          <Text style={[as.dayNum, { color: dayNumColor }]}>{d.getDate()}</Text>
                          <Text style={[as.dayCount, { color: selected ? 'rgba(255,255,255,0.95)' : (hasAgenda ? colors.primary : colors.textSecondary) }]}>{count}</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          />
        </View>

        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: (colors.border || '#e5e7eb') + 'E6', backgroundColor: colors.bg, paddingLeft: TIMELINE_PADDING }}>
          <View style={{ width: 52 }} />
          <View style={{ flex: 1, marginLeft: TIMELINE_PADDING }} />
        </View>

        <GestureDetector gesture={panSwipeGesture}>
        <View style={{ flex: 1, overflow: 'hidden', backgroundColor: colors.bg }} collapsable={false}>
        <GestureDetector gesture={pinchGesture}>
        <View
          style={{ flex: 1, backgroundColor: colors.bg }}
          onLayout={(e) => {
            const { height } = e.nativeEvent.layout;
            viewHeight.value = height;
          }}
          collapsable={false}
        >
        <AnimatedScrollView
          ref={mainScrollRef}
          style={{ flex: 1, backgroundColor: colors.bg }}
          scrollEnabled={!isPinching}
          onScroll={onTimelineScroll}
          scrollEventThrottle={1}
          showsVerticalScrollIndicator
          contentContainerStyle={{ paddingBottom: 20, backgroundColor: colors.bg }}
          removeClippedSubviews={false}
        >
          <Animated.View style={[animatedTimelineStyle, { width: SW, overflow: 'hidden' }]}>
            <Animated.View style={[timelineSwipeStyle, { flexDirection: 'row', width: SW * 3 }]}>
            {panelsData.map(({ events, showTodayLine }, panelIdx) => (
              <View
                key={panelIdx}
                style={{
                  width: SW,
                  flexDirection: 'row',
                  position: 'relative',
                  paddingLeft: TIMELINE_PADDING,
                  backgroundColor: colors.bg,
                  flex: 0,
                }}
              >
                <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 1, left: 0 }]}>
                  {HOURS.map((hour) => (
                    <View
                      key={`grid-${panelIdx}-${hour}`}
                      style={{
                        height: `${100 / 24}%`,
                        borderBottomWidth: 1,
                        borderBottomColor: (colors.border || '#e5e7eb') + 'E6',
                      }}
                />
                  ))}
                </View>
                <View style={{ width: 52, zIndex: 2 }}>
                  {HOURS.map((hour) => (
                    <View key={`${panelIdx}-${hour}`} style={[as.timelineHour, { height: `${100 / 24}%` }]}>
                      <Text style={[as.hourText, { color: colors.textSecondary }]}>{String(hour).padStart(2, '0')}:00</Text>
                    </View>
                  ))}
                </View>
                {showTodayLine && (
                  <>
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `${(currentMinutes / 1440) * 100}%`,
                        height: 2,
                        marginTop: -1,
                        backgroundColor: colors.primary,
                        zIndex: 10,
                      }}
                    />
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: TIMELINE_PADDING + 4,
                        top: `${(currentMinutes / 1440) * 100}%`,
                        transform: [{ translateY: -14 }],
                        zIndex: 11,
                        backgroundColor: colors.primary,
                        paddingHorizontal: 8,
                        paddingVertical: 5,
                        borderRadius: 12,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>
                        {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
                      </Text>
                    </View>
                </>
                )}
                <View style={[as.timelineContentFull, { height: '100%', zIndex: 2, marginLeft: TIMELINE_PADDING }]}>
                  {getEventLayouts(events).map(({ event: e, startM, endM, duration, lane, lanesUsed, sameHourIndex, sameHourCount, hourStartM }) => {
                const isConcluido = e.status === 'concluido';
                const isActionsOpen = openEventActionsId === e.id;
                const isLongEvent = duration > 60;
                const openEdit = () => {
                  playTapSound();
                  setAgendaFormState({ visible: true, editingEvent: e });
                };
                const slotWidth = (100 - (lanesUsed - 1) * CARD_GAP_PERCENT) / lanesUsed;
                const left = lane * (slotWidth + CARD_GAP_PERCENT);
                const width = slotWidth;
                const longEventLeft = 0;
                const longEventWidth = 100;
                const shouldSplitByFirstHour = sameHourCount > 1;
                const hourSlotWidth = (100 - (sameHourCount - 1) * CARD_GAP_PERCENT) / Math.max(1, sameHourCount);
                const hourLeft = sameHourIndex * (hourSlotWidth + CARD_GAP_PERCENT);
                const rowTop = shouldSplitByFirstHour && hourStartM != null
                  ? (hourStartM / 1440) * 100
                  : (startM / 1440) * 100;
                const rowHeight = shouldSplitByFirstHour && hourStartM != null
                  ? ((endM - hourStartM) / 1440) * 100
                  : (duration / 1440) * 100;
                const layerShiftPx = Math.min(2, lane * 1);
                const splitHourShiftPx = shouldSplitByFirstHour ? sameHourIndex * 2 : 0;
                const transformPx = shouldSplitByFirstHour ? splitHourShiftPx : (isLongEvent ? layerShiftPx : 0);
                // Quanto mais tarde o início, maior prioridade de camada/click.
                const stackZ = shouldSplitByFirstHour
                  ? 2000 + sameHourIndex + startM
                  : 1000 + startM;
                const isDarkBg = colors.isDarkBg ?? (colors.text === '#ffffff');
                return (
                  <TouchableOpacity
                    key={e.id}
                    activeOpacity={0.8}
                    onPress={openEdit}
                    style={[
                      as.eventBlock,
                      {
                        left: `${shouldSplitByFirstHour ? hourLeft : (isLongEvent ? longEventLeft : left)}%`,
                        width: `${shouldSplitByFirstHour ? hourSlotWidth : (isLongEvent ? longEventWidth : width)}%`,
                        top: `${rowTop}%`,
                        height: `${rowHeight}%`,
                        minHeight: 80,
                        overflow: 'hidden',
                        borderLeftColor: isConcluido ? colors.textSecondary : colors.primary,
                        transform: transformPx ? [{ translateX: transformPx }] : undefined,
                        zIndex: stackZ,
                        elevation: stackZ,
                      },
                    ]}
                  >
                    {Platform.OS === 'android' ? (
                      <View
                        style={[
                          StyleSheet.absoluteFill,
                          {
                            backgroundColor: isLongEvent
                              ? (isConcluido ? colors.primaryRgba(0.45) : colors.primaryRgba(0.55))
                              : (isConcluido ? colors.primaryRgba(0.40) : colors.primaryRgba(0.50)),
                            opacity: 0.92,
                          },
                        ]}
                      />
                    ) : (
                      <>
                        <BlurView
                          intensity={Platform.OS === 'ios' ? 60 : 50}
                          tint={isDarkBg ? 'dark' : 'light'}
                          style={StyleSheet.absoluteFill}
                        />
                        <View
                          style={[
                            StyleSheet.absoluteFill,
                            {
                              backgroundColor: isLongEvent
                                ? (isConcluido ? colors.primaryRgba(0.45) : colors.primaryRgba(0.55))
                                : (isConcluido ? colors.primaryRgba(0.40) : colors.primaryRgba(0.50)),
                              opacity: 0.92,
                            },
                          ]}
                        />
                      </>
                    )}
                    <View style={[as.eventBlockContent, { flex: 1, zIndex: 1 }]}>
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
                    {SHOW_EVENT_MENU && (
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
                    )}
                    </TouchableOpacity>
                  );
                })}
                </View>
              </View>
            ))}
            </Animated.View>
          </Animated.View>

          {eventsForSelected.length === 0 && (
            <View style={{ width: SW, alignSelf: 'center' }}>
              <View style={[as.empty, { marginTop: 24 }]}>
                <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
                <Text style={{ fontSize: 15, color: colors.textSecondary }}>Nenhum evento neste dia</Text>
              </View>
            </View>
          )}

          <View style={{ height: 80 }} />
        </AnimatedScrollView>
        </View>
        </GestureDetector>
        </View>
        </GestureDetector>
        </View>

      <Modal visible={showSearchModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowSearchModal(false)} />
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[as.searchModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="search" size={22} color={colors.textSecondary} />
              <TextInput
                placeholder="Buscar por nome ou pessoa..."
                placeholderTextColor={colors.textSecondary + '99'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{ flex: 1, fontSize: 16, color: colors.text, paddingVertical: 10 }}
                autoFocus
              />
              <TouchableOpacity onPress={() => setShowSearchModal(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator>
              {!searchQuery.trim() ? (
                <Text style={{ color: colors.textSecondary, fontSize: 14, paddingVertical: 12 }}>Digite para buscar agendamentos</Text>
              ) : searchResults.length === 0 ? (
                <Text style={{ color: colors.textSecondary, fontSize: 14, paddingVertical: 12 }}>Nenhum resultado encontrado</Text>
              ) : (
                searchResults.map(({ name, events, count }) => {
                  const parseDate = (d) => {
                    if (!d) return new Date();
                    if (d instanceof Date) return new Date(d);
                    const parts = String(d).trim().split(/[/-]/).map(Number);
                    if (parts[0] > 31) return new Date(parts[0], parts[1] - 1, parts[2]);
                    return new Date(parts[2], parts[1] - 1, parts[0]);
                  };
                  const goToEvent = (ev) => {
                    const d = parseDate(ev.date);
                    setSelectedDate(d);
                    setDisplayedMonthDate(d);
                    scrollToWeek(getWeekIndexForDate(d));
                    setShowSearchModal(false);
                  };
                  const editEvent = (ev) => {
                    goToEvent(ev);
                    setTimeout(() => setAgendaFormState({ visible: true, editingEvent: ev }), 100);
                  };
                  return (
                    <View key={name} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border + '60' }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>{name}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>{count} agendamento{count !== 1 ? 's' : ''}</Text>
                      {events.map((ev) => (
                        <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.bg, borderRadius: 8 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, color: colors.text }}>{ev.date} {ev.time || ''}{ev.timeEnd ? ` - ${ev.timeEnd}` : ''}</Text>
                            {ev.title && ev.title !== name && <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{ev.title}</Text>}
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity onPress={() => { playTapSound(); editEvent(ev); }} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.primary }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Editar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { playTapSound(); goToEvent(ev); }} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.primaryRgba?.(0.2) ?? colors.primary + '33' }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Ir</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

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
      </View>
    </SafeAreaView>
  );
}
