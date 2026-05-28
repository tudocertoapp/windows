function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatBoletoDate(day, month, year) {
  return `${pad2(day)}/${pad2(month)}/${year}`;
}

/** Aceita dia (15), DD/MM ou DD/MM/AAAA e retorna data completa. */
export function parseBoletoDueInput(input, refDate = new Date()) {
  const s = String(input || '').trim();
  if (!s) return null;

  const parts = s.split(/[/\-.]/).filter((p) => p !== '');
  const now = refDate instanceof Date ? refDate : new Date();
  let day;
  let month;
  let year;

  if (parts.length === 1) {
    day = parseInt(parts[0], 10);
    if (!day || day < 1 || day > 31) return null;
    month = now.getMonth() + 1;
    year = now.getFullYear();
    const todayDay = now.getDate();
    if (day < todayDay) {
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  } else if (parts.length === 2) {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = now.getFullYear();
    if (!day || day < 1 || day > 31 || !month || month < 1 || month > 12) return null;
  } else {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
    if (!day || !month) return null;
    if (year < 100) year = 2000 + year;
  }

  month = Math.min(12, Math.max(1, month));
  year = year || now.getFullYear();
  const maxDay = new Date(year, month, 0).getDate();
  day = Math.min(maxDay, Math.max(1, day));

  return {
    day,
    month,
    year,
    dueDay: day,
    dueDate: formatBoletoDate(day, month, year),
  };
}

export function parseBoletoDate(str) {
  const parsed = parseBoletoDueInput(str);
  if (!parsed) return null;
  return {
    day: parsed.day,
    month: parsed.month,
    year: parsed.year,
    dueDate: parsed.dueDate,
  };
}

export function addMonthsToBoletoDate(day, month, year, monthsToAdd) {
  let m0 = month - 1 + monthsToAdd;
  let y = year + Math.floor(m0 / 12);
  m0 = ((m0 % 12) + 12) % 12;
  const maxDay = new Date(y, m0 + 1, 0).getDate();
  const d = Math.min(day, maxDay);
  const m = m0 + 1;
  return { day: d, month: m, year: y, dueDate: formatBoletoDate(d, m, y) };
}

export function generateBoletoInstallments(base, firstParsed, count, seriesId) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const slot =
      i === 0
        ? firstParsed
        : addMonthsToBoletoDate(firstParsed.day, firstParsed.month, firstParsed.year, i);
    items.push({
      ...base,
      dueDate: slot.dueDate,
      dueDay: slot.day,
      installmentIndex: i + 1,
      installmentTotal: count,
      seriesId,
      recurring: false,
      repeatType: 'installments',
    });
  }
  return items;
}

export function buildBoletoSavePayloads({ name, amount, tipo, paid, dueDate, dueDay, repeatType, repeatCount }, opts = {}) {
  const parsed = parseBoletoDueInput(dueDate);
  if (!parsed) return null;

  const base = {
    name,
    amount,
    tipo,
    paid: paid ?? false,
    dueDay: dueDay ?? parsed.dueDay,
  };

  if (repeatType === 'recurring') {
    return [
      {
        ...base,
        dueDate: parsed.dueDate,
        recurring: true,
        repeatType: 'recurring',
      },
    ];
  }

  const count =
    repeatType === 'once' || !repeatType
      ? 1
      : Math.max(1, Number(repeatCount) || 1);

  if (count <= 1) {
    return [
      {
        ...base,
        dueDate: parsed.dueDate,
        recurring: false,
        repeatType: 'once',
      },
    ];
  }

  const seriesId = opts.seriesId || `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return generateBoletoInstallments(base, parsed, count, seriesId);
}

/** Filtro por mês/ano na listagem (inclui recorrentes no dia do mês). */
export function boletoMatchesMonth(boleto, month, year) {
  if (boleto?.recurring && boleto.dueDay) {
    const d = Math.min(boleto.dueDay, new Date(year, month, 0).getDate());
    return d >= 1;
  }
  const parts = String(boleto?.dueDate || '').trim().split(/[/\-.]/);
  if (parts.length < 2) return false;
  const m = parseInt(parts[1], 10);
  const y = parts[2] ? parseInt(parts[2], 10) : year;
  return m === month && (!parts[2] || y === year);
}

export function getBoletoDisplayDueDate(boleto, viewMonth, viewYear) {
  if (boleto?.recurring && boleto.dueDay && viewMonth && viewYear) {
    const maxDay = new Date(viewYear, viewMonth, 0).getDate();
    const d = Math.min(boleto.dueDay, maxDay);
    return formatBoletoDate(d, viewMonth, viewYear);
  }
  return boleto?.dueDate || '';
}

export function getBoletoDueDateObject(boleto, refDate = new Date()) {
  if (boleto?.recurring && boleto.dueDay) {
    const now = refDate instanceof Date ? refDate : new Date();
    let month = now.getMonth();
    let year = now.getFullYear();
    const maxDay = new Date(year, month + 1, 0).getDate();
    const day = Math.min(boleto.dueDay, maxDay);
    let candidate = new Date(year, month, day);
    candidate.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    if (candidate < today) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      const maxNext = new Date(year, month + 1, 0).getDate();
      candidate = new Date(year, month, Math.min(boleto.dueDay, maxNext));
    }
    return candidate;
  }
  const parts = String(boleto?.dueDate || '').trim().split(/[/\-.]/);
  if (parts.length < 3) return null;
  const day = parseInt(parts[0], 10) || 1;
  const month = (parseInt(parts[1], 10) || 1) - 1;
  const year = parseInt(parts[2], 10) || refDate.getFullYear();
  return new Date(year, month, day);
}

export function formatBoletoRepeatLabel(boleto) {
  if (boleto?.recurring) return `Recorrente · dia ${boleto.dueDay || '—'}`;
  if (boleto?.installmentTotal > 1) {
    return `Parcela ${boleto.installmentIndex || 1}/${boleto.installmentTotal}`;
  }
  return null;
}

/** Remove duplicatas (mesmo id ou mesma parcela da série). */
export function dedupeBoletos(list) {
  const byId = new Map();
  for (const b of list || []) {
    if (b?.id == null) continue;
    byId.set(String(b.id), b);
  }
  const byInstallment = new Map();
  const singles = [];
  for (const b of byId.values()) {
    const sid = b.seriesId;
    const idx = Number(b.installmentIndex) || 0;
    if (sid && idx > 0) {
      const key = `${sid}:${idx}`;
      if (!byInstallment.has(key)) byInstallment.set(key, b);
    } else {
      singles.push(b);
    }
  }
  return [...singles, ...byInstallment.values()];
}

export function countBoletosForDisplay(list) {
  return dedupeBoletos(list).length;
}

function dueDateSortKey(boleto) {
  const p = parseBoletoDueInput(boleto?.dueDate);
  if (!p) return 0;
  return new Date(p.year, p.month - 1, p.day).getTime();
}

export function sortBoletosInSeries(list) {
  return [...(list || [])].sort(compareBoletosByParcelAndDue);
}

/** Ordem de exibição: mesma série por parcela (1/12, 2/12…), depois vencimento. */
export function compareBoletosByParcelAndDue(a, b) {
  const sidA = a?.seriesId ? String(a.seriesId) : '';
  const sidB = b?.seriesId ? String(b.seriesId) : '';
  if (sidA && sidB && sidA === sidB) {
    const ta = dueDateSortKey(a);
    const tb = dueDateSortKey(b);
    if (ta !== tb) return ta - tb;
    const ia = Number(a.installmentIndex) || 0;
    const ib = Number(b.installmentIndex) || 0;
    if (ia && ib && ia !== ib) return ia - ib;
  }
  const ta = dueDateSortKey(a);
  const tb = dueDateSortKey(b);
  if (ta !== tb) return ta - tb;
  const ia = Number(a.installmentIndex) || 0;
  const ib = Number(b.installmentIndex) || 0;
  if (ia && ib && ia !== ib) return ia - ib;
  const nameA = (a?.name || '').trim().toLowerCase();
  const nameB = (b?.name || '').trim().toLowerCase();
  if (nameA !== nameB) return nameA.localeCompare(nameB);
  return String(a?.id || '').localeCompare(String(b?.id || ''));
}

export function sortBoletosForDisplay(list) {
  return [...(list || [])].sort(compareBoletosByParcelAndDue);
}

/** Parcelas da mesma série (seriesId) ou mesmo nome+valor sem recorrência. */
export function findBoletoSeriesSiblings(boleto, allBoletos) {
  if (!boleto?.id) return [];
  const list = Array.isArray(allBoletos) ? allBoletos : [];
  if (boleto.seriesId) {
    return sortBoletosInSeries(list.filter((b) => String(b.seriesId) === String(boleto.seriesId)));
  }
  const nameKey = (boleto.name || '').trim().toLowerCase();
  const amount = Number(boleto.amount) || 0;
  if (!nameKey) return [boleto];
  const matches = list.filter(
    (b) =>
      !b?.recurring &&
      (b.name || '').trim().toLowerCase() === nameKey &&
      (Number(b.amount) || 0) === amount
  );
  return matches.length > 1 ? sortBoletosInSeries(matches) : [boleto];
}
