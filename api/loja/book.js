const {
  getSupabaseAdmin,
  cors,
  validateOwnerRef,
  parseBody,
  UUID_RE,
} = require('../_lib/supabaseAdmin');

function parseTimeToMinutes(time) {
  const parts = String(time || '0:0').trim().split(':');
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

function addMinutesToTime(time, minutes) {
  const total = parseTimeToMinutes(time) + minutes;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function cartToPreOrderItems(cart) {
  return (cart || []).map((line) => ({
    id: line.id || line.item?.id,
    name: line.name || line.item?.name,
    price: Number(line.price ?? line.item?.price) || 0,
    discount: Number(line.discount ?? line.item?.discount) || 0,
    qty: Number(line.qty) || 1,
    tipo: line.tipo || line.item?._tipo || 'produto',
  }));
}

function buildDescription(cart, schedule) {
  const parts = [];
  if (schedule?.date && schedule?.time) parts.push(`Agendamento: ${schedule.date} às ${schedule.time}`);
  const items = cartToPreOrderItems(cart);
  if (items.length) parts.push(items.map((i) => `${i.name} x${i.qty}`).join(', '));
  return parts.join(' | ');
}

module.exports = async function handler(req, res) {
  cors(res, req, 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Content-Type', 'application/json');
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: 'Servidor não configurado.' });

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'JSON inválido' });

  const ref = String(body.ref || body.ownerUserId || '').trim();
  const name = String(body.clientName || body.name || '').trim();
  const phone = String(body.clientPhone || body.phone || '').trim();
  const email = String(body.clientEmail || body.email || '').trim() || null;
  const schedule = body.schedule || {};
  const cart = Array.isArray(body.cart) ? body.cart : [];

  if (!ref || !UUID_RE.test(ref)) return res.status(400).json({ error: 'Link da loja inválido.' });
  if (!name || name.length < 2) return res.status(400).json({ error: 'Informe seu nome.' });
  if (!phone || phone.replace(/\D/g, '').length < 10) return res.status(400).json({ error: 'Informe um telefone válido.' });
  if (!schedule?.date || !schedule?.time) return res.status(400).json({ error: 'Selecione data e horário.' });
  if (!cart.length) return res.status(400).json({ error: 'Carrinho vazio.' });

  if (!(await validateOwnerRef(supabase, ref))) return res.status(404).json({ error: 'Loja não encontrada.' });

  const { data: cfgRow } = await supabase.from('catalogo_configs').select('config').eq('user_id', ref).maybeSingle();
  const config = cfgRow?.config || {};
  if (config.agendamentoOnline === false) return res.status(403).json({ error: 'Agendamento online indisponível.' });

  // Verifica slot ainda livre
  const { data: dayEvents } = await supabase
    .from('agenda_events')
    .select('time,time_end')
    .eq('user_id', ref)
    .eq('date', schedule.date);

  const reqStart = parseTimeToMinutes(schedule.time);
  const duration = Number(config.agendaDuracaoMin) || 60;
  const reqEnd = reqStart + duration;
  const conflict = (dayEvents || []).some((ev) => {
    const start = parseTimeToMinutes(ev.time);
    let end = parseTimeToMinutes(ev.time_end);
    if (!ev.time_end) end = start + 60;
    return reqStart < end && reqEnd > start;
  });
  if (conflict) return res.status(409).json({ error: 'Horário não disponível. Escolha outro.' });

  // Cliente existente ou novo
  let clientId = null;
  const phoneDigits = phone.replace(/\D/g, '');
  const { data: existingClients } = await supabase
    .from('clients')
    .select('id,phone')
    .eq('user_id', ref);

  const match = (existingClients || []).find((c) => String(c.phone || '').replace(/\D/g, '') === phoneDigits);
  if (match?.id) {
    clientId = match.id;
    await supabase.from('clients').update({ name, email }).eq('id', clientId);
  } else {
    const { data: newClient, error: clientErr } = await supabase
      .from('clients')
      .insert({
        user_id: ref,
        name,
        phone,
        email,
        nivel: 'novo_cliente',
        tipo: 'empresa',
        tags: ['loja_online'],
      })
      .select('id')
      .single();
    if (clientErr) return res.status(500).json({ error: 'Não foi possível registrar o cliente.' });
    clientId = newClient?.id;
  }

  const preOrderItems = cartToPreOrderItems(cart);
  const serviceLine = preOrderItems.find((i) => i.tipo === 'servico');
  const serviceId = serviceLine?.id || body.serviceId || null;
  const total = preOrderItems.reduce((s, i) => s + Math.max(0, (i.price - (i.discount || 0)) * (i.qty || 1)), 0);
  const timeEnd = addMinutesToTime(schedule.time, duration);
  const title = serviceLine?.name ? `${name} — ${serviceLine.name}` : `${name} — Pedido online`;

  const { data: event, error: evErr } = await supabase
    .from('agenda_events')
    .insert({
      user_id: ref,
      title,
      description: buildDescription(cart, schedule),
      date: schedule.date,
      time: schedule.time,
      time_end: timeEnd,
      type: 'meeting',
      client_id: clientId,
      service_id: serviceId,
      amount: total,
      tipo: 'empresa',
      status: 'pendente',
      pre_order_items: preOrderItems,
    })
    .select('id')
    .single();

  if (evErr) {
    console.error('[loja/book]', evErr.message);
    return res.status(500).json({ error: 'Não foi possível confirmar o agendamento.' });
  }

  return res.status(200).json({
    ok: true,
    eventId: event?.id,
    clientId,
    message: 'Agendamento confirmado! Você receberá contato em breve.',
  });
};
