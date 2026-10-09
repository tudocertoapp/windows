import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { lookupDynamicQrTarget, padQrCode } from '../utils/dynamicQr';

export function QrRedirectScreen({ code }) {
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const c = padQrCode(code);
    if (!c) {
      setMsg('Número do QR inválido.');
      return undefined;
    }

    let alive = true;
    window.location.replace(`/api/qr/go?code=${encodeURIComponent(c)}`);

    const fallback = setTimeout(() => {
      lookupDynamicQrTarget(c).then((out) => {
        if (!alive) return;
        if (out.ok && out.url) {
          window.location.replace(out.url);
          return;
        }
        setMsg(out.error || `Não achei o QR ${c}.`);
      });
    }, 2500);

    return () => {
      alive = false;
      clearTimeout(fallback);
    };
  }, [code]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', padding: 24 }}>
      {msg ? (
        <Text style={{ color: '#e2e8f0', textAlign: 'center', fontSize: 16 }}>{msg}</Text>
      ) : null}
    </View>
  );
}
