import { getHeldStream } from './webSpeech';

let ctx = null;
let analyser = null;
let source = null;
let hookedId = '';
let speakBoost = 0;
let lastDecay = 0;

export function bumpDockVoiceEnergy(amount = 1) {
  speakBoost = Math.min(1, Math.max(speakBoost, Number(amount) || 0));
}

export function decayDockVoiceEnergy() {
  const now = Date.now();
  if (!lastDecay) lastDecay = now;
  const steps = Math.min(8, Math.floor((now - lastDecay) / 16));
  if (steps > 0) {
    for (let i = 0; i < steps; i += 1) speakBoost *= 0.9;
    lastDecay = now;
  }
  return speakBoost;
}

function streamId(stream) {
  const track = stream?.getAudioTracks?.()[0];
  return track?.id || '';
}

export function getDockAnalyser() {
  if (typeof window === 'undefined') return null;
  const stream = getHeldStream?.();
  if (!stream) return analyser;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return analyser;
  if (!ctx) {
    ctx = new AC();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.78;
  }
  const id = streamId(stream);
  if (id && id !== hookedId) {
    try { source?.disconnect(); } catch (_) {}
    try {
      source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      hookedId = id;
    } catch (_) {}
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return analyser;
}

let ambientRms = 0.018;

function timeRms(analyser) {
  if (!analyser || typeof analyser.getByteTimeDomainData !== 'function') return 0;
  const buf = new Uint8Array(analyser.fftSize || 256);
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i += 1) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / Math.max(1, buf.length));
}

export function readMicRms() {
  return timeRms(getDockAnalyser());
}

export function isMicQuiet(speaking = false) {
  const a = getDockAnalyser();
  if (!a) return false;
  const rms = timeRms(a);
  if (!speaking && rms < 0.055) {
    ambientRms = ambientRms * 0.92 + rms * 0.08;
  }
  const floor = Math.max(0.014, Math.min(0.045, ambientRms * 2.1));
  return rms < floor;
}

export function isVoiceAboveNoise(speaking = false) {
  if (speaking) return true;
  return !isMicQuiet(false);
}

export function readDockAudio(speaking = false, listening = false) {
  const a = getDockAnalyser();
  let bins = null;
  let rms = 0;
  if (a && typeof a.getByteFrequencyData === 'function') {
    bins = new Uint8Array(a.frequencyBinCount || 64);
    a.getByteFrequencyData(bins);
    let sum = 0;
    for (let i = 0; i < bins.length; i += 1) sum += bins[i];
    rms = sum / (bins.length * 255);
  }
  const boost = decayDockVoiceEnergy();
  if (speaking) rms = Math.max(rms, 0.22 + boost * 0.7);
  else if (listening) rms = Math.max(rms, 0.08 + rms);
  const band = (from, to) => {
    if (!bins || !bins.length) return speaking ? 0.35 + boost * 0.5 : listening ? 0.16 : 0.05;
    let s = 0;
    let n = 0;
    const a0 = Math.floor(from * bins.length);
    const a1 = Math.min(bins.length, Math.ceil(to * bins.length));
    for (let i = a0; i < a1; i += 1) {
      s += bins[i];
      n += 1;
    }
    return n ? s / (n * 255) : 0;
  };
  return {
    bins,
    rms: Math.min(1, rms),
    low: band(0, 0.18),
    mid: band(0.18, 0.45),
    high: band(0.45, 0.8),
    boost,
  };
}
