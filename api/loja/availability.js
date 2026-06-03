const {
  getSupabaseAdmin,
  cors,
  validateOwnerRef,
  UUID_RE,
} = require('../_lib/supabaseAdmin');

function parseTimeToMinutes(time) {
  const parts = String(time || '0:0').trim().split(':');
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

function formatMinutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function normalizeBusyEvents(events) {
  return (events || []).map((ev, idx) => ({
    id: ev.id || `busy-${idx}`,
    time: ev.time,
    time_end: ev.time_end || null,
    title: ev.title || 'Ocupado',
  }));
}

function generateSlots(config, events) {
  const startMin = parseTimeToMinutes(config?.agendaHoraInicio || '08:00');
  const endMin = parseTimeToMinutes(config?.agendaHoraFim || '18:00');
  const interval = Number(config?.agendaIntervaloMin) || 30;
  const duration = Number(config?.agendaDuracaoMin) || 60;

  const busy = (events || []).map((ev) => {
    const start = parseTimeToMinutes(ev.time);
    let end = parseTimeToMinutes(ev.time_end);
    if (!ev.time_end) end = start + 60;
    if (end <= start) end = start + 60;
    return { start, end };
  });

  const slots = [];
  for (let t = startMin; t + duration <= endMin; t += interval) {
    const slotEnd = t + duration;
    const overlaps = busy.some((b) => t < b.end && slotEnd > b.start);
    if (!overlaps) slots.push(formatMinutesToTime(t));
  }
  return slots;
}

module.exports = async function handler(req, res) {
  cors(res, req, 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Content-Type', 'application/json');
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: 'Servidor não configurado.' });

  const ref = String(req.query?.ref || '').trim();
  const date = String(req.query?.date || '').trim();
  if (!ref || !UUID_RE.test(ref)) return res.status(400).json({ error: 'Referência inválida.' });
  if (!date) return res.status(400).json({ error: 'Informe a data (DD/MM/AAAA).' });
  if (!(await validateOwnerRef(supabase, ref))) return res.status(404).json({ error: 'Loja não encontrada.' });

  const { data: cfgRow } = await supabase.from('catalogo_configs').select('config').eq('user_id', ref).maybeSingle();
  const config = cfgRow?.config || {};
  if (config.agendamentoOnline === false) {
    return res.status(200).json({ ok: true, slots: [], message: 'Agendamento online desativado.' });
  }

  const { data: events, error } = await supabase
    .from('agenda_events')
    .select('id,time,time_end,date,title')
    .eq('user_id', ref)
    .eq('date', date);

  if (error) return res.status(500).json({ error: 'Não foi possível consultar a agenda.' });

  const busy = normalizeBusyEvents(events || []);
  const slots = generateSlots(config, events || []);
  return res.status(200).json({ ok: true, date, slots, busy });
};
