import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getNextAvailableDates,
  parseDateBR,
  buildDaySchedule,
  parseTimeToMinutes,
  LOJA_AGENDA_HOUR_HEIGHT,
} from '../../utils/agendaAvailability';
import { playTapSound } from '../../utils/sounds';

const WEEKDAY_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function dateParts(dateStr) {
  const d = parseDateBR(dateStr);
  if (!d) return { day: '?', dow: '?' };
  return { day: d.getDate(), dow: WEEKDAY_SHORT[d.getDay()] };
}

export function LojaAgendaPicker({
  config,
  selectedDate,
  onSelectDate,
  selectedTime,
  onSelectTime,
  schedule,
  loading,
  accent = '#6366f1',
  textColor = '#0f172a',
  borderColor = 'rgba(0,0,0,0.08)',
}) {
  const dateOptions = useMemo(() => getNextAvailableDates(config, 14), [config]);

  const daySchedule = useMemo(() => {
    const base = buildDaySchedule(config, schedule?.busy || []);
    if (Array.isArray(schedule?.slots)) return { ...base, slots: schedule.slots };
    return base;
  }, [config, schedule]);

  const { startMin, endMin, hours, slots, busy } = daySchedule;
  const timelineHeight = Math.max(1, ((endMin - startMin) / 60) * LOJA_AGENDA_HOUR_HEIGHT);

  const posForMinutes = (minutes) => ((minutes - startMin) / (endMin - startMin)) * timelineHeight;

  return (
    <View style={st.wrap}>
      <Text style={[st.sectionLabel, { color: textColor }]}>Escolha data e horário</Text>
      <Text style={[st.hint, { color: textColor + '88' }]}>
        Horários livres como na agenda — toque para selecionar.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.weekRow}>
        {dateOptions.map((d) => {
          const { day, dow } = dateParts(d);
          const active = selectedDate === d;
          return (
            <TouchableOpacity
              key={d}
              onPress={() => { playTapSound(); onSelectDate?.(d); }}
              style={[
                st.dayCell,
                {
                  borderColor: active ? accent : borderColor,
                  backgroundColor: active ? accent + '18' : '#fff',
                },
              ]}
            >
              <Text style={[st.dowText, { color: active ? accent : textColor + '88' }]}>{dow}</Text>
              <Text style={[st.dayNum, { color: active ? accent : textColor }]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!selectedDate ? (
        <Text style={[st.empty, { color: textColor + '88' }]}>Selecione uma data acima.</Text>
      ) : loading ? (
        <ActivityIndicator color={accent} style={{ marginVertical: 20 }} />
      ) : (
        <View style={[st.timelineCard, { borderColor, backgroundColor: '#fff' }]}>
          <Text style={[st.dateHeader, { color: textColor, borderBottomColor: borderColor }]}>
            {selectedDate}
          </Text>
          <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator nestedScrollEnabled>
            <View style={[st.timeline, { height: timelineHeight }]}>
              <View style={st.hourLabels}>
                {hours.map((h) => (
                  <View key={h} style={[st.hourRow, { height: LOJA_AGENDA_HOUR_HEIGHT }]}>
                    <Text style={[st.hourText, { color: textColor + '88' }]}>
                      {String(h).padStart(2, '0')}:00
                    </Text>
                  </View>
                ))}
              </View>
              <View style={[st.grid, { height: timelineHeight }]}>
                {hours.map((h) => (
                  <View
                    key={`line-${h}`}
                    style={[st.gridLine, { top: ((h - hours[0]) * LOJA_AGENDA_HOUR_HEIGHT), borderBottomColor: borderColor }]}
                  />
                ))}

                {busy.map((block) => {
                  const top = posForMinutes(block.startMin);
                  const height = Math.max(20, posForMinutes(block.endMin) - top);
                  return (
                    <View
                      key={block.id}
                      style={[st.busyBlock, { top, height, backgroundColor: textColor + '18', borderColor: textColor + '22' }]}
                    >
                      <Text style={[st.busyText, { color: textColor + '99' }]} numberOfLines={1}>
                        {block.title || 'Ocupado'}
                      </Text>
                    </View>
                  );
                })}

                {slots.map((slot) => {
                  const slotStart = parseTimeToMinutes(slot);
                  const slotEnd = slotStart + (daySchedule.durationMin || 60);
                  const top = posForMinutes(slotStart);
                  const height = Math.max(28, posForMinutes(Math.min(slotEnd, endMin)) - top);
                  const active = selectedTime === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      onPress={() => { playTapSound(); onSelectTime?.(slot); }}
                      style={[
                        st.slotBlock,
                        {
                          top,
                          height,
                          backgroundColor: active ? accent : accent + '22',
                          borderColor: active ? accent : accent + '55',
                        },
                      ]}
                      activeOpacity={0.85}
                    >
                      <Text style={[st.slotText, { color: active ? '#fff' : accent }]}>{slot}</Text>
                      <Text style={[st.slotSub, { color: active ? '#fff' : accent + 'cc' }]}>Disponível</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {selectedTime ? (
            <View style={[st.selectedBar, { backgroundColor: accent + '15', borderTopColor: borderColor }]}>
              <Ionicons name="checkmark-circle" size={18} color={accent} />
              <Text style={{ color: textColor, fontWeight: '700', fontSize: 13 }}>
                {selectedDate} às {selectedTime}
              </Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={[st.selectedBar, { borderTopColor: borderColor }]}>
              <Text style={{ color: textColor + '88', fontSize: 12 }}>Nenhum horário livre neste dia.</Text>
            </View>
          ) : (
            <View style={[st.selectedBar, { borderTopColor: borderColor }]}>
              <Text style={{ color: textColor + '88', fontSize: 12 }}>Toque em um horário disponível (verde).</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginTop: 8 },
  sectionLabel: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  hint: { fontSize: 12, marginBottom: 12, lineHeight: 18 },
  weekRow: { gap: 8, paddingBottom: 12 },
  dayCell: {
    width: 52,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  dowText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  dayNum: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  empty: { textAlign: 'center', paddingVertical: 16, fontSize: 13 },
  timelineCard: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  dateHeader: { paddingHorizontal: 14, paddingVertical: 10, fontSize: 12, fontWeight: '700', borderBottomWidth: 1 },
  timeline: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 8 },
  hourLabels: { width: 48 },
  hourRow: { justifyContent: 'flex-start', paddingTop: 2 },
  hourText: { fontSize: 11, fontWeight: '600' },
  grid: { flex: 1, position: 'relative', marginLeft: 4 },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: 1,
  },
  busyBlock: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  busyText: { fontSize: 10, fontWeight: '600' },
  slotBlock: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  slotText: { fontSize: 13, fontWeight: '800' },
  slotSub: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  selectedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
});
