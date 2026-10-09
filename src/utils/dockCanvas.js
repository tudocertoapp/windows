/** Canvas 2D no padrão do Chrome: 1 px de dispositivo, sem fios extras no Opera. */

export function canvasDpr() {
  if (typeof window === 'undefined') return 1;
  const n = Number(window.devicePixelRatio) || 1;
  return Math.max(1, Math.min(3, n));
}

export function fitDockCanvas(canvas, cssW, cssH, mode = 'sphere') {
  const dpr = canvasDpr();
  const w = Math.max(1, Math.round(Number(cssW) || 1));
  const h = Math.max(1, Math.round(Number(cssH) || 1));
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  if (canvas.width !== bw) canvas.width = bw;
  if (canvas.height !== bh) canvas.height = bh;
  const ctx = canvas.getContext('2d', { alpha: true }) || canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  if (mode === 'bars') {
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  } else {
    ctx.imageSmoothingEnabled = false;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 2;
    ctx.lineWidth = 1 / dpr;
  }
  if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
  return { ctx, w, h, dpr };
}

export function isOperaBrowser() {
  if (typeof navigator === 'undefined') return false;
  return /OPR\/|Opera/i.test(navigator.userAgent || '');
}

export function chromeHair(dpr) {
  const n = Math.max(1, Number(dpr) || 1);
  if (isOperaBrowser()) return Math.max(0.55, 1.2 / n);
  return Math.max(1.05, 1.35 / n);
}

export function chromeDot(dpr, css = 0.9) {
  const px = 1.15 / Math.max(1, Number(dpr) || 1);
  return Math.max(Number(css) || 0.9, px);
}
