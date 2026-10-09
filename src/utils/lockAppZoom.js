/** Zoom do desktop: mínimo 67%, máximo 90%. Sem alterar o layout (só escala visual). */
export const DESKTOP_ZOOM_MIN = 0.67;
export const DESKTOP_ZOOM_MAX = 0.90;
export const DESKTOP_ZOOM_DEFAULT = 0.90;
const STORAGE_KEY = '@tudocerto_desktop_zoom';
const STEP = 0.05;

function isElectron() {
  return typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '');
}

function isMobileUserAgent() {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(navigator.userAgent);
}

function isDesktopWeb() {
  if (typeof window === 'undefined') return false;
  const w = window.innerWidth || 0;
  if (w < 768) return false;
  if (isMobileUserAgent() && w < 1100) return false;
  return true;
}

function clampZoom(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return DESKTOP_ZOOM_DEFAULT;
  return Math.min(DESKTOP_ZOOM_MAX, Math.max(DESKTOP_ZOOM_MIN, Math.round(v * 100) / 100));
}

function readStoredZoom() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DESKTOP_ZOOM_DEFAULT;
    return clampZoom(parseFloat(raw));
  } catch (_) {
    return DESKTOP_ZOOM_DEFAULT;
  }
}

function writeStoredZoom(factor) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(factor));
  } catch (_) {}
}

function clearHtmlZoomStyles() {
  const html = document.documentElement;
  const body = document.body;
  html.style.width = '';
  html.style.height = '';
  html.style.minHeight = '';
  html.style.transform = '';
  html.style.transformOrigin = '';
  html.style.overflow = '';
  if (body) {
    body.style.width = '';
    body.style.height = '';
    body.style.minHeight = '';
    body.style.overflow = '';
  }
}

function zoomTarget() {
  return document.getElementById('root') || document.documentElement;
}

function applyVisualZoom(factor) {
  clearHtmlZoomStyles();
  document.documentElement.style.zoom = '';
  document.documentElement.classList.remove('tc-desktop-zoom');
  const target = zoomTarget();
  if (!isDesktopWeb()) {
    if (target) target.style.zoom = '';
    return;
  }
  if (target) target.style.zoom = String(factor);
}

let zoomFrozen = false;

export function setDesktopZoomFrozen(frozen) {
  zoomFrozen = !!frozen;
}

const zoomListeners = new Set();

function notifyZoom(factor) {
  zoomListeners.forEach((cb) => {
    try { cb(factor); } catch (_) {}
  });
  try {
    window.dispatchEvent(new CustomEvent('tc:desktop-zoom', { detail: { factor } }));
  } catch (_) {}
}

export function getDesktopZoomFactor() {
  if (typeof window === 'undefined') return 1;
  if (!isDesktopWeb()) return 1;
  return readStoredZoom();
}

export function subscribeDesktopZoom(cb) {
  zoomListeners.add(cb);
  return () => zoomListeners.delete(cb);
}

export function isDesktopZoomEvent(event) {
  if (!event) return false;
  if (event.type === 'wheel' || event.type === 'mousewheel') {
    return !!(event.ctrlKey || event.metaKey);
  }
  if (event.type === 'gesturestart' || event.type === 'gesturechange') return true;
  if (event.type !== 'keydown' && event.type !== 'keyup' && event.type !== 'keypress') return false;
  return isZoomShortcut(event);
}

function isZoomShortcut(event) {
  if (!(event.ctrlKey || event.metaKey)) return false;
  const key = String(event.key || '');
  const code = String(event.code || '');
  return (
    key === '+' ||
    key === '-' ||
    key === '=' ||
    key === '_' ||
    key === '0' ||
    code === 'Equal' ||
    code === 'Minus' ||
    code === 'Digit0' ||
    code === 'NumpadAdd' ||
    code === 'NumpadSubtract' ||
    code === 'Numpad0'
  );
}

export function applyDesktopZoomLock() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (isElectron()) return () => {};

  let factor = readStoredZoom();
  applyVisualZoom(factor);

  const setFactor = (next) => {
    if (zoomFrozen) return;
    factor = clampZoom(next);
    writeStoredZoom(factor);
    applyVisualZoom(factor);
    notifyZoom(factor);
  };

  const onResize = () => applyVisualZoom(factor);
  window.addEventListener('resize', onResize);

  const block = (event) => {
    if (!isDesktopWeb()) return;
    if (event.type === 'wheel' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const dir = event.deltaY > 0 ? -STEP : STEP;
      setFactor(factor + dir);
      return;
    }
    if (event.type === 'keydown' && isZoomShortcut(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const key = String(event.key || '');
      const code = String(event.code || '');
      if (key === '0' || code === 'Digit0' || code === 'Numpad0') {
        setFactor(DESKTOP_ZOOM_DEFAULT);
        return;
      }
      const zoomOut = key === '-' || key === '_' || code === 'Minus' || code === 'NumpadSubtract';
      setFactor(factor + (zoomOut ? -STEP : STEP));
    }
    if (event.type === 'gesturestart' || event.type === 'gesturechange') {
      event.preventDefault();
    }
  };

  window.addEventListener('wheel', block, { capture: true, passive: false });
  window.addEventListener('keydown', block, { capture: true });
  document.addEventListener('gesturestart', block, { capture: true });
  document.addEventListener('gesturechange', block, { capture: true });

  return () => {
    window.removeEventListener('resize', onResize);
    window.removeEventListener('wheel', block, { capture: true });
    window.removeEventListener('keydown', block, { capture: true });
    document.removeEventListener('gesturestart', block, { capture: true });
    document.removeEventListener('gesturechange', block, { capture: true });
  };
}
