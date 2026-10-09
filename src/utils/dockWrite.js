function fold(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clip(s, n = 80) {
  return String(s || '').trim().slice(0, n);
}

function todayBr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function toAgendaBrDate(v) {
  const s = String(v || '').trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (br) {
    const y = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${String(br[1]).padStart(2, '0')}/${String(br[2]).padStart(2, '0')}/${y}`;
  }
  const t = fold(s);
  if (/\bdepois de amanha\b/.test(t)) return shiftBr(2);
  if (/\b(daqui (a )?um dia|um dia depois|dia seguinte|no outro dia|outro dia)\b/.test(t)) return shiftBr(1);
  if (/\bamanha\b/.test(t)) return shiftBr(1);
  if (/\bhoje\b/.test(t)) return todayBr();
  return todayBr();
}

function timeToMinutes(t) {
  const [h, m] = String(t || '').split(/[:h]/i);
  const hh = parseInt(h, 10);
  const mm = parseInt(m, 10);
  return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
}

function minutesToTime(total) {
  const n = Math.max(0, Math.min(23 * 60 + 59, Number(total) || 0));
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}

function addMinutes(t, add) {
  return minutesToTime(timeToMinutes(t) + add);
}

/** Procedimento mínimo ao agendar pelo Dock. */
const MIN_PROCEDURE_MIN = 30;

function clampProcedureMin(n) {
  const v = Number(n) || 0;
  if (v <= 0) return MIN_PROCEDURE_MIN;
  return Math.max(MIN_PROCEDURE_MIN, Math.min(240, v));
}

function ensureProcedureEnd(start, end, durationMin) {
  if (!start) return '';
  const dur = Number(durationMin) || 0;
  if (dur >= MIN_PROCEDURE_MIN) return addMinutes(start, dur);
  if (end && timeToMinutes(end) >= timeToMinutes(start) + MIN_PROCEDURE_MIN) {
    return normalizeTime(end, '');
  }
  return addMinutes(start, MIN_PROCEDURE_MIN);
}

function normalizeTime(v, fallback = '09:00') {
  const s = String(v || '').trim();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?/);
  if (!m) return fallback;
  const h = Math.min(23, Number(m[1]));
  const min = m[2] || '00';
  return `${String(h).padStart(2, '0')}:${min}`;
}

const HORA_EXT = {
  uma: 1, um: 1, duas: 2, dois: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
  treze: 13, catorze: 14, quatorze: 14, quinze: 15, dezesseis: 16,
  dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20,
};

const NAME_STOP = /^(um|uma|o|a|as|na|no|da|do|de|em|com|e|minha|meu|para|pra|pro|hoje|amanha|ontem|agora|depois|daqui|seguinte|outro|outra|semana|mes|ano|segunda|terca|quarta|quinta|sexta|sabado|domingo|feira|dia|hora|horas|horario|compromisso|atendimento|cliente|clientes|agende|agendar|agenda|marcar|marca|dock|dok|tarde|manha|noite|madrugada|minutos|minuto|min|meia|novo|nova|chamado|chamada|por|favor|sessao|duracao|tempo|ate|das)$/i;

function isNameStop(w) {
  const t = fold(w);
  return !t || NAME_STOP.test(t);
}

export function isDockWritePhrase(text) {
  const t = fold(text);
  if (!t) return false;
  return (
    /\b(agende|agendar|agendamento|marca(?:r)?\s+(?:um\s+)?horario|marca(?:r)?\s+(?:o|a|um|uma)\b|cadastre|cadastrar|cadastra|cadastro|registre|registrar|crie|criar|lance|lancar|novo cliente|novo produto|novo servico|sessao)\b/.test(t)
    || /\bagenda(?:r)?\s+(?:o|a|um|uma|pro|pra|para|pro|o cliente|a cliente)\b/.test(t)
    || /\b(edite|editar|altera|altere|alterar|muda|mudar|mude|troca|trocar|troque|renomeia|renomear|renomeie|corrige|corrigir|atualiza|atualizar|atualize)\b/.test(t)
    || (/\b(cancela|cancelar|exclui|excluir|apaga|apagar|remove|remover)\b/.test(t) && /\b(agendamento|agenda|compromisso|evento|sessao)\b/.test(t))
  );
}

function isEditPhrase(text) {
  return /\b(edite|editar|altera|altere|alterar|muda|mudar|mude|troca|trocar|troque|renomeia|renomear|renomeie|corrige|corrigir|atualiza|atualizar|atualize|agora (?:e|é|se chama)|passa a (?:ser|se chamar))\b/.test(text);
}

function parseMoney(raw) {
  const t = String(raw || '');
  const m = t.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?)/);
  if (!m) return null;
  const n = Number(String(m[1]).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function cleanName(s) {
  return String(s || '')
    .replace(/["'`]/g, '')
    .replace(/\s+(por favor|pfv|pf|ok|obrigad[oa])\s*$/i, '')
    .replace(/[.,;!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function kindFromWord(w) {
  const t = fold(w);
  if (/^client/.test(t)) return 'client';
  if (/^produt/.test(t)) return 'product';
  if (/^servic/.test(t)) return 'service';
  if (/^forneced/.test(t)) return 'supplier';
  if (/^(compromisso|agendamento|evento|horario|sessao)/.test(t)) return 'appointment';
  if (/^tarefa/.test(t)) return 'task';
  return '';
}

function fieldFromWord(w) {
  const t = fold(w);
  if (/^nome|^titulo/.test(t)) return 'name';
  if (/^(preco|preço|valor)/.test(t)) return 'price';
  if (/^(telefone|fone|celular|whatsapp)/.test(t)) return 'phone';
  if (/mail/.test(t)) return 'email';
  if (/endereco/.test(t)) return 'address';
  if (/^(horario|hora|time|duracao|sessao|tempo)/.test(t)) return 'time';
  if (/^data/.test(t)) return 'date';
  if (/descri/.test(t)) return 'description';
  return '';
}

function fieldLabel(field) {
  return ({
    name: 'nome',
    price: 'preço',
    phone: 'telefone',
    email: 'e-mail',
    address: 'endereço',
    time: 'horário',
    date: 'data',
    description: 'descrição',
    title: 'título',
  })[field] || field;
}

function entityLabel(kind) {
  return ({
    client: 'cliente',
    product: 'produto',
    service: 'serviço',
    supplier: 'fornecedor',
    appointment: 'agendamento',
    task: 'tarefa',
  })[kind] || 'cadastro';
}

function shiftBr(days) {
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 0));
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function extractDateHint(text) {
  const t = fold(text);
  if (/\bdepois de amanha\b/.test(t)
    || /\b(daqui (a )?um dia|um dia depois|dia seguinte|no outro dia|outro dia|amanha|hoje)\b/.test(t)) {
    return toAgendaBrDate(text);
  }
  const week = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
  const w = t.match(/\b(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?: feira)?\b/);
  if (w) {
    const want = week[w[1]];
    const d = new Date();
    let add = (want - d.getDay() + 7) % 7;
    if (add === 0 && !/\b(hoje|esta|dessa)\b/.test(t)) add = 7;
    d.setDate(d.getDate() + add);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  const dia = t.match(/\bdia\s+(\d{1,2})\b/);
  if (dia) {
    const d = new Date();
    const day = Number(dia[1]);
    d.setDate(day);
    if (day < new Date().getDate() && !/\b(esse|este|hoje)\b/.test(t)) {
      d.setMonth(d.getMonth() + 1);
    }
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  const br = String(text || '').match(/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/);
  if (br) return toAgendaBrDate(br[0]);
  return '';
}

function isJunkRenameValue(s) {
  const t = fold(s);
  return !t || /^(mudar|muda|mude|alterar|altere|trocar|troca|o nome|o titulo|o horario|o cliente|mudar o nome|muda o nome|alterar o nome)(\s+o?\s*nome)?$/.test(t);
}

function detectAppointmentEdit(original) {
  const text = fold(original);
  if (!text || !isEditPhrase(text)) return null;
  const mentionsAgenda = /\b(agendamento|compromisso|evento|atendimento|sessao|horario|duracao|tempo)\b/.test(text)
    || (/\bagenda\b/.test(text) && /\b(hoje|amanha|nome|cliente|sessao|horario)\b/.test(text));
  if (!mentionsAgenda) return null;
  const src = String(original || '').trim();
  const dateHint = extractDateHint(text);
  const times = parseAgendaTimes(original);
  const wantsTime = /\b(sessao|duracao|tempo|horario|minutos|hora)\b/.test(text) || looksLikeTimeValue(src);
  let fromName = '';
  const fromPat = src.match(/(?:agendamento|compromisso|evento|atendimento|sessao)\s+(?:d[oa]\s+)?(?:cliente\s+)?(.+?)(?:\s+de\s+(?:hoje|amanh[aã])|\s+para|\s+pra|\s+hoje|\s+amanh[aã])/i);
  if (fromPat?.[1]) {
    fromName = cleanName(String(fromPat[1]).replace(/\b(de\s+)?(hoje|amanh[aã])\b/ig, ''));
    if (isJunkRenameValue(fromName) || /^(de|do|da|o|a)$/i.test(fromName) || looksLikeTimeValue(fromName)) fromName = '';
  }
  const timePatch = {};
  if (times.time) timePatch.time = times.time;
  if (times.timeEnd) timePatch.timeEnd = times.timeEnd;
  if (times.durationMin) timePatch.durationMin = times.durationMin;
  const hasTimePatch = Object.keys(timePatch).length > 0;

  const para = src.match(/\b(?:para|pra)\s+(?:mudar|muda|alterar|trocar)\s+(?:o\s+)?nome\s+(?:para|pra)\s+(.+)$/i)
    || src.match(/\b(?:para|pra)\s+(?!mudar\b|muda\b|alterar\b|trocar\b)(.+)$/i);
  let nextVal = cleanName(para?.[1] || '');
  if (isJunkRenameValue(nextVal) || looksLikeTimeValue(nextVal)) nextVal = '';

  if (hasTimePatch && (wantsTime || !nextVal)) {
    return {
      tool: 'update_appointment',
      args: {
        fromName,
        dateHint,
        field: 'time',
        patch: timePatch,
        kind: 'appointment',
      },
    };
  }
  if (!nextVal) {
    if (dateHint || fromName) {
      return {
        tool: 'update_appointment',
        args: {
          fromName,
          dateHint,
          field: 'title',
          patch: {},
          kind: 'appointment',
          openForm: true,
        },
      };
    }
    return {
      tool: 'need_params',
      message: 'Diga o nome, a hora ou a duração. Exemplo: sessão de 40 minutos, ou das 14 às 15.',
    };
  }
  return {
    tool: 'update_appointment',
    args: {
      fromName,
      dateHint,
      field: 'title',
      patch: { title: nextVal, description: nextVal },
      kind: 'appointment',
      nextName: nextVal,
    },
  };
}

function detectDockEdit(original) {
  const appt = detectAppointmentEdit(original);
  if (appt) return appt;
  const text = fold(original);
  if (!text || !isEditPhrase(text)) return null;
  const src = String(original || '').trim();
  const kindWord = '(cliente|produto|servi[cç]o|fornecedor|compromisso|agendamento|evento|tarefa)';
  const fieldWord = '(nome|t[ií]tulo|pre[cç]o|valor|telefone|fone|celular|whatsapp|e-?mail|endere[cç]o|hor[aá]rio|hora|data|descri[cç][aã]o)';
  const patterns = [
    new RegExp(`(?:renome(?:ia|ar|ie)|mud[ea] o nome|mudar o nome|alter(?:e|ar) o nome|troc(?:a|ar|que) o nome)\\s+(?:d[oa]\\s+)?${kindWord}\\s+(.+?)\\s+(?:para|pra|p)\\s+(.+)$`, 'i'),
    new RegExp(`(?:edite|editar|altere|alterar|muda|mudar|mude|troca|trocar|troque|corrige|corrigir|atualiza|atualizar|atualize)\\s+(?:o\\s+|a\\s+)?${fieldWord}\\s+(?:d[oa]\\s+)?${kindWord}\\s+(.+?)\\s+(?:para|pra|p)\\s+(.+)$`, 'i'),
    new RegExp(`(?:edite|editar|altere|alterar|muda|mudar|mude|troca|trocar|troque|atualiza|atualizar)\\s+(?:o\\s+|a\\s+)?${kindWord}\\s+(.+?)\\s+(?:para|pra|p)\\s+(.+)$`, 'i'),
    new RegExp(`${kindWord}\\s+(.+?)\\s+(?:agora se chama|passa a se chamar|agora [eé]|passa a ser)\\s+(.+)$`, 'i'),
  ];
  let kind = '';
  let field = '';
  let fromName = '';
  let nextVal = '';
  for (let i = 0; i < patterns.length; i += 1) {
    const m = src.match(patterns[i]);
    if (!m) continue;
    if (i === 1) {
      field = fieldFromWord(m[1]);
      kind = kindFromWord(m[2]);
      fromName = cleanName(m[3]);
      nextVal = cleanName(m[4]);
    } else {
      kind = kindFromWord(m[1]);
      fromName = cleanName(m[2]);
      nextVal = cleanName(m[3]);
      field = field || 'name';
    }
    if (kind && fromName && nextVal) break;
  }
  if (!kind || !fromName || !nextVal) {
    if (/\b(cliente|produto|servic|forneced|agendamento|tarefa)\b/.test(text)) {
      return {
        tool: 'need_params',
        message: 'Diga o cadastro e o valor novo. Exemplo: muda o nome do cliente João para Pedro.',
      };
    }
    return null;
  }
  if (fromName.length < 2 || nextVal.length < 1) return null;
  if (!field) field = kind === 'appointment' ? 'title' : 'name';
  if (kind === 'appointment' && field === 'name') field = 'title';
  const patch = {};
  if (field === 'name' || field === 'title') patch[field === 'title' ? 'title' : 'name'] = nextVal;
  else if (field === 'price') {
    const n = parseMoney(nextVal);
    if (n == null) return { tool: 'need_params', args: {}, message: 'Diga o novo valor em reais.' };
    patch.price = n;
  } else if (field === 'phone') patch.phone = nextVal.replace(/[^\d+]/g, '') || nextVal;
  else if (field === 'email') patch.email = nextVal;
  else if (field === 'address') patch.address = nextVal;
  else if (field === 'time') patch.time = normalizeTime(nextVal);
  else if (field === 'date') patch.date = toAgendaBrDate(nextVal);
  else if (field === 'description') patch.description = nextVal;
  else patch.name = nextVal;
  const tool = ({
    client: 'update_client',
    product: 'update_product',
    service: 'update_service',
    supplier: 'update_supplier',
    appointment: 'update_appointment',
    task: 'update_task',
  })[kind];
  if (!tool) return null;
  return { tool, args: { fromName, field: field === 'title' ? 'title' : field, patch, kind } };
}

function stripWhenFromUtterance(src) {
  return String(src || '')
    .replace(/\b(dock|dok)\b/ig, ' ')
    .replace(/\b(?:as|às|eas|es)\s*\d{1,2}(?::\d{2})?\s*(?:h|horas?)?\b/ig, ' ')
    .replace(/\b\d{1,2}:\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}\s*h(?:oras?)?\b/ig, ' ')
    .replace(/(?:^|[^\p{L}])(?:depois\s+de\s+amanh[aã]|um\s+dia\s+depois|dia\s+seguinte|amanh[aã]|hoje|ontem)(?=$|[^\p{L}])/giu, ' ')
    .replace(/(?:^|[^\p{L}])(?:segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)(?:-feira)?(?=$|[^\p{L}])/giu, ' ')
    .replace(/\b(da\s+)?(tarde|manha|manhã|noite|madrugada)\b/ig, ' ')
    .replace(/\b(dia)\s*\d{1,2}\b/ig, ' ')
    .replace(/\b(meio dia|meia noite)\b/ig, ' ')
    .replace(/\b(?:sess[aã]o|dura[cç][aã]o|tempo)\s+(?:de\s+)?(?:\d{1,3}|uma|um|duas|meia)\s*(?:min(?:utos?)?|horas?)?\b/ig, ' ')
    .replace(/\b(?:por|de|com)\s+\d{1,3}\s*min(?:utos?)?\b/ig, ' ')
    .replace(/\b(?:das?|de)\s*\d{1,2}(?::\d{2})?\s*(?:as|às|ate|até)\s*\d{1,2}(?::\d{2})?\b/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseClientName(original) {
  const src = stripWhenFromUtterance(original);
  const patterns = [
    /nome(?:\s+do\s+cliente)?(?:\s+e|\s+é|:)?\s+([A-Za-zÀ-ÿ][\wÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ]+){0,4})/i,
    /(?:cadastr(?:ar|e|a)|crie|criar|registre|registrar|novo)\s+(?:um\s+|o\s+|uma\s+)?cliente\s+(?:chamad[oa]\s+)?([A-Za-zÀ-ÿ][\wÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ]+){0,4})/i,
    /(?:agende|agendar|agenda|marcar|marca)\s+(?:o\s+|a\s+|um\s+|uma\s+|pro\s+|pra\s+|para\s+)?(?:cliente\s+)?(?:chamad[oa]\s+)?([A-Za-zÀ-ÿ][\wÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ]+){0,4})/i,
    /cliente\s+(?:chamad[oa]\s+)?([A-Za-zÀ-ÿ][\wÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ]+){0,4})/i,
  ];
  for (const re of patterns) {
    const m = src.match(re);
    if (!m?.[1]) continue;
    const who = m[1]
      .split(/\s+/)
      .filter((w) => !isNameStop(w))
      .join(' ')
      .trim();
    if (who.length >= 2 && !isNameStop(who)) return who;
  }
  return '';
}

function parseLoosePersonName(original) {
  const t = fold(original)
    .replace(/\b(hoje|amanha|depois de amanha|agora|por favor|cliente|agende|agendar|agenda|marcar|marca|sessao|horario|hora|horas|as|ate|das|para|pra|pro)\b/g, ' ')
    .replace(/\b\d{1,2}(?::\d{2})?\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = t.split(' ').filter((w) => w.length >= 2 && !isNameStop(w));
  const who = words.slice(0, 4).join(' ').trim();
  return who.length >= 2 ? who : '';
}

function parseHourToken(raw) {
  const n = Number(raw);
  if (Number.isFinite(n)) return n;
  const w = HORA_EXT[fold(raw)];
  return Number.isFinite(w) ? w : null;
}

function applyClockPeriod(h, original) {
  const t = fold(original);
  let hour = h;
  if (/\b(da )?tarde\b/.test(t) && hour >= 1 && hour <= 11) hour += 12;
  if (/\b(da )?noite\b/.test(t) && hour >= 1 && hour <= 11) hour += 12;
  if (/\b(da )?madrugada\b/.test(t) && hour === 12) hour = 0;
  return Math.min(23, Math.max(0, hour));
}

function parseTimeFromText(original) {
  const src = String(original || '');
  const t = fold(src);
  if (/\bmeio dia\b/.test(t)) return '12:00';
  if (/\bmeia noite\b/.test(t)) return '00:00';

  const colon = src.match(/\b(\d{1,2}):(\d{2})\b/);
  const daPeriodo = src.match(/\b(\d{1,2}|uma|um|duas|dois|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze)\s+da\s+(tarde|noite|manh[aã]|madrugada)\b/i);
  const asNum = src.match(/\b(?:as|às|eas|es)\s*(\d{1,2})(?::(\d{2}))?\b/i);
  const hSuffix = src.match(/\b(\d{1,2})\s*(?:h|horas)\b/i);
  const hourWord = '(uma|um|duas|dois|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte)';
  const wordH = src.match(new RegExp(`\\b(?:as|às)\\s*${hourWord}\\s*(?:e\\s*(meia|quinze))?(?:\\s*(?:h|horas?))?\\b`, 'i'))
    || src.match(new RegExp(`\\b${hourWord}\\s*(?:e\\s*(meia|quinze))?\\s*(?:h|horas)\\b`, 'i'));

  let h = null;
  let min = 0;
  if (colon) {
    h = Number(colon[1]);
    min = Number(colon[2]);
  } else if (daPeriodo) {
    h = parseHourToken(daPeriodo[1]);
  } else if (asNum) {
    h = Number(asNum[1]);
    min = Number(asNum[2] || 0);
  } else if (hSuffix) {
    h = Number(hSuffix[1]);
  } else if (wordH) {
    h = parseHourToken(wordH[1]);
    const frac = fold(wordH[2] || '');
    if (frac === 'meia') min = 30;
    if (frac === 'quinze') min = 15;
  }
  if (h == null || !Number.isFinite(h)) return '';
  h = applyClockPeriod(h, src);
  min = Math.min(59, Math.max(0, Number.isFinite(min) ? min : 0));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const DUR_WORD = {
  dez: 10, quinze: 15, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60,
};

function durationToken(raw) {
  const n = Number(raw);
  if (Number.isFinite(n)) return n;
  return DUR_WORD[fold(raw)] || null;
}

function parseDurationMinutes(original) {
  const t = fold(original);
  if (/\b(uma )?hora e meia\b/.test(t)) return 90;
  if (/\bmeia hora\b/.test(t)) return 30;
  if (/\bduas horas\b/.test(t)) return 120;
  if (/\buma hora\b/.test(t)) return 60;
  const withUnit = t.match(/\b(?:sessao|duracao|tempo)?\s*(?:de|por|com)?\s*(\d{1,3}|dez|quinze|vinte|trinta|quarenta|cinquenta|sessenta)\s*(?:min(?:utos?)?)\b/);
  if (withUnit) {
    const n = durationToken(withUnit[1]);
    if (n >= 10 && n <= 240) return n;
  }
  const sessao = t.match(/\bsessao(?:\s+de)?\s*(\d{1,3}|dez|quinze|vinte|trinta|quarenta|cinquenta|sessenta)\b/);
  if (sessao) {
    const n = durationToken(sessao[1]);
    if (n >= 10 && n <= 240) return n;
  }
  return 0;
}

function formatClock(h, minRaw) {
  const hour = Math.min(23, Math.max(0, Number(h) || 0));
  const min = Math.min(59, Math.max(0, Number(minRaw) || 0));
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function parseTimeRange(original) {
  const src = String(original || '');
  const t = fold(src);
  const range = src.match(/\b(?:das?|de)\s*(\d{1,2})(?::(\d{2}))?\s*(?:h(?:oras?)?)?\s*(?:as|às|ate|até)\s*(\d{1,2})(?::(\d{2}))?\s*(?:h(?:oras?)?)?\b/i);
  if (range) {
    let h1 = Number(range[1]);
    let h2 = Number(range[3]);
    h1 = applyClockPeriod(h1, src);
    h2 = applyClockPeriod(h2, src);
    if (/\b(da )?tarde\b/.test(t) && h2 < h1 && h2 <= 11) h2 += 12;
    const start = formatClock(h1, range[2]);
    const end = formatClock(h2, range[4]);
    return { time: start, timeEnd: ensureProcedureEnd(start, end, 0) };
  }
  const ate = src.match(/\b(?:ate|até)\s*(?:as|às)?\s*(\d{1,2})(?::(\d{2}))?\b/i);
  const start = parseTimeFromText(src.replace(/\b(?:ate|até)\s*(?:as|às)?\s*\d{1,2}(?::\d{2})?\b/ig, ' '));
  if (ate && start) {
    let h = Number(ate[1]);
    h = applyClockPeriod(h, src);
    const end = formatClock(h, ate[2]);
    return { time: start, timeEnd: ensureProcedureEnd(start, end, 0) };
  }
  return null;
}

function parseAgendaTimes(original) {
  const range = parseTimeRange(original);
  const durationMin = parseDurationMinutes(original);
  const time = range?.time || parseTimeFromText(original);
  let timeEnd = range?.timeEnd || '';
  if (time) {
    timeEnd = ensureProcedureEnd(time, timeEnd, durationMin);
  }
  return {
    time: time || '',
    timeEnd: timeEnd || '',
    durationMin: time ? clampProcedureMin(durationMin || (timeEnd ? timeToMinutes(timeEnd) - timeToMinutes(time) : 0)) : (durationMin || 0),
  };
}

function looksLikeTimeValue(s) {
  const t = fold(s);
  return /\b(\d+\s*min|\d+\s*hora|meia hora|das |ate |as \d|sessao)\b/.test(t) || /^\d{1,2}(:\d{2})?$/.test(t);
}

function clientAliases(c) {
  const raw = String(c?.name || '');
  const aliases = [];
  const full = fold(raw);
  if (full.length >= 2 && !isNameStop(full)) aliases.push(full);
  const paren = raw.match(/\(([^)]+)\)/g) || [];
  paren.forEach((p) => {
    const t = fold(p.replace(/[()]/g, ''));
    if (t.length >= 2 && !isNameStop(t)) aliases.push(t);
  });
  const vulgo = raw.match(/\b(?:vulgo|apelido|conhecido como|ou)\s+([A-Za-zÀ-ÿ][\wÀ-ÿ]+)/i);
  if (vulgo?.[1]) {
    const t = fold(vulgo[1]);
    if (t.length >= 2 && !isNameStop(t)) aliases.push(t);
  }
  full.split(' ').forEach((w) => {
    if (w.length >= 2 && !isNameStop(w)) aliases.push(w);
  });
  return [...new Set(aliases)];
}

function matchSpokenClient(original, clients) {
  const src = fold(stripWhenFromUtterance(original));
  if (!src || !Array.isArray(clients) || !clients.length) return null;
  const tokens = src.split(/\s+/).filter((w) => w.length >= 2 && !isNameStop(w));
  if (!tokens.length) return null;
  const hits = clients
    .map((c) => {
      const aliases = clientAliases(c);
      if (!aliases.length) return null;
      const full = aliases.find((a) => a.includes(' ') && src.includes(a));
      if (full) return { c, score: 100 + full.length };
      const tokenHits = aliases.filter((a) => !a.includes(' ') && tokens.includes(a));
      if (!tokenHits.length) return null;
      const longest = tokenHits.sort((a, b) => b.length - a.length)[0];
      const same = clients.filter((x) => clientAliases(x).includes(longest));
      if (same.length !== 1) return null;
      return { c, score: 50 + longest.length };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  if (!hits.length) return null;
  if (hits.length === 1) return hits[0].c;
  if (hits[0].score > hits[1].score) return hits[0].c;
  return null;
}

export function claimsDockSaved(msg) {
  return /\b(cadastrei|agendei|agendou|agendado|marquei|registrei|ja esta na agenda|gravei na agenda|cancelei|cancelou|exclui|excluiu|apaguei|apagaou)\b/.test(fold(msg));
}

function parseCancelTargetName(original) {
  const src = String(original || '');
  const m = src.match(/\b(?:agendamento|compromisso|evento|atendimento|sess[aã]o|hor[aá]rio)\s+(?:d[oa]s?\s+)?(?:cliente\s+)?(.+)$/i)
    || src.match(/\b(?:cancela|cancelar|exclui|excluir|apaga|apagar|remove|remover)\s+(?:o|a|um|uma)?\s*(?:agendamento|compromisso|evento|sess[aã]o)?\s*(?:d[oa]s?\s+)?(.+)$/i);
  let name = cleanName(m?.[1] || '');
  name = name
    .replace(/\b(hoje|amanh[aã]|depois de amanh[aã]|agora|por favor)\b/ig, ' ')
    .replace(/\b(?:as|às|ate|até)\s*\d{1,2}(?::\d{2})?\b/ig, ' ')
    .replace(/\b\d{1,2}(?::\d{2})?\s*h(?:oras?)?\b/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!name || isNameStop(name) || looksLikeTimeValue(name)) return '';
  const words = name.split(/\s+/).filter((w) => !isNameStop(w) && !looksLikeTimeValue(w));
  return words.join(' ').trim();
}

function eventMatchesPerson(e, person, clients) {
  if (!person) return false;
  const aliases = clientAliases(person);
  const label = fold(appointmentLabel(e, clients));
  const title = fold(e.title);
  const desc = fold(e.description);
  return String(e.clientId) === String(person.id)
    || aliases.some((a) => a && (label.includes(a) || title.includes(a) || desc.includes(a)))
    || (fold(person.name) && (label.includes(fold(person.name)) || title.includes(fold(person.name))));
}

function detectDockCancelAgenda(original, lists = {}) {
  const text = fold(original);
  if (!text) return null;
  const wantsDel = /\b(cancela|cancelar|exclui|excluir|apaga|apagar|remove|remover|deleta|deletar|limpa|limpar)\b/.test(text);
  const wantsAgenda = /\b(agendamento|agendamentos|compromisso|compromissos|evento|eventos|sessao|sessoes|agenda|horario|atendimento)\b/.test(text)
    || (/\b(os|as|tudo|todos|todas|um|uma|esse|essa)\b/.test(text) && /\b(hoje|amanha|depois|dia|quinta|sexta|segunda|terca|quarta|sabado|domingo)\b/.test(text));
  if (!wantsDel || !wantsAgenda) return null;
  const dateHint = extractDateHint(text);
  const spoken = matchSpokenClient(original, lists.clients);
  const named = spoken || (parseCancelTargetName(original)
    ? matchSpokenClient(parseCancelTargetName(original), lists.clients)
    : null);
  const fromName = spoken?.name || parseCancelTargetName(original);
  const times = parseAgendaTimes(original);
  const allDay = !named && !fromName && !times.time && (
    /\b(todos|todas|tudo)\b/.test(text)
    || /\bos agendamentos\b/.test(text)
    || /\bas sessoes\b/.test(text)
    || /\b(os de|os da|do dia)\b/.test(text)
  );
  let events = Array.isArray(lists.agendaEvents) ? lists.agendaEvents.slice() : [];
  if (dateHint) events = events.filter((e) => toAgendaBrDate(e.date) === toAgendaBrDate(dateHint));
  if (times.time) {
    events = events.filter((e) => normalizeTime(e.time, '') === times.time);
  }
  if (named) events = events.filter((e) => eventMatchesPerson(e, named, lists.clients));
  else if (fromName) {
    const hit = findAppointment(events, lists.clients, { fromName, dateHint });
    events = hit?.event ? [hit.event] : [];
  }

  if (allDay) {
    const date = dateHint || todayBr();
    const dayEvents = (lists.agendaEvents || []).filter((e) => toAgendaBrDate(e.date) === toAgendaBrDate(date));
    return {
      tool: 'delete_appointments',
      args: {
        date,
        ids: dayEvents.map((e) => e.id),
        count: dayEvents.length,
        titles: dayEvents.map((e) => appointmentLabel(e, lists.clients) || e.title || 'Atendimento').slice(0, 8),
        allDay: true,
      },
    };
  }

  if (events.length === 1) {
    const ev = events[0];
    const label = appointmentLabel(ev, lists.clients) || ev.title || 'Atendimento';
    return {
      tool: 'delete_appointments',
      args: {
        date: ev.date || dateHint || todayBr(),
        ids: [ev.id],
        count: 1,
        titles: [label],
        allDay: false,
      },
    };
  }
  if (!events.length) {
    return {
      tool: 'need_params',
      message: fromName || times.time
        ? 'Não achei esse agendamento. Diga o nome e o dia, por exemplo: cancela o agendamento da Maria amanhã.'
        : 'Qual agendamento eu excluo? Diga o nome ou o horário.',
    };
  }
  const names = events.slice(0, 6).map((e) => appointmentLabel(e, lists.clients) || e.title || 'Atendimento').join(', ');
  return {
    tool: 'need_params',
    message: `Tem ${events.length} agendamentos${dateHint ? ` em ${toAgendaBrDate(dateHint)}` : ''}: ${names}. Diga qual eu excluo.`,
  };
}

export function detectDockWrite(original, lists = {}) {
  const cancel = detectDockCancelAgenda(original, lists);
  if (cancel) return cancel;
  const edited = detectDockEdit(original);
  if (edited) return edited;
  const text = fold(original);
  if (!text) return null;
  const spoken = matchSpokenClient(original, lists.clients);
  let clientName = spoken?.name || parseClientName(original);
  if (isNameStop(clientName)) clientName = spoken?.name || '';
  const wantsClient = /\bcliente\b/.test(text) && /\b(cadastre|cadastrar|cadastra|cadastro|crie|criar|registre|registrar|novo)\b/.test(text);
  const wantsAgenda = /\b(agende|agendar|agendamento|marca|marcar|sessao)\b/.test(text)
    || /\bagenda(?:r)?\s+(?:o|a|um|uma|pro|pra|para)\b/.test(text)
    || (/\bagenda\b/.test(text) && /\b(cliente|horario|amanha|hoje|as|às|depois|sessao|minutos)\b/.test(text));

  if (wantsClient && !wantsAgenda && clientName) {
    return { tool: 'create_client', args: { name: clientName } };
  }
  if (wantsAgenda || (wantsClient && wantsAgenda)) {
    const times = parseAgendaTimes(original);
    const who = clientName;
    const date = toAgendaBrDate(original);
    const title = who || 'Sessão';
    return {
      tool: 'create_appointment',
      args: {
        title,
        date,
        time: times.time,
        clientName: who,
        clientId: spoken?.id || null,
        timeEnd: times.timeEnd,
        durationMin: times.durationMin,
      },
    };
  }
  return null;
}

export function mergeAppointmentFromSpeech(args, original, lists = {}) {
  const prev = args && typeof args === 'object' ? args : {};
  const spoken = matchSpokenClient(original, lists.clients);
  const parsed = parseClientName(original);
  const loose = parseLoosePersonName(original);
  let name = spoken?.name || parsed || prev.clientName || '';
  if (!name || isNameStop(name)) name = loose || spoken?.name || prev.clientName || '';
  if (isNameStop(name)) name = prev.clientName || '';
  const times = parseAgendaTimes(original);
  const hint = extractDateHint(original);
  return {
    ...prev,
    clientName: name,
    clientId: spoken?.id || prev.clientId || null,
    title: name || prev.title || 'Sessão',
    date: hint || prev.date || toAgendaBrDate(original),
    time: times.time || prev.time || '',
    timeEnd: times.timeEnd || prev.timeEnd || '',
    durationMin: times.durationMin || prev.durationMin || 0,
  };
}

export function appointmentNeedsParams(args = {}) {
  const name = clip(args.clientName || (args.title && args.title !== 'Sessão' && args.title !== 'Atendimento' ? args.title : ''));
  const time = String(args.time || '').trim();
  if ((!name || isNameStop(name) || name.length < 2) && !time) {
    return 'Qual o nome do cliente e o horário?';
  }
  if (!name || isNameStop(name) || name.length < 2) return 'Qual o nome do cliente?';
  if (!time) return `Qual o horário para ${name}?`;
  return '';
}

export function pendingWriteSummary(tool, args = {}) {
  if (tool === 'need_params') return args.message || 'Faltou um dado. Pode repetir?';
  if (tool === 'delete_appointments') {
    const n = args.count || (args.ids || []).length;
    const names = (args.titles || []).filter(Boolean).join(', ');
    const when = toAgendaBrDate(args.date);
    if (n === 1) {
      return `Posso excluir o agendamento${names ? ` de ${names}` : ''} em ${when}? Só apago se você autorizar.`;
    }
    if (n) {
      return `Posso excluir ${n} agendamentos em ${when}${names ? ` (${names})` : ''}? Só apago se você autorizar.`;
    }
    return `Posso excluir os agendamentos de ${when}? Só apago se você autorizar.`;
  }
  if (tool === 'create_appointment') {
    const when = args.time ? ` às ${normalizeTime(args.time, args.time)}` : '';
    const until = args.timeEnd ? ` até ${normalizeTime(args.timeEnd, args.timeEnd)}` : '';
    const dur = args.durationMin ? ` (${args.durationMin} min)` : '';
    return `Posso agendar ${args.clientName || args.title || 'a sessão'} em ${toAgendaBrDate(args.date)}${when}${until}${dur}. Confirmar?`;
  }
  if (tool === 'create_product') return `Posso cadastrar o produto ${args.name}. Confirmar?`;
  if (tool === 'create_service') return `Posso cadastrar o serviço ${args.name}. Confirmar?`;
  if (tool === 'update_appointment') {
    const when = args.dateHint ? ` de ${args.dateHint}` : '';
    const next = args.nextName || args.patch?.title || args.patch?.description || '';
    const start = args.patch?.time;
    const end = args.patch?.timeEnd;
    const dur = args.patch?.durationMin;
    if (start || end || dur) {
      const span = start ? ` às ${start}${end ? ` até ${end}` : ''}` : '';
      const durLabel = dur ? ` (${dur} min)` : '';
      return `Posso mudar o horário do agendamento${args.fromName ? ` ${args.fromName}` : when}${span}${durLabel}. Confirmar?`;
    }
    if (!next) return `Posso abrir o agendamento${when || args.fromName ? ` ${args.fromName || when}` : ''} no formulário para você mudar o nome. Confirmar?`;
    return `Posso mudar o agendamento${args.fromName ? ` ${args.fromName}` : when} para ${next}. Confirmar?`;
  }
  if (/^update_/.test(tool)) {
    const kind = args.kind || tool.replace('update_', '');
    const field = fieldLabel(args.field || 'name');
    const next = args.patch?.name || args.patch?.title || args.patch?.phone || args.patch?.email || args.patch?.address
      || (args.patch?.price != null ? `R$ ${Number(args.patch.price).toFixed(2).replace('.', ',')}` : '')
      || args.patch?.time || args.patch?.date || args.patch?.description || '';
    return `Posso alterar o ${field} do ${entityLabel(kind)} ${args.fromName} para ${next}. Confirmar?`;
  }
  return 'Posso fazer essa alteração. Confirmar?';
}

function findNamed(list, name, key = 'name') {
  const want = fold(name);
  if (!want || !Array.isArray(list)) return null;
  const scored = list
    .map((item) => {
      const n = fold(item?.[key] || item?.title || '');
      let score = 0;
      if (!n) return { item, score };
      if (n === want) score = 100;
      else if (n.startsWith(want) || want.startsWith(n)) score = 80;
      else if (n.includes(want) || want.includes(n)) score = 50;
      return { item, score, n };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || String(a.n).length - String(b.n).length);
  return scored[0]?.item || null;
}

function findExactOrUnique(list, name, key = 'name') {
  const want = fold(name);
  if (!want || !Array.isArray(list)) return null;
  const exact = list.filter((item) => fold(item?.[key] || item?.title || '') === want);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return exact[0];
  const starts = list.filter((item) => {
    const n = fold(item?.[key] || item?.title || '');
    return n.startsWith(`${want} `) || n === want;
  });
  if (starts.length === 1) return starts[0];
  return null;
}

function appointmentLabel(ev, clients) {
  const c = (clients || []).find((x) => String(x.id) === String(ev?.clientId));
  return c?.name || ev?.title || ev?.description || '';
}

function findAppointment(events, clients, args = {}) {
  let pool = Array.isArray(events) ? events.slice() : [];
  const dateHint = args.dateHint ? toAgendaBrDate(args.dateHint) : '';
  if (dateHint) pool = pool.filter((e) => toAgendaBrDate(e.date) === dateHint);
  const want = fold(args.fromName).replace(/^(de|do|da|o|a|cliente)\s+/g, '').trim();
  if (!want) {
    if (pool.length === 1) return { event: pool[0] };
    if (!pool.length) return { error: dateHint ? 'Não achei agendamento nesse dia.' : 'Não achei o agendamento.' };
    return {
      error: `Tem ${pool.length} agendamentos nesse dia. Diga o nome atual, por exemplo: muda o agendamento da Maria para João.`,
    };
  }
  const scored = pool
    .map((e) => {
      const client = (clients || []).find((c) => String(c.id) === String(e.clientId));
      const aliases = client ? clientAliases(client) : [];
      const label = fold(appointmentLabel(e, clients));
      const title = fold(e.title);
      const desc = fold(e.description);
      let score = 0;
      if (label === want || title === want || aliases.includes(want)) score = 100;
      else if (label.startsWith(want) || title.startsWith(want) || aliases.some((a) => a.startsWith(want) || want.startsWith(a))) score = 80;
      else if (label.includes(want) || title.includes(want) || desc.includes(want) || aliases.some((a) => a.includes(want))) score = 50;
      return { e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 1 || (scored[0] && scored[0].score > (scored[1]?.score || 0))) return { event: scored[0].e };
  if (!scored.length && pool.length === 1) return { event: pool[0] };
  if (!scored.length) return { error: `Não achei o agendamento ${args.fromName}.` };
  return { error: 'Achei mais de um. Diga o nome completo de quem está no agendamento.' };
}

function findClientId(clients, name) {
  if (!name || isNameStop(name)) return null;
  return (findExactOrUnique(clients, name, 'name') || matchSpokenClient(name, clients))?.id || null;
}

export async function executeDockWrite(pending, finance) {
  const tool = String(pending?.tool || '');
  const args = pending?.args && typeof pending.args === 'object' ? pending.args : {};
  if (!tool) return { ok: false, error: 'Não tinha nada pendente para gravar.' };

  if (tool === 'need_params') {
    return { ok: false, error: args.message || pending?.message || 'Faltou um dado para alterar.' };
  }
  if (tool === 'create_client') {
    const name = clip(args.name || args.title || args.clientName);
    if (name.length < 2 || isNameStop(name)) return { ok: false, error: 'Faltou o nome do cliente.' };
    const existing = findClientId(finance?.clients, name);
    if (existing) return { ok: true, message: `O cliente ${name} já estava cadastrado.`, intent: 'create_client', uiAction: { type: 'open', target: 'clients' } };
    const id = await finance?.addClient?.({ name, nivel: 'orcamento', tipo: 'empresa', tags: [] });
    if (!id) return { ok: false, error: 'Não consegui cadastrar o cliente no banco.' };
    return { ok: true, message: `Cliente ${name} cadastrado.`, intent: 'create_client', uiAction: { type: 'open', target: 'clients' } };
  }

  if (tool === 'create_appointment') {
    const clientName = clip(args.clientName || args.name || (args.title && args.title !== 'Atendimento' && args.title !== 'Sessão' ? args.title : ''));
    const date = toAgendaBrDate(args.date || '');
    const time = String(args.time || '').trim() ? normalizeTime(args.time, '') : '';
    const durationMin = clampProcedureMin(args.durationMin);
    let timeEnd = '';
    if (time) timeEnd = ensureProcedureEnd(time, args.timeEnd, durationMin);
    const matched = args.clientId
      ? (finance?.clients || []).find((c) => String(c.id) === String(args.clientId))
      : (clientName && !isNameStop(clientName)
        ? (findExactOrUnique(finance?.clients, clientName, 'name') || matchSpokenClient(clientName, finance?.clients))
        : null);
    const who = matched?.name || (clientName && !isNameStop(clientName) ? clientName : '') || 'Sessão';
    if (!time) {
      return {
        ok: false,
        error: `Entendi ${who} em ${date}, mas faltou o horário. Diga a hora, por exemplo às 15, ou das 14 às 15.`,
      };
    }
    if (typeof finance?.addAgendaEvent !== 'function') {
      return { ok: false, error: 'Não consegui gravar na agenda agora.' };
    }
    const payload = {
      title: who,
      description: who,
      date,
      time,
      timeEnd,
      amount: 0,
      tipo: matched?.id ? 'empresa' : 'pessoal',
      type: 'meeting',
      clientId: matched?.id || null,
      status: 'pendente',
      preOrderItems: [],
    };
    let ev = await finance.addAgendaEvent(payload);
    if (!ev && payload.tipo === 'empresa') {
      ev = await finance.addAgendaEvent({ ...payload, tipo: 'pessoal' });
    }
    if (!ev) {
      return { ok: false, error: 'Não consegui gravar na agenda. Tente de novo.' };
    }
    const dur = timeEnd ? Math.max(MIN_PROCEDURE_MIN, timeToMinutes(timeEnd) - timeToMinutes(time)) : MIN_PROCEDURE_MIN;
    const span = timeEnd ? ` até ${timeEnd}` : '';
    const durLabel = ` (${dur} min)`;
    return {
      ok: true,
      message: `Agendei ${who} em ${date} às ${time}${span}${durLabel}.`,
      intent: 'create_appointment',
      uiAction: {
        type: 'form',
        target: 'agenda',
        openForm: true,
        editingEvent: { ...ev, clientName: who },
        date,
      },
    };
  }

  if (tool === 'create_product') {
    const name = clip(args.name);
    if (name.length < 2) return { ok: false, error: 'Faltou o nome do produto.' };
    await finance?.addProduct?.({ name, price: Number(args.price) || 0 });
    return { ok: true, message: `Produto ${name} cadastrado.`, intent: 'create_product' };
  }
  if (tool === 'create_service') {
    const name = clip(args.name);
    if (name.length < 2) return { ok: false, error: 'Faltou o nome do serviço.' };
    await finance?.addService?.({ name, price: Number(args.price) || 0 });
    return { ok: true, message: `Serviço ${name} cadastrado.`, intent: 'create_service' };
  }

  if (tool === 'update_client') {
    const found = findNamed(finance?.clients, args.fromName, 'name');
    if (!found?.id) return { ok: false, error: `Não achei o cliente ${args.fromName}.` };
    await finance.updateClient(found.id, { ...args.patch });
    return {
      ok: true,
      message: `Alterei o ${entityLabel('client')} ${found.name}.`,
      intent: 'update_client',
      uiAction: { type: 'open', target: 'clients' },
    };
  }
  if (tool === 'update_product') {
    const found = findNamed(finance?.products, args.fromName, 'name');
    if (!found?.id) return { ok: false, error: `Não achei o produto ${args.fromName}.` };
    await finance.updateProduct(found.id, { ...args.patch });
    return {
      ok: true,
      message: `Alterei o produto ${found.name}.`,
      intent: 'update_product',
      uiAction: { type: 'open', target: 'products' },
    };
  }
  if (tool === 'update_service') {
    const found = findNamed(finance?.services, args.fromName, 'name');
    if (!found?.id) return { ok: false, error: `Não achei o serviço ${args.fromName}.` };
    await finance.updateService(found.id, { ...args.patch });
    return {
      ok: true,
      message: `Alterei o serviço ${found.name}.`,
      intent: 'update_service',
      uiAction: { type: 'open', target: 'services' },
    };
  }
  if (tool === 'update_supplier') {
    const found = findNamed(finance?.suppliers, args.fromName, 'name');
    if (!found?.id) return { ok: false, error: `Não achei o fornecedor ${args.fromName}.` };
    await finance.updateSupplier(found.id, { ...args.patch });
    return {
      ok: true,
      message: `Alterei o fornecedor ${found.name}.`,
      intent: 'update_supplier',
      uiAction: { type: 'open', target: 'suppliers' },
    };
  }
  if (tool === 'update_appointment') {
    const foundWrap = findAppointment(finance?.agendaEvents, finance?.clients, args);
    if (foundWrap.error || !foundWrap.event?.id) return { ok: false, error: foundWrap.error || `Não achei o agendamento ${args.fromName}.` };
    const found = foundWrap.event;
    const nextName = clip(args.nextName || args.patch?.title || args.patch?.name);
    const patch = { ...(args.patch || {}) };
    delete patch.name;
    const durationMin = Number(patch.durationMin) || 0;
    delete patch.durationMin;
    const client = nextName ? findExactOrUnique(finance?.clients, nextName, 'name') : null;
    if (nextName) {
      patch.title = nextName;
      patch.description = nextName;
      if (client?.id) patch.clientId = client.id;
    }
    const start = patch.time || found.time;
    if (durationMin > 0 && start) {
      patch.time = start;
      patch.timeEnd = addMinutes(start, clampProcedureMin(durationMin));
    } else if (patch.time && !patch.timeEnd) {
      const oldDur = found.time && found.timeEnd
        ? Math.max(MIN_PROCEDURE_MIN, timeToMinutes(found.timeEnd) - timeToMinutes(found.time))
        : MIN_PROCEDURE_MIN;
      patch.timeEnd = addMinutes(patch.time, oldDur);
    } else if (start && patch.timeEnd && timeToMinutes(patch.timeEnd) < timeToMinutes(start) + MIN_PROCEDURE_MIN) {
      patch.timeEnd = addMinutes(start, MIN_PROCEDURE_MIN);
    }
    if (Object.keys(patch).length) {
      await finance.updateAgendaEvent(found.id, patch);
    }
    const updated = { ...found, ...patch, clientName: nextName || appointmentLabel({ ...found, ...patch }, finance?.clients) };
    const who = updated.clientName || updated.title;
    const miss = nextName && found.tipo === 'empresa' && !client?.id
      ? ' Não achei esse cliente na lista; escolha no formulário e confirme.'
      : '';
    const startLabel = updated.time || '';
    const endLabel = updated.timeEnd || '';
    const timeMsg = startLabel ? ` às ${startLabel}${endLabel ? ` até ${endLabel}` : ''}` : '';
    return {
      ok: true,
      message: nextName
        ? `Alterei o agendamento para ${who}${timeMsg}. Confira no formulário.${miss}`
        : (startLabel
          ? `Alterei o horário de ${who}${timeMsg}.`
          : `Abri o agendamento de ${who} no formulário. Confira e confirme.`),
      intent: 'update_appointment',
      uiAction: {
        type: 'form',
        target: 'agenda',
        openForm: true,
        editingEvent: updated,
        date: updated.date,
      },
    };
  }
  if (tool === 'update_task') {
    const found = findNamed(finance?.checkListItems, args.fromName, 'title');
    if (!found?.id) return { ok: false, error: `Não achei a tarefa ${args.fromName}.` };
    const patch = { ...args.patch };
    if (patch.name && !patch.title) patch.title = patch.name;
    delete patch.name;
    await finance.updateCheckListItem(found.id, patch);
    return {
      ok: true,
      message: `Alterei a tarefa ${found.title || args.fromName}.`,
      intent: 'update_task',
      uiAction: { type: 'open', target: 'tasks' },
    };
  }

  if (tool === 'delete_appointments') {
    const date = toAgendaBrDate(args.date || '');
    const ids = (args.ids || []).map((id) => String(id || '')).filter(Boolean);
    const label = (args.titles || []).filter(Boolean)[0] || 'o agendamento';
    if (!args.allDay && ids.length) {
      const remover = finance?.deleteAgendaEventsByIds || (async (list) => {
        let n = 0;
        for (const id of list) {
          const ok = await finance?.deleteAgendaEvent?.(id);
          if (ok) n += 1;
        }
        return n;
      });
      const removed = await remover(ids);
      if (!removed) {
        return { ok: false, error: `Não consegui excluir ${label}. Ele ainda está na agenda.` };
      }
      return {
        ok: true,
        message: removed === 1
          ? `Excluí ${label} da agenda.`
          : `Excluí ${removed} agendamentos da agenda.`,
        intent: 'delete_appointments',
        uiAction: { type: 'open', target: 'agenda' },
      };
    }
    if (typeof finance?.deleteAgendaEventsOnDate !== 'function') {
      return { ok: false, error: 'Não consegui apagar da agenda agora.' };
    }
    const removed = await finance.deleteAgendaEventsOnDate(date, ids);
    if (!removed) {
      return { ok: false, error: `Não achei agendamento em ${date} para cancelar.` };
    }
    return {
      ok: true,
      message: `Cancelei ${removed} agendamento${removed === 1 ? '' : 's'} de ${date} e excluí da agenda.`,
      intent: 'delete_appointments',
      uiAction: { type: 'open', target: 'agenda' },
    };
  }

  return { ok: false, error: 'Esse tipo de cadastro ainda não grava por aqui.' };
}
