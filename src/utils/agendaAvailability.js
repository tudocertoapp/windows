/** Utilitários de horários para agendamento online da loja. */

export function parseTimeToMinutes(time) {
  const parts = String(time || '0:0').trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export function formatMinutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseDateBR(dateStr) {
  const [dd, mm, yyyy] = String(dateStr || '').split('/');
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateBR(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function getNextAvailableDates(config, count = 14) {
  const maxDays = Number(config?.agendaAntecedenciaDias) || 30;
  const allowed = Array.isArray(config?.agendaDiasSemana) && config.agendaDiasSemana.length
    ? config.agendaDiasSemana.map(Number)
    : [1, 2, 3, 4, 5];
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < maxDays && dates.length < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (allowed.includes(d.getDay())) dates.push(formatDateBR(d));
  }
  return dates;
}

export function eventToBusyRange(event) {
  const start = parseTimeToMinutes(event.time || event.time_start);
  let end = parseTimeToMinutes(event.timeEnd || event.time_end);
  if (!event.timeEnd && !event.time_end) end = start + (Number(event.durationMin) || 60);
  if (end <= start) end = start + 60;
  return { start, end };
}

/** Gera horários livres para um dia com base nos eventos ocupados. */
export function generateAvailableSlots(config, busyEvents = []) {
  const startMin = parseTimeToMinutes(config?.agendaHoraInicio || '08:00');
  const endMin = parseTimeToMinutes(config?.agendaHoraFim || '18:00');
  const interval = Number(config?.agendaIntervaloMin) || 30;
  const duration = Number(config?.agendaDuracaoMin) || 60;

  const busy = (busyEvents || []).map(eventToBusyRange);

  const slots = [];
  for (let t = startMin; t + duration <= endMin; t += interval) {
    const slotEnd = t + duration;
    const overlaps = busy.some((b) => t < b.end && slotEnd > b.start);
    if (!overlaps) slots.push(formatMinutesToTime(t));
  }
  return slots;
}

export function filterEventsByDate(events, dateStr) {
  return (events || []).filter((ev) => {
    const d = String(ev.date || '').trim();
    return d === dateStr;
  });
}

export function getTimelineRange(config) {
  const startMin = parseTimeToMinutes(config?.agendaHoraInicio || '08:00');
  const endMin = parseTimeToMinutes(config?.agendaHoraFim || '18:00');
  const startHour = Math.floor(startMin / 60);
  const endHour = Math.max(startHour + 1, Math.ceil(endMin / 60));
  const hours = [];
  for (let h = startHour; h < endHour; h++) hours.push(h);
  return { startMin, endMin, startHour, endHour, hours };
}

export function normalizeBusyForTimeline(events = []) {
  return (events || []).map((ev, idx) => ({
    id: ev.id || `busy-${idx}`,
    time: ev.time,
    timeEnd: ev.timeEnd || ev.time_end,
    title: ev.title || 'Ocupado',
  }));
}

/** Monta dados para timeline estilo Agenda do app. */
export function buildDaySchedule(config, busyEvents = []) {
  const { startMin, endMin, hours } = getTimelineRange(config);
  const duration = Number(config?.agendaDuracaoMin) || 60;
  const slots = generateAvailableSlots(config, busyEvents);
  const busy = normalizeBusyForTimeline(busyEvents).map((ev) => {
    const s = parseTimeToMinutes(ev.time);
    let e = parseTimeToMinutes(ev.timeEnd);
    if (!ev.timeEnd) e = s + 60;
    if (e <= s) e = s + 60;
    return { ...ev, startMin: s, endMin: e };
  });
  return { startMin, endMin, hours, slots, busy, durationMin: duration };
}

export const LOJA_AGENDA_HOUR_HEIGHT = 52;
