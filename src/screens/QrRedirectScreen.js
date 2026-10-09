import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { lookupDynamicQrTarget, padQrCode } from '../utils/dynamicQr';

export function QrRedirectScreen({ code }) {
  const [msg, setMsg] = useState('Abrindo o destino deste QR…');

  useEffect(() => {
    let alive = true;
    (async () => {
      const out = await lookupDynamicQrTarget(code);
      if (!alive) return;
      if (out.ok && out.url && typeof window !== 'undefined') {
        window.location.replace(out.url);
        return;
      }
      setMsg(out.error || `Não achei o QR ${padQrCode(code)}.`);
    })();
    return () => { alive = false; };
  }, [code]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', padding: 24 }}>
      <ActivityIndicator color="#38bdf8" />
      <Text style={{ color: '#e2e8f0', marginTop: 16, textAlign: 'center', fontSize: 16 }}>{msg}</Text>
    </View>
  );
}
