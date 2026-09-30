/** Visual dos botões iguais à tabbar: fundo do card, borda neutra, ícone/texto secundários. */

export function chromeBtnColors(colors, active = false) {
  return {
    backgroundColor: active ? colors.chromeBtnActiveBg : colors.chromeBtnBg,
    borderColor: active ? colors.chromeBtnActiveBorder : colors.chromeBtnBorder,
    fg: active ? colors.chromeBtnActiveFg : colors.chromeBtnFg,
  };
}

/** Círculo sem fundo nem borda — só o ícone. O + da tabbar é a exceção. */
export function chromeGhostCircle(extra = {}) {
  return {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    ...extra,
  };
}

export function chromeBtnBox(colors, extra = {}) {
  const { active = false, ghost = true, ...rest } = extra;
  if (ghost) return chromeGhostCircle(rest);
  const c = chromeBtnColors(colors, active);
  return {
    backgroundColor: c.backgroundColor,
    borderColor: c.borderColor,
    borderWidth: 1,
    ...rest,
  };
}
