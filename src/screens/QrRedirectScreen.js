import { useEffect } from 'react';
import { padQrCode } from '../utils/dynamicQr';

/** Fallback se o rewrite da Vercel / o script do index.html não pegarem o /q/. */
export function QrRedirectScreen({ code }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const c = padQrCode(code);
    if (!c) return;
    window.location.replace(`/api/qr/go?code=${encodeURIComponent(c)}`);
  }, [code]);

  return null;
}
