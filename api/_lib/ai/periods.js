function pad(n) {
  return String(n).padStart(2, '0');
}

function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function monthRange(year, month) {
  const y = Number(year);
  const m = Number(month);
  const start = `${y}-${pad(m)}-01`;
  const last = new Date(y, m, 0).getDate();
  const end = `${y}-${pad(m)}-${pad(last)}`;
  return { start, end, year: y, month: m, label: monthLabel(y, m) };
}

function monthLabel(year, month) {
  const names = [
    '',
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  return `${names[month] || 'mês'} de ${year}`;
}

function addMonths(year, month, delta) {
  const d = new Date(year, month - 1 + delta, 1);
  return monthRange(d.getFullYear(), d.getMonth() + 1);
}

function todayYmd() {
  return ymd(new Date());
}

function shiftDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return ymd(d);
}

function currentMonth() {
  const d = new Date();
  return monthRange(d.getFullYear(), d.getMonth() + 1);
}

function parsePeriodFromText(text) {
  const t = String(text || '');
  const now = currentMonth();
  if (/hoje/.test(t)) {
    const d = todayYmd();
    return { start: d, end: d, year: now.year, month: now.month, label: 'hoje', kind: 'day' };
  }
  if (/ontem/.test(t)) {
    const d = shiftDays(-1);
    return { start: d, end: d, year: now.year, month: now.month, label: 'ontem', kind: 'day' };
  }
  if (/amanha/.test(t)) {
    const d = shiftDays(1);
    return { start: d, end: d, year: now.year, month: now.month, label: 'amanhã', kind: 'day' };
  }
  if (/mes passado|m[eê]s passado/.test(t) || /ultimo mes|último mês/.test(t)) {
    return { ...addMonths(now.year, now.month, -1), kind: 'month' };
  }
  if (/este mes|esse mes|neste mes|atual/.test(t) || !t) {
    return { ...now, kind: 'month' };
  }
  const named = {
    janeiro: 1,
    fevereiro: 2,
    marco: 3,
    abril: 4,
    maio: 5,
    junho: 6,
    julho: 7,
    agosto: 8,
    setembro: 9,
    outubro: 10,
    novembro: 11,
    dezembro: 12,
  };
  for (const [name, m] of Object.entries(named)) {
    if (t.includes(name)) {
      const yMatch = t.match(/20\d{2}/);
      const y = yMatch ? Number(yMatch[0]) : now.year;
      return { ...monthRange(y, m), kind: 'month' };
    }
  }
  return { ...now, kind: 'month' };
}

function sanitizePeriod(args) {
  const now = currentMonth();
  const year = Number(args?.year);
  const month = Number(args?.month);
  const y = year >= 2000 && year <= 2100 ? year : now.year;
  const m = month >= 1 && month <= 12 ? month : now.month;
  if (args?.start && args?.end) {
    const start = String(args.start).slice(0, 10);
    const end = String(args.end).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return { start, end, year: y, month: m, label: args.label || `${start} a ${end}`, kind: args.kind || 'range' };
    }
  }
  return { ...monthRange(y, m), kind: 'month' };
}

module.exports = {
  currentMonth,
  addMonths,
  parsePeriodFromText,
  sanitizePeriod,
  todayYmd,
  shiftDays,
  monthLabel,
};
