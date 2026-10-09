import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { DOCK_BLUE } from '../constants/brandColors';
import { resolveDockSpectrum } from '../constants/dockSpectrums';
import { readDockAudio } from '../utils/dockAudioPulse';
import { chromeDot, chromeHair, fitDockCanvas } from '../utils/dockCanvas';

let drawDpr = 1;

const COUNT = 220;

function fibSphere(n) {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i += 1) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
  }
  return pts;
}

function rotProject(p, scale, cosY, sinY, cosX, sinX, cx, cy, radius) {
  const s = Math.min(1.18, Number(scale) || 1);
  let x = p.x * s;
  let y = p.y * s;
  let z = p.z * s;
  const xz = x * cosY - z * sinY;
  z = z * cosY + x * sinY;
  x = xz;
  const yz = y * cosX - z * sinX;
  z = z * cosX + y * sinX;
  y = yz;
  const k = 1.05 / Math.max(1.45, z + 2.5);
  return {
    sx: cx + x * k * radius,
    sy: cy + y * k * radius,
    z,
  };
}

function glowBall(ctx, cx, cy, radius, energy, maxR) {
  const reach = Math.min(maxR, radius * 1.08);
  const glow = ctx.createRadialGradient(cx, cy, reach * 0.08, cx, cy, reach);
  glow.addColorStop(0, `rgba(0, 180, 255, ${0.12 + energy * 0.22})`);
  glow.addColorStop(0.55, `rgba(0, 120, 220, ${0.05 + energy * 0.08})`);
  glow.addColorStop(1, 'rgba(0, 40, 80, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, reach, 0, Math.PI * 2);
  ctx.fill();
}

function paintMalha(ctx, pts, t, audio, energy, live, cx, cy, radius, rot) {
  const projected = [];
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const lat = Math.acos(Math.max(-1, Math.min(1, p.y)));
    const lon = Math.atan2(p.z, p.x);
    const wave = Math.sin(lat * 4.2 + t * 1.35) * (0.055 + audio.low * 0.28)
      + Math.cos(lon * 5.1 + t * 0.95) * (0.045 + audio.mid * 0.24)
      + Math.sin(lat * 7.4 + lon * 3.1 + t * 1.7) * (0.035 + audio.high * 0.2);
    const scale = (1 + Math.sin(t * 1.1) * 0.03 + energy * 0.38 + wave) * (live ? 1 : 0.92);
    const q = rotProject(p, scale, rot.cosY, rot.sinY, rot.cosX, rot.sinX, cx, cy, radius);
    q.a = 0.18 + (q.z + 1.2) * 0.28 + energy * 0.25;
    projected.push(q);
  }
  for (let i = 0; i < projected.length; i += 1) {
    const p = projected[i];
    ctx.globalAlpha = Math.max(0.4, Math.min(0.95, p.a));
    ctx.fillStyle = energy > 0.35 ? '#7AE2FF' : DOCK_BLUE;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, chromeDot(drawDpr, 0.85 + Math.max(0, p.z) * 0.32 + audio.rms * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function paintNuvem(ctx, pts, t, audio, energy, live, cx, cy, radius, rot) {
  for (let i = 0; i < pts.length; i += 2) {
    const p = pts[i];
    const lat = Math.acos(Math.max(-1, Math.min(1, p.y)));
    const lon = Math.atan2(p.z, p.x);
    const wave = Math.sin(lat * 6 + t * 1.6) * (0.08 + audio.low * 0.4)
      + Math.cos(lon * 4 + t) * (0.06 + audio.mid * 0.32);
    const scale = (1.02 + energy * 0.42 + wave) * (live ? 1 : 0.9);
    const q = rotProject(p, scale, rot.cosY, rot.sinY, rot.cosX, rot.sinX, cx, cy, radius);
    const shade = Math.max(0.18, Math.min(1, 0.28 + (q.z + 1.1) * 0.4 + energy * 0.25));
    ctx.globalAlpha = shade;
    ctx.fillStyle = q.z > 0.2 ? '#9AE8FF' : DOCK_BLUE;
    ctx.beginPath();
    ctx.arc(q.sx, q.sy, chromeDot(drawDpr, 0.48 + audio.rms * 0.7 + Math.max(0, q.z) * 0.32), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function paintAneis(ctx, t, audio, energy, cx, cy, radius, rot) {
  const rings = 16;
  for (let i = 0; i < rings; i += 1) {
    const u = (i / (rings - 1)) * 2 - 1;
    const wobble = Math.sin(t * 1.4 + i * 0.45) * (0.04 + audio.mid * 0.18);
    const rr = Math.sqrt(Math.max(0.04, 1 - u * u)) * (1 + energy * 0.28 + wobble);
    const y = u * (1 + audio.low * 0.2);
    const p0 = rotProject({ x: rr, y, z: 0 }, 1, rot.cosY, rot.sinY, rot.cosX, rot.sinX, cx, cy, radius);
    const p1 = rotProject({ x: 0, y, z: rr }, 1, rot.cosY, rot.sinY, rot.cosX, rot.sinX, cx, cy, radius);
    ctx.strokeStyle = `rgba(0, 180, 255, ${0.18 + energy * 0.45})`;
    ctx.lineWidth = 1 + energy * 1.4;
    ctx.beginPath();
    ctx.ellipse(cx, (p0.sy + p1.sy) / 2, Math.abs(p0.sx - cx), Math.max(4, Math.abs(p1.sy - cy) * 0.35 + 6), rot.cosY * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function paintOrbita(ctx, pts, t, audio, energy, cx, cy, radius, rot) {
  paintNuvem(ctx, pts.filter((_, i) => i % 3 === 0), t, audio, energy * 0.7, true, cx, cy, radius * 0.72, rot);
  const tilts = [0.2, 0.9, 1.5];
  tilts.forEach((tilt, idx) => {
    ctx.strokeStyle = `rgba(0, 180, 255, ${0.35 + energy * 0.4})`;
    ctx.lineWidth = 1.2 + energy;
    ctx.beginPath();
    const steps = 80;
    for (let i = 0; i <= steps; i += 1) {
      const a = (i / steps) * Math.PI * 2 + t * (0.6 + idx * 0.2);
      const p = rotProject(
        { x: Math.cos(a), y: Math.sin(a) * Math.sin(tilt), z: Math.sin(a) * Math.cos(tilt) },
        1.05 + energy * 0.25 + Math.sin(t * 2 + idx) * 0.04,
        rot.cosY,
        rot.sinY,
        rot.cosX,
        rot.sinX,
        cx,
        cy,
        radius
      );
      if (i === 0) ctx.moveTo(p.sx, p.sy);
      else ctx.lineTo(p.sx, p.sy);
    }
    ctx.stroke();
  });
}

function paintPulso(ctx, t, audio, energy, cx, cy, maxR) {
  const core = maxR * (0.4 + energy * 0.08 + Math.sin(t * 2.2) * 0.02);
  const g = ctx.createRadialGradient(cx - core * 0.18, cy - core * 0.22, core * 0.06, cx, cy, core);
  g.addColorStop(0, `rgba(230, 250, 255, ${0.85 + energy * 0.15})`);
  g.addColorStop(0.22, `rgba(80, 210, 255, ${0.7 + energy * 0.2})`);
  g.addColorStop(0.58, `rgba(0, 160, 255, ${0.45 + energy * 0.25})`);
  g.addColorStop(1, 'rgba(0, 40, 90, 0.02)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, core, 0, Math.PI * 2);
  ctx.fill();
  for (let k = 0; k < 5; k += 1) {
    ctx.strokeStyle = `rgba(160, 235, 255, ${0.55 + energy * 0.35 - k * 0.07})`;
    ctx.lineWidth = 2.2 - k * 0.2;
    ctx.beginPath();
    const waves = 96;
    const base = maxR * (0.52 + k * 0.09);
    for (let i = 0; i <= waves; i += 1) {
      const a = (i / waves) * Math.PI * 2;
      const bump = 1 + Math.sin(a * (4 + k) + t * 2.1) * (0.05 + audio.mid * 0.1)
        + Math.cos(a * (7 + k * 0.5) - t * 1.4) * (0.03 + audio.high * 0.06);
      const rr = Math.min(maxR * 0.98, base * bump);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
}

function paintGrade(ctx, t, audio, energy, cx, cy, radius, rot) {
  const lats = 12;
  const lons = 16;
  ctx.strokeStyle = `rgba(0, 180, 255, ${0.28 + energy * 0.4})`;
  ctx.lineWidth = chromeHair(drawDpr);
  for (let i = 1; i < lats; i += 1) {
    const lat = (i / lats) * Math.PI;
    ctx.beginPath();
    for (let j = 0; j <= 48; j += 1) {
      const lon = (j / 48) * Math.PI * 2;
      const wave = 1 + Math.sin(lat * 4 + lon * 3 + t) * (0.04 + audio.low * 0.16);
      const p = rotProject(
        { x: Math.sin(lat) * Math.cos(lon), y: Math.cos(lat), z: Math.sin(lat) * Math.sin(lon) },
        wave + energy * 0.22,
        rot.cosY,
        rot.sinY,
        rot.cosX,
        rot.sinX,
        cx,
        cy,
        radius
      );
      if (j === 0) ctx.moveTo(p.sx, p.sy);
      else ctx.lineTo(p.sx, p.sy);
    }
    ctx.stroke();
  }
  for (let i = 0; i < lons; i += 1) {
    const lon = (i / lons) * Math.PI * 2;
    ctx.beginPath();
    for (let j = 0; j <= 36; j += 1) {
      const lat = (j / 36) * Math.PI;
      const wave = 1 + Math.cos(lat * 5 + t * 1.2) * (0.04 + audio.high * 0.14);
      const p = rotProject(
        { x: Math.sin(lat) * Math.cos(lon), y: Math.cos(lat), z: Math.sin(lat) * Math.sin(lon) },
        wave + energy * 0.22,
        rot.cosY,
        rot.sinY,
        rot.cosX,
        rot.sinX,
        cx,
        cy,
        radius
      );
      if (j === 0) ctx.moveTo(p.sx, p.sy);
      else ctx.lineTo(p.sx, p.sy);
    }
    ctx.stroke();
  }
}

function paintHolograma(ctx, pts, t, audio, energy, live, cx, cy, radius, rot) {
  paintMalha(ctx, pts, t, audio, energy, live, cx, cy, radius, rot);
  const scanY = cy - radius * 0.9 + ((t * 40) % (radius * 1.8));
  ctx.fillStyle = `rgba(0, 220, 255, ${0.08 + energy * 0.12})`;
  ctx.fillRect(cx - radius * 0.9, scanY, radius * 1.8, 6);
  ctx.strokeStyle = `rgba(0, 180, 255, ${0.45 + energy * 0.4})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy);
  ctx.lineTo(cx + 10, cy);
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx, cy + 10);
  ctx.stroke();
}

function paintRadar(ctx, t, audio, energy, cx, cy, radius) {
  const r = radius * 0.94;
  ctx.strokeStyle = 'rgba(0, 180, 255, 0.28)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i += 1) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * (i / 4), 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }
  const sweep = t * 2.2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, sweep, sweep + 0.7);
  ctx.closePath();
  ctx.fillStyle = `rgba(0, 200, 255, ${0.12 + energy * 0.22})`;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = DOCK_BLUE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(sweep) * r, cy + Math.sin(sweep) * r);
  ctx.stroke();
  const blips = 10;
  for (let i = 0; i < blips; i += 1) {
    const ang = i * 2.399 + t * 0.2;
    const dist = (0.2 + ((audio.low + audio.mid + i * 0.07) % 1) * 0.75) * r;
    ctx.fillStyle = `rgba(150, 230, 255, ${0.4 + energy * 0.5})`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, 1.1 + audio.rms * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintNucleo(ctx, t, audio, energy, cx, cy, radius) {
  const core = radius * (0.22 + energy * 0.18);
  const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, core * 2.2);
  g.addColorStop(0, '#E8FBFF');
  g.addColorStop(0.4, DOCK_BLUE);
  g.addColorStop(1, 'rgba(0, 80, 160, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, core * 2.2, 0, Math.PI * 2);
  ctx.fill();
  const beams = 18;
  for (let i = 0; i < beams; i += 1) {
    const a = (i / beams) * Math.PI * 2 + t * 0.4;
    const len = radius * (0.55 + (i % 3 === 0 ? audio.low : i % 3 === 1 ? audio.mid : audio.high) * 0.38);
    ctx.strokeStyle = `rgba(0, 200, 255, ${0.22 + energy * 0.45})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * core, cy + Math.sin(a) * core);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    ctx.stroke();
  }
}

function paintVoxel(ctx, pts, t, audio, energy, live, cx, cy, radius, rot) {
  for (let i = 0; i < pts.length; i += 3) {
    const p = pts[i];
    const lat = Math.acos(Math.max(-1, Math.min(1, p.y)));
    const wave = 1 + Math.sin(lat * 5 + t * 1.4) * (0.05 + audio.mid * 0.2);
    const q = rotProject(p, (wave + energy * 0.3) * (live ? 1 : 0.92), rot.cosY, rot.sinY, rot.cosX, rot.sinX, cx, cy, radius);
    const s = 1.15 + audio.rms * 1.4 + Math.max(0, q.z) * 0.55;
    ctx.globalAlpha = Math.max(0.15, Math.min(0.9, 0.25 + (q.z + 1) * 0.35));
    ctx.fillStyle = q.z > 0 ? '#7AE2FF' : DOCK_BLUE;
    ctx.fillRect(q.sx - s / 2, q.sy - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}

function paintCircuito(ctx, t, audio, energy, cx, cy, radius, rot) {
  paintGrade(ctx, t, audio, energy * 0.55, cx, cy, radius, rot);
  const nodes = 24;
  for (let i = 0; i < nodes; i += 1) {
    const lat = ((i * 7) % 11) / 11 * Math.PI;
    const lon = ((i * 5) % 17) / 17 * Math.PI * 2 + t * 0.15;
    const p = rotProject(
      { x: Math.sin(lat) * Math.cos(lon), y: Math.cos(lat), z: Math.sin(lat) * Math.sin(lon) },
      1.02 + energy * 0.2,
      rot.cosY,
      rot.sinY,
      rot.cosX,
      rot.sinX,
      cx,
      cy,
      radius
    );
    ctx.fillStyle = i % 4 === 0 ? '#D6F7FF' : DOCK_BLUE;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, 1.05 + audio.rms * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(0, 180, 255, ${0.35 + energy * 0.3})`;
    ctx.strokeRect(p.sx - 5, p.sy - 5, 10, 10);
  }
}

function paintHex(ctx, t, audio, energy, cx, cy, radius) {
  const r = radius * 0.9;
  const size = 11 + energy * 6;
  const h = size * Math.sqrt(3);
  ctx.strokeStyle = `rgba(0, 180, 255, ${0.28 + energy * 0.4})`;
  ctx.lineWidth = 1;
  for (let row = -8; row <= 8; row += 1) {
    for (let col = -8; col <= 8; col += 1) {
      const x = cx + col * size * 1.55 + (row % 2 ? size * 0.77 : 0);
      const y = cy + row * h * 0.9;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r * r) continue;
      const pulse = 1 + Math.sin(t * 2 + col * 0.4 + row * 0.3) * 0.08 * audio.mid;
      ctx.beginPath();
      for (let k = 0; k < 6; k += 1) {
        const a = (Math.PI / 3) * k + t * 0.05;
        const px = x + Math.cos(a) * size * 0.52 * pulse;
        const py = y + Math.sin(a) * size * 0.52 * pulse;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
}

function paintNeural(ctx, pts, t, audio, energy, live, cx, cy, radius, rot) {
  const nodes = [];
  for (let i = 0; i < pts.length; i += 6) {
    const p = pts[i];
    const wave = 1 + Math.sin(t * 1.5 + i) * (0.04 + audio.high * 0.14);
    nodes.push(rotProject(p, (wave + energy * 0.28) * (live ? 1 : 0.92), rot.cosY, rot.sinY, rot.cosX, rot.sinX, cx, cy, radius));
  }
  ctx.lineWidth = chromeHair(drawDpr);
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const dx = nodes[i].sx - nodes[j].sx;
      const dy = nodes[i].sy - nodes[j].sy;
      const d = Math.hypot(dx, dy);
      if (d > 52 + energy * 16) continue;
      ctx.strokeStyle = `rgba(0, 200, 255, ${0.08 + (1 - d / 70) * 0.35})`;
      ctx.beginPath();
      ctx.moveTo(nodes[i].sx, nodes[i].sy);
      ctx.lineTo(nodes[j].sx, nodes[j].sy);
      ctx.stroke();
    }
  }
  nodes.forEach((n, i) => {
    ctx.fillStyle = i % 5 === 0 ? '#E7FBFF' : DOCK_BLUE;
    ctx.beginPath();
    ctx.arc(n.sx, n.sy, 0.7 + audio.rms * 0.9, 0, Math.PI * 2);
    ctx.fill();
  });
}

function paintCristal(ctx, t, audio, energy, cx, cy, radius, rot) {
  const faces = 10;
  ctx.lineWidth = 1.1;
  for (let i = 0; i < faces; i += 1) {
    const a0 = (i / faces) * Math.PI * 2 + t * 0.25;
    const a1 = ((i + 1) / faces) * Math.PI * 2 + t * 0.25;
    const top = rotProject({ x: 0, y: 1, z: 0 }, 1.05 + energy * 0.3, rot.cosY, rot.sinY, rot.cosX, rot.sinX, cx, cy, radius);
    const b0 = rotProject({ x: Math.cos(a0), y: 0.05 + Math.sin(t + i) * 0.08, z: Math.sin(a0) }, 1.05 + audio.mid * 0.25, rot.cosY, rot.sinY, rot.cosX, rot.sinX, cx, cy, radius);
    const b1 = rotProject({ x: Math.cos(a1), y: 0.05, z: Math.sin(a1) }, 1.05 + audio.mid * 0.25, rot.cosY, rot.sinY, rot.cosX, rot.sinX, cx, cy, radius);
    const bot = rotProject({ x: 0, y: -1, z: 0 }, 1.05 + energy * 0.3, rot.cosY, rot.sinY, rot.cosX, rot.sinX, cx, cy, radius);
    ctx.fillStyle = `rgba(0, 180, 255, ${0.05 + (i % 2) * 0.06 + energy * 0.08})`;
    ctx.strokeStyle = `rgba(150, 230, 255, ${0.4 + energy * 0.35})`;
    ctx.beginPath();
    ctx.moveTo(top.sx, top.sy);
    ctx.lineTo(b0.sx, b0.sy);
    ctx.lineTo(b1.sx, b1.sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bot.sx, bot.sy);
    ctx.lineTo(b0.sx, b0.sy);
    ctx.lineTo(b1.sx, b1.sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function paintPortal(ctx, t, audio, energy, cx, cy, radius) {
  for (let i = 0; i < 6; i += 1) {
    const rr = radius * (0.28 + i * 0.11);
    ctx.strokeStyle = `rgba(0, 180, 255, ${0.5 - i * 0.06})`;
    ctx.lineWidth = i === 2 ? 2.4 : 1.1;
    ctx.setLineDash?.(i % 2 ? [6, 8] : []);
    ctx.beginPath();
    ctx.arc(cx, cy, rr, t * (0.4 + i * 0.15), t * (0.4 + i * 0.15) + Math.PI * 1.6);
    ctx.stroke();
    ctx.setLineDash?.([]);
  }
  const ticks = 28;
  for (let i = 0; i < ticks; i += 1) {
    const a = (i / ticks) * Math.PI * 2 + t * 0.3;
    const inner = radius * 0.78;
    const outer = radius * 0.92;
    ctx.strokeStyle = DOCK_BLUE;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(0, 180, 255, ${0.12 + energy * 0.2})`;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * (0.18 + energy * 0.12), 0, Math.PI * 2);
  ctx.fill();
}

function paintFumaca(ctx, t, audio, energy, cx, cy, maxR) {
  const puffs = 72;
  for (let i = 0; i < puffs; i += 1) {
    const seed = i * 2.399;
    const layer = (i % 5) / 5;
    const ang = seed + t * (0.22 + layer * 0.12) + audio.low * 0.5;
    const rise = ((t * 0.14 + seed * 0.17) % 1);
    const dist = maxR * (0.12 + layer * 0.55 + rise * 0.18);
    const swirl = Math.sin(t * 0.9 + seed) * (10 + audio.mid * 18);
    const x = cx + Math.cos(ang) * dist + Math.cos(ang * 1.7 + t) * swirl * 0.08;
    const y = cy + Math.sin(ang) * dist * 0.78 - rise * maxR * 0.22;
    const life = 1 - rise;
    const rad = 1.1 + layer * 1.4 + audio.rms * 1.6 + life * 0.6;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 2.4);
    g.addColorStop(0, `rgba(210, 245, 255, ${0.1 + energy * 0.12 + life * 0.08})`);
    g.addColorStop(0.45, `rgba(0, 170, 255, ${0.06 + energy * 0.08})`);
    g.addColorStop(1, 'rgba(0, 80, 140, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintSonar(ctx, t, audio, energy, cx, cy, radius) {
  for (let i = 0; i < 5; i += 1) {
    const phase = (t * 0.55 + i * 0.2) % 1;
    const rr = radius * (0.18 + phase * 0.78);
    ctx.strokeStyle = `rgba(0, 200, 255, ${(1 - phase) * (0.35 + energy * 0.4)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = DOCK_BLUE;
  ctx.beginPath();
  ctx.arc(cx, cy, 4 + energy * 8, 0, Math.PI * 2);
  ctx.fill();
}

export function DockVoiceSphere({
  speaking = false,
  listening = false,
  size = 260,
  spectrumId = 'malha',
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const points = useMemo(() => fibSphere(COUNT), []);
  const spectrum = resolveDockSpectrum(spectrumId).id;

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let t = 0;

    const paint = () => {
      const { ctx, w, h, dpr } = fitDockCanvas(canvas, size, size);
      drawDpr = dpr;
      ctx.clearRect(0, 0, w, h);

      const audio = readDockAudio(speaking, listening);
      const live = true;
      t += speaking ? 0.045 : listening ? 0.028 : 0.018;
      const energy = Math.min(1, 0.38 + audio.rms * 1.15);
      const maxR = Math.min(w, h) * 0.47;
      const radius = maxR;
      const cx = w / 2;
      const cy = h / 2;
      const rotY = t * 0.55;
      const rotX = 0.35 + Math.sin(t * 0.4) * 0.12;
      const rot = {
        cosY: Math.cos(rotY),
        sinY: Math.sin(rotY),
        cosX: Math.cos(rotX),
        sinX: Math.sin(rotX),
      };
      glowBall(ctx, cx, cy, radius * 0.7, energy, maxR);
      if (spectrum === 'nuvem') paintNuvem(ctx, points, t, audio, energy, live, cx, cy, radius, rot);
      else if (spectrum === 'aneis') paintAneis(ctx, t, audio, energy, cx, cy, radius, rot);
      else if (spectrum === 'orbita') paintOrbita(ctx, points, t, audio, energy, cx, cy, radius, rot);
      else if (spectrum === 'pulso') paintPulso(ctx, t, audio, energy, cx, cy, maxR);
      else if (spectrum === 'grade') paintGrade(ctx, t, audio, energy, cx, cy, radius, rot);
      else if (spectrum === 'holograma') paintHolograma(ctx, points, t, audio, energy, live, cx, cy, radius, rot);
      else if (spectrum === 'radar') paintRadar(ctx, t, audio, energy, cx, cy, maxR);
      else if (spectrum === 'nucleo') paintNucleo(ctx, t, audio, energy, cx, cy, maxR);
      else if (spectrum === 'voxel') paintVoxel(ctx, points, t, audio, energy, live, cx, cy, radius, rot);
      else if (spectrum === 'circuito') paintCircuito(ctx, t, audio, energy, cx, cy, radius, rot);
      else if (spectrum === 'hex') paintHex(ctx, t, audio, energy, cx, cy, maxR);
      else if (spectrum === 'neural') paintNeural(ctx, points, t, audio, energy, live, cx, cy, radius, rot);
      else if (spectrum === 'cristal') paintCristal(ctx, t, audio, energy, cx, cy, radius, rot);
      else if (spectrum === 'portal') paintPortal(ctx, t, audio, energy, cx, cy, maxR);
      else if (spectrum === 'sonar') paintSonar(ctx, t, audio, energy, cx, cy, maxR);
      else if (spectrum === 'fumaca') paintFumaca(ctx, t, audio, energy, cx, cy, maxR);
      else paintMalha(ctx, points, t, audio, energy, live, cx, cy, radius, rot);

      rafRef.current = requestAnimationFrame(paint);
    };
    rafRef.current = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(rafRef.current);
  }, [listening, points, size, speaking, spectrum]);

  if (Platform.OS !== 'web') {
    return <View style={[styles.fallback, { width: size, height: size }]} />;
  }

  return (
    <View style={[styles.wrap, { width: size, height: size, overflow: 'visible' }]} pointerEvents="none">
      {React.createElement('canvas', {
        ref: canvasRef,
        style: { width: size, height: size, display: 'block' },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', overflow: 'visible' },
  fallback: { alignSelf: 'center', overflow: 'visible' },
});
