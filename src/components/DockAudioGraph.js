import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { DOCK_BLUE } from '../constants/brandColors';
import { getDockAnalyser } from '../utils/dockAudioPulse';
import { fitDockCanvas } from '../utils/dockCanvas';

const BARS = 40;

export function DockAudioGraph({ speaking = false, listening = false, analyzerRef, color = DOCK_BLUE, height = 108 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let t = 0;

    const paint = () => {
      const cssW = canvas.clientWidth || 520;
      const cssH = height || canvas.clientHeight || 108;
      const { ctx, w, h } = fitDockCanvas(canvas, cssW, cssH, 'bars');
      ctx.clearRect(0, 0, w, h);

      t += speaking ? 0.24 : listening ? 0.13 : 0.05;
      const analyser = analyzerRef?.current || getDockAnalyser();
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
        const synth = speaking
          ? 0.3 + Math.abs(Math.sin(t + i * 0.35)) * 0.68
          : listening
            ? 0.14 + Math.abs(Math.sin(t * 0.95 + i * 0.2)) * 0.42
            : 0.07 + Math.abs(Math.sin(t * 0.35 + i * 0.12)) * 0.08;
        let mic = 0;
        if (bins && bins.length) {
          const idx = Math.min(bins.length - 1, Math.round((i / BARS) * bins.length * 0.5) + 3);
          mic = bins[idx] / 255;
        }
        const amp = mic > 0.05 ? Math.max(synth * 0.4, mic) : synth;
        const bh = Math.max(6, amp * (h - 8));
        const x = i * (barW + gap);
        ctx.globalAlpha = 0.4 + amp * 0.6;
        ctx.beginPath();
        const r = Math.min(barW / 2, 4);
        const y = mid - bh / 2;
        if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, barW, bh, r);
        else {
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + barW, y, x + barW, y + bh, r);
          ctx.arcTo(x + barW, y + bh, x, y + bh, r);
          ctx.arcTo(x, y + bh, x, y, r);
          ctx.arcTo(x, y, x + barW, y, r);
          ctx.closePath();
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(paint);
    };
    rafRef.current = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(rafRef.current);
  }, [speaking, listening, analyzerRef, color, height]);

  if (Platform.OS !== 'web') {
    return <View style={styles.fallback} />;
  }

  return (
    <View style={[styles.wrap, { height }]}>
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
