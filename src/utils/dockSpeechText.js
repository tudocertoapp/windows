/** Limpa fala repetida e texto para a voz não ler símbolo. */

export function collapseRepeats(raw) {
  let t = String(raw || '')
    .replace(/[\u00a0\u2000-\u200b]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return '';
  const words = t.split(' ');
  const n = words.length;
  if (n >= 2) {
    for (let size = 1; size <= Math.min(12, Math.floor(n / 2)); size += 1) {
      const times = Math.floor(n / size);
      if (times < 2) continue;
      const unit = words.slice(0, size);
      let cyclic = true;
      for (let i = 0; i < times * size; i += 1) {
        if (words[i].toLowerCase() !== unit[i % size].toLowerCase()) {
          cyclic = false;
          break;
        }
      }
      if (cyclic) return unit.join(' ');
    }
  }
  t = t.replace(/\b(\S+)(\s+\1\b)+/gi, '$1');
  for (let size = 8; size >= 2; size -= 1) {
    const re = new RegExp(`((?:\\S+\\s+){${size - 1}}\\S+)(?:\\s+\\1)+`, 'gi');
    t = t.replace(re, '$1');
  }
  return t.trim();
}

export function mergeHeard(prev, next) {
  const a = collapseRepeats(prev);
  const b = collapseRepeats(next);
  if (!a) return b;
  if (!b) return a;
  if (b.toLowerCase() === a.toLowerCase()) return a;
  if (b.toLowerCase().includes(a.toLowerCase()) && collapseRepeats(b) !== b) return collapseRepeats(b);
  return collapseRepeats(b);
}

export function forVoice(raw) {
  let t = String(raw || '');
  t = t.replace(/```[\s\S]*?```/g, ' ');
  t = t.replace(/[#*_`>~\[\]{}|\\]/g, ' ');
  t = t.replace(/\b(hashtag|cerquilha|jogo da velha|asterisco|underline|arroba)\b/gi, ' ');
  t = t.replace(/https?:\/\/\S+/gi, ' ');
  t = t.replace(/\bvc\b/gi, 'você');
  t = t.replace(/\bblz\b/gi, '');
  t = t.replace(/\btd\b/gi, 'tudo');
  t = t.replace(/\bpq\b/gi, 'porque');
  t = t.replace(/\btb\b/gi, 'também');
  t = t.replace(/\btô\b/gi, 'estou');
  t = t.replace(/\btá\b/gi, 'está');
  t = t.replace(/\s+/g, ' ').trim();
  return collapseRepeats(t);
}

export function nowInSaoPaulo() {
  const now = new Date();
  const date = now.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = now.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });
  return { date, time, iso: now.toISOString() };
}
