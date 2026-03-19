/**
 * Calculadora profissional - Parser seguro de expressões matemáticas
 * Suporta: +, -, *, /, % (percentual), parênteses, decimais
 * % como em calculadora normal: 100+10%=110, 10%=0.1
 * NUNCA usa eval - 100% seguro contra código malicioso
 */

export const CALC_ERROR = 'Erro';

/** Regex para validar expressão: apenas números, operadores e parênteses */
const SAFE_EXPRESSION_REGEX = /^[\d\s.,+\-*\/%()]+$/;

/**
 * Expande % (percentual) antes do parser.
 * - 100+10% → 100+10 (10% de 100)
 * - 100-10% → 100-10
 * - 10% → 0.1
 * - 100*10% → 100*0.1
 */
function expandPercentages(expr: string): string {
  let e = expr.trim().replace(/,/g, '.');
  if (!e.includes('%')) return e;

  // Padrão: algo + N% ou algo - N% (percentual do valor anterior)
  const plusMinusPct = e.match(/^(.+?)([+\-])(\d*\.?\d+)\s*%\s*$/);
  if (plusMinusPct) {
    const prefix = plusMinusPct[1].trim();
    const op = plusMinusPct[2];
    const pctVal = parseFloat(plusMinusPct[3]);
    if (Number.isFinite(pctVal) && prefix) {
      const baseResult = calculateExpressionInternal(prefix);
      if (baseResult !== CALC_ERROR) {
        const base = parseFloat(String(baseResult).replace(/,/g, '.'));
        if (Number.isFinite(base)) {
          const pctOfBase = (base * pctVal) / 100;
          const expanded = `${prefix}${op}${pctOfBase}`;
          return expandPercentages(expanded);
        }
      }
    }
  }

  // Padrão: N% (standalone ou antes de operador) → N/100
  e = e.replace(/(\d*\.?\d+)\s*%/g, (_, num) => {
    const n = parseFloat(num);
    return Number.isFinite(n) ? String(n / 100) : num + '%';
  });

  return e;
}

/** Precisão máxima de casas decimais no resultado */
const MAX_DECIMAL_PLACES = 12;

type TokenType = 'NUMBER' | 'ADD' | 'SUB' | 'MUL' | 'DIV' | 'LPAREN' | 'RPAREN';

interface Token {
  type: TokenType;
  value: string | number;
}

/** Remove espaços e normaliza vírgula para ponto */
function normalizeExpression(expr: string): string {
  return expr.trim().replace(/,/g, '.');
}

/** Valida expressão contra caracteres não permitidos */
function isValidExpression(expr: string): boolean {
  if (!expr || typeof expr !== 'string') return false;
  const normalized = normalizeExpression(expr);
  return SAFE_EXPRESSION_REGEX.test(normalized) && normalized.length <= 200;
}

/** Converte string em tokens */
function tokenize(expr: string): Token[] {
  const normalized = normalizeExpression(expr);
  const tokens: Token[] = [];
  let i = 0;

  while (i < normalized.length) {
    const char = normalized[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (char === '(') {
      const prev = tokens[tokens.length - 1];
      if (prev?.type === 'NUMBER') {
        tokens.push({ type: 'MUL', value: '*' });
      }
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }

    if (/[+\/*]/.test(char)) {
      const type = char === '+' ? 'ADD' : char === '-' ? 'SUB' : char === '*' ? 'MUL' : 'DIV';
      tokens.push({ type, value: char });
      i++;
      continue;
    }

    if (char === '%') {
      i++;
      continue;
    }

    if (char === '-') {
      const prev = tokens[tokens.length - 1];
      const isUnary = !prev || prev.type === 'LPAREN' || prev.type === 'ADD' || prev.type === 'SUB' || prev.type === 'MUL' || prev.type === 'DIV';
      if (isUnary) {
        tokens.push({ type: 'NUMBER', value: 0 });
        tokens.push({ type: 'SUB', value: '-' });
      } else {
        tokens.push({ type: 'SUB', value: '-' });
      }
      i++;
      continue;
    }

    if (/\d/.test(char) || char === '.') {
      let numStr = '';
      while (i < normalized.length && /[\d.]/.test(normalized[i])) {
        if (normalized[i] === '.' && numStr.includes('.')) break;
        numStr += normalized[i];
        i++;
      }
      const num = parseFloat(numStr);
      if (Number.isNaN(num)) return [];
      tokens.push({ type: 'NUMBER', value: num });
      continue;
    }

    i++;
  }

  return tokens;
}

/** Precedência dos operadores (maior = prioridade maior) */
function precedence(op: TokenType): number {
  switch (op) {
    case 'ADD':
    case 'SUB':
      return 1;
    case 'MUL':
    case 'DIV':
      return 2;
    default:
      return 0;
  }
}

/** Converte infix para RPN (notação polonesa reversa) - Shunting-yard */
function toRPN(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const ops: Token[] = [];

  for (const t of tokens) {
    if (t.type === 'NUMBER') {
      output.push(t);
    } else if (t.type === 'LPAREN') {
      ops.push(t);
    } else if (t.type === 'RPAREN') {
      while (ops.length > 0 && ops[ops.length - 1].type !== 'LPAREN') {
        output.push(ops.pop()!);
      }
      if (ops.length > 0) ops.pop();
    } else if (t.type === 'ADD' || t.type === 'SUB' || t.type === 'MUL' || t.type === 'DIV') {
      const prec = precedence(t.type);
      while (ops.length > 0 && ops[ops.length - 1].type !== 'LPAREN' && precedence(ops[ops.length - 1].type as TokenType) >= prec) {
        output.push(ops.pop()!);
      }
      ops.push(t);
    }
  }

  while (ops.length > 0) {
    const op = ops.pop()!;
    if (op.type === 'LPAREN') return [];
    output.push(op);
  }

  return output;
}

/** Avalia RPN e retorna resultado */
function evaluateRPN(rpn: Token[]): number {
  const stack: number[] = [];

  for (const t of rpn) {
    if (t.type === 'NUMBER') {
      stack.push(Number(t.value));
      continue;
    }

    if (stack.length < 2) return NaN;

    const b = stack.pop()!;
    const a = stack.pop()!;

    let result: number;
    switch (t.type) {
      case 'ADD':
        result = a + b;
        break;
      case 'SUB':
        result = a - b;
        break;
      case 'MUL':
        result = a * b;
        break;
      case 'DIV':
        if (b === 0) return Infinity;
        result = a / b;
        break;
      default:
        return NaN;
    }
    stack.push(result);
  }

  return stack.length === 1 ? stack[0]! : NaN;
}

/** Formata resultado com precisão controlada */
function formatResult(value: number): string {
  if (!Number.isFinite(value) || Number.isNaN(value)) return CALC_ERROR;
  const fixed = Number(value.toFixed(MAX_DECIMAL_PLACES));
  const str = String(fixed);
  if (str.includes('e')) return value.toExponential(6);
  // Remove zeros apenas na parte decimal (ex.: 12.3400 -> 12.34), sem quebrar inteiros (300 -> 300)
  if (!str.includes('.')) return str;
  return str.replace(/\.?0+$/, '');
}

/**
 * Calcula expressão matemática de forma segura.
 * @param expression - String com a expressão (ex: "10 + 5 * 3 - 2 / 4")
 * @returns Resultado como string ou "Erro" se inválida
 */
function calculateExpressionInternal(expression: string): string {
  if (!expression || typeof expression !== 'string') return CALC_ERROR;
  const normalized = expression.trim().replace(/,/g, '.');
  if (!SAFE_EXPRESSION_REGEX.test(normalized) || normalized.length > 200) return CALC_ERROR;

  const expanded = expandPercentages(expression);
  const tokens = tokenize(expanded);
  if (tokens.length === 0) return CALC_ERROR;

  const rpn = toRPN(tokens);
  if (rpn.length === 0) return CALC_ERROR;

  const result = evaluateRPN(rpn);

  if (result === Infinity || result === -Infinity || Number.isNaN(result)) {
    return CALC_ERROR;
  }

  return formatResult(result);
}

export function calculateExpression(expression: string): string {
  return calculateExpressionInternal(expression);
}
