import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { DOCK_BLUE } from '../constants/brandColors';

const BARS = 40;

export function DockAudioGraph({ speaking = false, listening = false, analyzerRef, color = DOCK_BLUE }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let t = 0;

    const paint = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth || 520;
      const h = canvas.clientHeight || 108;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      t += speaking ? 0.24 : listening ? 0.13 : 0.05;
      const analyser = analyzerRef?.current;
      let bins = null;
      if (analyser && typeof analyser.getByteFrequencyData === 'function') {
        bins = new Uint8Array(analyser.frequencyBinCount || 64);
        analyser.getByteFrequencyData(bins);
      }

      const gap = 4;
      const barW = Math.max(4, (w - gap * (BARS - 1)) / BARS);
      const mid = h / 2;
      ctx.fillStyle = color;

      for (let i = 0; i < BARS; i += 1) {
        let amp;
        if (bins && bins.length) {
          const idx = Math.min(bins.length - 1, Math.round((i / BARS) * bins.length * 0.5) + 3);
          amp = bins[idx] / 255;
        } else if (speaking) {
          amp = 0.3 + Math.abs(Math.sin(t + i * 0.35)) * 0.68;
        } else if (listening) {
          amp = 0.14 + Math.abs(Math.sin(t * 0.95 + i * 0.2)) * 0.42;
        } else {
          amp = 0.07 + Math.abs(Math.sin(t * 0.35 + i * 0.12)) * 0.08;
        }
        const bh = Math.max(6, amp * (h - 8));
        const x = i * (barW + gap);
        ctx.globalAlpha = 0.4 + amp * 0.6;
        ctx.beginPath();
        const r = Math.min(barW / 2, 4);
        const y = mid - bh / 2;
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, barW, bh, r);
        } else {
          ctx.rect(x, y, barW, bh);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(paint);
    };
    rafRef.current = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(rafRef.current);
  }, [speaking, listening, analyzerRef, color]);

  if (Platform.OS !== 'web') {
    return <View style={styles.fallback} />;
  }

  return (
    <View style={styles.wrap}>
      {React.createElement('canvas', {
        ref: canvasRef,
        style: { width: '100%', height: '100%', display: 'block' },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 520, height: 108, alignSelf: 'center' },
  fallback: { height: 80 },
});
