import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { useMenu } from '../contexts/MenuContext';
import { TopBar } from '../components/TopBar';
import { AgendaFormModal } from '../components/AgendaFormModal';
import { playTapSound } from '../utils/sounds';

const { width: SW } = Dimensions.get('window');
const DAY_WIDTH = 44;
const DAY_MARGIN = 6;
const DAY_ITEM_WIDTH = DAY_WIDTH + DAY_MARGIN * 2;
const HOUR_HEIGHT = 56;
const CAROUSEL_PADDING_V = 5;

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const as = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 20,
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
    paddingVertical: CAROUSEL_PADDING_V,
    paddingHorizontal: 12,
    marginBottom: 4,
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
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scheduleTitle: { fontSize: 15, fontWeight: '700' },
  eventControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventCount: { fontSize: 13, fontWeight: '600' },
  zoomBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  timelineRow: {
    flexDirection: 'row',
    minHeight: HOUR_HEIGHT,
    borderBottomWidth: 1,
  },
  timelineHour: { width: 52, paddingTop: 6, paddingRight: 8, alignItems: 'flex-end' },
  hourText: { fontSize: 12, fontWeight: '500' },
  timelineContent: { flex: 1, position: 'relative', minHeight: 1 },
  eventBlock: {
    position: 'absolute',
    left: 6,
    right: 6,
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 4,
  },
  eventTitle: { fontSize: 14, fontWeight: '600' },
  eventTime: { fontSize: 11, marginTop: 2 },
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
  const { agendaEvents, deleteAgendaEvent, updateAgendaEvent, checkListItems } = useFinance();
  const { colors } = useTheme();
  const { openAddModal } = useMenu();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [displayedMonthDate, setDisplayedMonthDate] = useState(() => new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [agendaFormState, setAgendaFormState] = useState({ visible: false, editingEvent: null });
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(() => new Date().getMonth());
  const [hourScale, setHourScale] = useState(1);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const dayScrollRef = useRef(null);
  const mainScrollRef = useRef(null);
  const lastCenteredIndexRef = useRef(-1);
  const pinchBaseScale = useRef(1);
  const pinchBaseDist = useRef(0);
  const pinchFocalRatio = useRef(0.5);
  const rafId = useRef(null);
  const scrollOffsetRef = useRef(0);
  const timelineLayoutRef = useRef({ y: 0 });
  const measurementReadyRef = useRef(false);
  const scrollViewHeightRef = useRef(400);
  const scaleRef = useRef(1);
  scaleRef.current = hourScale;

  const pinchResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: (ev) => (ev.nativeEvent.touches?.length || 0) === 2,
        onMoveShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (ev) => (ev.nativeEvent.touches?.length || 0) === 2,
        onPanResponderGrant: (ev) => {
          const touches = ev.nativeEvent.touches;
          if (touches && touches.length === 2 && touches[0] && touches[1]) {
            setScrollEnabled(false);
            pinchBaseDist.current = Math.hypot(
              touches[1].pageX - touches[0].pageX,
              touches[1].pageY - touches[0].pageY
            );
            pinchBaseScale.current = scaleRef.current;
            measurementReadyRef.current = false;
            const fingerMidY = (touches[0].pageY + touches[1].pageY) / 2;
            mainScrollRef.current?.measureInWindow((x, scrollViewTop, w, h) => {
              const relativeY = fingerMidY - scrollViewTop;
              const contentY = scrollOffsetRef.current + relativeY;
              const timelineY = timelineLayoutRef.current?.y ?? 0;
              const timelineH = 24 * HOUR_HEIGHT * scaleRef.current;
              const posInTimeline = contentY - timelineY;
              pinchFocalRatio.current = timelineH > 0 ? Math.max(0, Math.min(1, posInTimeline / timelineH)) : 0.5;
              measurementReadyRef.current = true;
            });
          }
        },
        onPanResponderMove: (ev) => {
          const touches = ev.nativeEvent.touches;
          if (touches && touches.length === 2 && touches[0] && touches[1] && pinchBaseDist.current > 0) {
            const dist = Math.hypot(touches[1].pageX - touches[0].pageX, touches[1].pageY - touches[0].pageY);
            const ratio = dist / pinchBaseDist.current;
            const newScale = Math.max(0.5, Math.min(2, pinchBaseScale.current * ratio));
            setHourScale(newScale);
            if (measurementReadyRef.current) {
              const timelineY = timelineLayoutRef.current?.y ?? 0;
              const newTimelineH = 24 * HOUR_HEIGHT * newScale;
              const focalInNewTimeline = pinchFocalRatio.current * newTimelineH;
              const viewH = scrollViewHeightRef.current;
              const newScrollY = Math.max(0, timelineY + focalInNewTimeline - viewH / 2);
              if (rafId.current) cancelAnimationFrame(rafId.current);
              rafId.current = requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  mainScrollRef.current?.scrollTo({ y: newScrollY, animated: false });
                  scrollOffsetRef.current = newScrollY;
                });
                rafId.current = null;
              });
            }
          }
        },
        onPanResponderRelease: () => {
          if (rafId.current) cancelAnimationFrame(rafId.current);
          rafId.current = null;
          setScrollEnabled(true);
        },
        onPanResponderTerminate: () => {
          if (rafId.current) cancelAnimationFrame(rafId.current);
          setScrollEnabled(true);
        },
      }),
    []
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
  const effectiveHourHeight = HOUR_HEIGHT * hourScale;

  const zoomCenteredOnViewport = useCallback((delta) => {
    const timelineY = timelineLayoutRef.current?.y ?? 0;
    const scrollY = scrollOffsetRef.current;
    const viewH = scrollViewHeightRef.current;
    const centerContentY = scrollY + viewH / 2;
    const posInTimeline = centerContentY - timelineY;
    const timelineH = 24 * HOUR_HEIGHT * scaleRef.current;
    const centerHourRatio = timelineH > 0 ? Math.max(0, Math.min(1, posInTimeline / timelineH)) : 0.5;
    const newScale = Math.max(0.5, Math.min(2, scaleRef.current + delta));
    setHourScale(newScale);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const newTimelineH = 24 * HOUR_HEIGHT * newScale;
        const focalInNewTimeline = centerHourRatio * newTimelineH;
        const newScrollY = Math.max(0, timelineY + focalInNewTimeline - viewH / 2);
        mainScrollRef.current?.scrollTo({ y: newScrollY, animated: false });
        scrollOffsetRef.current = newScrollY;
      });
    });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <TopBar title="Agenda" colors={colors} hideOrganize hideMenu hideLogoIcon />
      <View style={{ flex: 1 }} {...pinchResponder.panHandlers} collapsable={false}>
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

          <View style={[as.scheduleHeader, { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Text style={[as.scheduleTitle, { color: colors.text }]}>
              CRONOGRAMA — {selectedDate.getDate()} DE {currentMonthName.toUpperCase()}
            </Text>
            <View style={as.eventControls}>
              <TouchableOpacity
                style={[as.zoomBtn, { backgroundColor: colors.bg }]}
                onPress={() => {
                  playTapSound();
                  zoomCenteredOnViewport(-0.2);
                }}
              >
                <Ionicons name="remove" size={18} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[as.zoomBtn, { backgroundColor: colors.bg }]}
                onPress={() => {
                  playTapSound();
                  zoomCenteredOnViewport(0.2);
                }}
              >
                <Ionicons name="add" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={[as.eventCount, { color: colors.textSecondary }]}>
                {eventsForSelected.length} {eventsForSelected.length === 1 ? 'Evento' : 'Eventos'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
            <View style={{ width: 52 }} />
            <View style={{ flex: 1 }} />
          </View>
        </View>

        {/* Apenas as horas do dia rolam */}
        <ScrollView
          ref={mainScrollRef}
          style={{ flex: 1 }}
          scrollEnabled={scrollEnabled}
          onLayout={(e) => { scrollViewHeightRef.current = e.nativeEvent.layout.height; }}
          onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <View
            onLayout={(e) => {
              const { y } = e.nativeEvent.layout;
              timelineLayoutRef.current = { y };
            }}
          >
        {HOURS.map((hour) => {
          const hourTop = hour * 60;
          const showNowLine = isTodaySelected && currentMinutes >= hourTop && currentMinutes < hourTop + 60;
          const nowOffset = currentMinutes - hourTop;

          return (
            <View
              key={hour}
              style={[
                as.timelineRow,
                {
                  borderBottomColor: colors.border,
                  minHeight: effectiveHourHeight,
                },
              ]}
            >
              <View style={as.timelineHour}>
                <Text style={[as.hourText, { color: colors.textSecondary }]}>{String(hour).padStart(2, '0')}:00</Text>
              </View>
              <View style={[as.timelineContent, { borderColor: colors.border }]}>
                {showNowLine && (
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: (nowOffset / 60) * effectiveHourHeight,
                      height: 2,
                      backgroundColor: colors.primary,
                      zIndex: 10,
                    }}
                  />
                )}
                {eventsForSelected
                  .filter((e) => {
                    const start = parseTimeToMinutes(e.time);
                    return start >= hourTop && start < hourTop + 60;
                  })
                  .map((e) => {
                    const startM = parseTimeToMinutes(e.time);
                    const duration = 60;
                    const top = ((startM - hourTop) / 60) * effectiveHourHeight;
                    const height = Math.max(48, (duration / 60) * effectiveHourHeight - 4);
                    const isConcluido = e.status === 'concluido';
                    const openEdit = () => {
                      playTapSound();
                      setAgendaFormState({ visible: true, editingEvent: e });
                    };
                    return (
                      <TouchableOpacity
                        key={e.id}
                        activeOpacity={0.8}
                        onPress={openEdit}
                        style={[
                          as.eventBlock,
                          {
                            top,
                            height,
                            backgroundColor: isConcluido ? colors.primaryRgba(0.08) : colors.primaryRgba(0.15),
                            borderLeftColor: isConcluido ? colors.textSecondary : colors.primary,
                            opacity: isConcluido ? 0.85 : 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          },
                        ]}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[as.eventTitle, { color: colors.text, textDecorationLine: isConcluido ? 'line-through' : 'none' }]} numberOfLines={2}>
                            {e.title}
                          </Text>
                          <Text style={[as.eventTime, { color: colors.primary }]}>{e.time || '--:--'}{e.timeEnd ? ` - ${e.timeEnd}` : ''}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={(ev) => { ev?.stopPropagation?.(); openEdit(); }}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          style={{ padding: 8 }}
                          activeOpacity={0.6}
                        >
                          <Ionicons name="pencil" size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={(ev) => { ev?.stopPropagation?.(); playTapSound(); updateAgendaEvent(e.id, { status: isConcluido ? 'pendente' : 'concluido' }); }}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          style={{ padding: 8 }}
                          activeOpacity={0.6}
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
                          style={{ padding: 8 }}
                          activeOpacity={0.6}
                        >
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
          );
        })}
          </View>

          {eventsForSelected.length === 0 && (
            <View style={[as.empty, { marginTop: 24 }]}>
              <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
              <Text style={{ fontSize: 15, color: colors.textSecondary }}>Nenhum evento neste dia</Text>
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
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
