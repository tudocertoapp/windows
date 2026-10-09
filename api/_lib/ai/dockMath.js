/** Contas do Dock: parser próprio, sem eval. Precisão em decimal (BigInt). */

const SCALE = 18n;
const TEN = 10n;
const WRITE_RE = /\b(cadastre|cadastrar|registre|registrar|agende|agendar|lance|lancar|lanca)\b/;
const ACCOUNT_RE = /\b(saldo|vendas?|despesa|cliente|agenda|produto|servico|fatur|receita|a receber)\b/;

function fold(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pow10(n) {
  return TEN ** BigInt(n);
}

function parseLocaleNumber(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const neg = s.startsWith('-');
  if (neg) s = s.slice(1);
  const [ip, fp = ''] = s.split('.');
  const frac = (fp + '0'.repeat(Number(SCALE))).slice(0, Number(SCALE));
  const v = BigInt(ip || '0') * pow10(SCALE) + BigInt(frac || '0');
  return neg ? -v : v;
}

function formatDec(v) {
  const neg = v < 0n;
  let n = neg ? -v : v;
  const ip = n / pow10(SCALE);
  let fp = (n % pow10(SCALE)).toString().padStart(Number(SCALE), '0').replace(/0+$/, '');
  if (fp.length > 12) {
    const cut = fp.slice(0, 12);
    const next = Number(fp[12] || '0');
    fp = next >= 5 ? String(BigInt(cut) + 1n).padStart(12, '0').replace(/0+$/, '') : cut.replace(/0+$/, '');
  }
  let out = fp ? `${ip.toString()},${fp}` : ip.toString();
  if (neg && out !== '0') out = `-${out}`;
  return out;
}

function add(a, b) { return a + b; }
function sub(a, b) { return a - b; }
function mul(a, b) { return (a * b) / pow10(SCALE); }
function div(a, b) {
  if (b === 0n) throw new Error('div0');
  return (a * pow10(SCALE)) / b;
}

function powInt(base, expN) {
  if (expN < 0 || expN > 80) throw new Error('pow');
  let r = pow10(SCALE);
  for (let i = 0; i < expN; i += 1) r = mul(r, base);
  return r;
}

function sqrtDec(a) {
  if (a < 0n) throw new Error('sqrt');
  if (a === 0n) return 0n;
  const scaled = a * pow10(SCALE);
  let x = scaled;
  for (let i = 0; i < 80; i += 1) {
    const nx = (x + scaled / x) / 2n;
    if (nx === x || nx + 1n === x || nx === x + 1n) return nx;
    x = nx;
  }
  return x;
}

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  const s = expr;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i += 1; continue; }
    if (c === '(') { tokens.push({ t: '(' }); i += 1; continue; }
    if (c === ')') { tokens.push({ t: ')' }); i += 1; continue; }
    if (c === '+' || c === '-' || c === '*' || c === '/' || c === '^' || c === '%') {
      tokens.push({ t: c }); i += 1; continue;
    }
    if (c === '√') { tokens.push({ t: 'sqrt' }); i += 1; continue; }
    if (s.slice(i, i + 4) === 'sqrt') { tokens.push({ t: 'sqrt' }); i += 4; continue; }
    const num = s.slice(i).match(/^\d[\d.]*(?:,\d+)?/);
    if (num) {
      let v = parseLocaleNumber(num[0]);
      if (v == null) throw new Error('num');
      i += num[0].length;
      while (/\s/.test(s[i])) i += 1;
      if (s[i] === '%') {
        v = div(v, parseLocaleNumber('100'));
        i += 1;
      }
      tokens.push({ t: 'n', v });
      continue;
    }
    throw new Error('token');
  }
  return tokens;
}

function parseExpr(tokens) {
  let i = 0;
  const peek = () => tokens[i];
  const take = () => tokens[i++];

  function primary() {
    const cur = peek();
    if (!cur) throw new Error('eof');
    if (cur.t === 'n') { take(); return cur.v; }
    if (cur.t === 'sqrt') {
      take();
      return sqrtDec(primary());
    }
    if (cur.t === '(') {
      take();
      const v = expr();
      if (!peek() || peek().t !== ')') throw new Error('paren');
      take();
      return v;
    }
    if (cur.t === '-') {
      take();
      return -primary();
    }
    if (cur.t === '+') {
      take();
      return primary();
    }
    throw new Error('primary');
  }

  function power() {
    let left = primary();
    while (peek() && peek().t === '^') {
      take();
      const right = power();
      const exp = Number(right / pow10(SCALE));
      if (!Number.isInteger(exp)) throw new Error('pow');
      left = powInt(left, exp);
    }
    return left;
  }

  function mulDiv() {
    let left = power();
    while (peek() && (peek().t === '*' || peek().t === '/')) {
      const op = take().t;
      const right = power();
      left = op === '*' ? mul(left, right) : div(left, right);
    }
    return left;
  }

  function expr() {
    let left = mulDiv();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = take().t;
      const right = mulDiv();
      left = op === '+' ? add(left, right) : sub(left, right);
    }
    return left;
  }

  const out = expr();
  if (i < tokens.length) throw new Error('trail');
  return out;
}

function evalExpr(expr) {
  const src = String(expr || '').trim();
  const addPct = src.match(/^(.*)([+\-])\s*([\d.,]+)\s*%\s*$/);
  if (addPct && addPct[1].trim()) {
    const base = evalExpr(addPct[1].trim());
    const part = mul(base, div(parseLocaleNumber(addPct[3]), parseLocaleNumber('100')));
    return addPct[2] === '+' ? add(base, part) : sub(base, part);
  }
  const tokens = tokenize(src.replace(/sqrt\s+/g, 'sqrt'));
  if (!tokens.length) throw new Error('empty');
  return parseExpr(tokens);
}

function extractExpr(raw) {
  let t = fold(raw);
  t = t
    .replace(/\b(quanto e|quanto da|quanto dá|calcula|calcule|calcular|faz a conta|faca a conta|faz a calculo|resultado de|me fala|me diga|por favor|pfv|dock)\b/g, ' ')
    .replace(/\b(a conta|o resultado|o valor)\b/g, ' ')
    .replace(/[?=]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const pctDe = t.match(/^([\d.,]+)\s*(?:%|por ?cento)\s+de\s+([\d.,]+)$/);
  if (pctDe) return `(${pctDe[1]} / 100) * ${pctDe[2]}`;

  const media = t.match(/^media(?:\s+de)?\s+(.+)$/);
  if (media) {
    const nums = media[1].split(/\s*(?:,|e)\s*/).map((x) => x.trim()).filter((x) => /^[\d.,]+$/.test(x));
    if (nums.length >= 2) return `(${nums.join(' + ')}) / ${nums.length}`;
  }

  const regra = t.match(/^([\d.,]+)\s+esta para\s+([\d.,]+)\s+assim como\s+([\d.,]+)\s+esta para(?:\s+x)?$/);
  if (regra) return `(${regra[2]} * ${regra[3]}) / ${regra[1]}`;

  t = t
    .replace(/\braiz quadrada de\b/g, 'sqrt ')
    .replace(/\braiz de\b/g, 'sqrt ')
    .replace(/\bao quadrado\b/g, ' ^ 2')
    .replace(/\bao cubo\b/g, ' ^ 3')
    .replace(/\belevado a\b/g, ' ^ ')
    .replace(/\bvezes\b/g, ' * ')
    .replace(/\bmultiplicad[oa] por\b/g, ' * ')
    .replace(/\bdividid[oa] por\b/g, ' / ')
    .replace(/\bmais\b/g, ' + ')
    .replace(/\bmenos\b/g, ' - ')
    .replace(/\bpor ?cento\b/g, ' % ')
    .replace(/[x×]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/\s+/g, ' ')
    .trim();

  t = t.replace(/[^0-9+\-*/^%().,sqrt\s√]/g, '');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

function wantsCalc(original) {
  const t = fold(original);
  if (!t) return false;
  if (/\b(abre|abrir|mostra|mostrar|quero abrir)\b/.test(t) && /\bcalculadora\b/.test(t)) return false;
  if (WRITE_RE.test(t)) return false;
  if (ACCOUNT_RE.test(t) && !/[\d][\s]*[+\-x×*/÷^%]/.test(original) && !/\b(calcula|calcule|quanto e \d)/.test(t)) return false;
  if (/\d/.test(t) && /\b(calcula|calcule|calcular|faz a conta|faca a conta|quanto da|quanto dá|quanto e|resultado de|raiz|elevado|por ?cento|media de|vezes|dividid[oa]|mais|menos|sqrt)\b/.test(t)) return true;
  if (/\d+\s*(?:%|por ?cento)\s*de\s*\d/.test(t)) return true;
  if (/^\s*[\d\s.,+\-x×*/÷^%()√]+$/.test(String(original)) && /[+\-x×*/÷^%√]/.test(String(original))) return true;
  if (/[\d][\s]*[+\-x×*/÷^%][\s]*[\d]/.test(String(original))) return true;
  return false;
}

function tryCalculate(message) {
  const original = String(message || '').trim();
  if (!wantsCalc(original)) return null;
  const expr = extractExpr(original);
  if (!expr || expr.length > 240) return null;
  if (!/\d/.test(expr)) return null;
  try {
    const v = evalExpr(expr.replace(/sqrt\s+/g, 'sqrt'));
    const shown = formatDec(v);
    return {
      message: `Resultado: ${shown}.`,
      intent: 'calculate',
      cards: [{ title: 'Resultado', value: shown }],
    };
  } catch (_) {
    return {
      message: 'Não consegui fechar essa conta. Diga a expressão, por exemplo 15% de 80, 2+2, raiz de 144 ou 10 vezes 3,5.',
      intent: 'calculate',
    };
  }
}

module.exports = { tryCalculate, wantsCalc };
