/**
 * Generates the synthesized SFX + ambience assets. Background music is NOT
 * generated — it's a hand-picked three-song lo-fi playlist committed under
 * public/assets/audio/music/playlist-*.mp3. Deterministic; rerun any time:
 *
 *   node scripts/generate-audio.mjs
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Hand-picked real recordings — never overwritten by this generator. */
const PRESERVE = new Set(['ui/button-click.wav']);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'audio');
const SR = 22050;

/* ── Writer ────────────────────────────────────────────────────────── */

function writeWav(relPath, samples) {
  const full = join(OUT, relPath);
  if (PRESERVE.has(relPath) && existsSync(full)) {
    console.log(`kept  ${relPath} (hand-picked recording)`);
    return;
  }
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, buf);
  console.log(`wrote ${relPath} (${(buf.length / 1024).toFixed(0)} KB)`);
}

/* ── Synth helpers ─────────────────────────────────────────────────── */

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pluck(out, freq, start, dur, gain, decay = 6) {
  const s0 = Math.max(0, Math.floor(start * SR));
  const sN = Math.min(out.length, Math.floor((start + dur) * SR));
  for (let i = s0; i < sN; i++) {
    const t = i / SR - start;
    const env = Math.exp(-t * decay) * Math.min(1, t / 0.008);
    const ph = 2 * Math.PI * freq * (i / SR);
    const tri = (2 / Math.PI) * Math.asin(Math.sin(ph));
    out[i] += gain * env * tri;
  }
}

function polish(samples, cutoff = 0.24, level = 0.55, fadeSec = 0.05) {
  let y = 0;
  for (let i = 0; i < samples.length; i++) {
    y += cutoff * (samples[i] - y);
    samples[i] = y;
  }
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const norm = peak > 0 ? level / peak : 1;
  const fade = Math.floor(SR * fadeSec);
  for (let i = 0; i < samples.length; i++) {
    let g = norm;
    if (i < fade) g *= i / fade;
    if (i >= samples.length - fade) g *= (samples.length - i) / fade;
    samples[i] *= g;
  }
  return samples;
}

/* ── SFX ───────────────────────────────────────────────────────────── */

function sfxClick(pitch = 1800, loud = 0.9) {
  const out = new Float32Array(Math.floor(SR * 0.06));
  const rng = mulberry(5);
  for (let i = 0; i < Math.floor(SR * 0.012); i++) {
    out[i] += (rng() * 2 - 1) * Math.exp(-i / (SR * 0.002)) * 0.9;
  }
  pluck(out, pitch, 0.001, 0.05, loud, 40);
  return polish(out, 0.9, 0.5, 0.004);
}

function sfxHover() {
  const out = new Float32Array(Math.floor(SR * 0.04));
  pluck(out, 2200, 0, 0.035, 0.5, 60);
  return polish(out, 0.9, 0.25, 0.004);
}

function sfxNavigation() {
  const out = new Float32Array(Math.floor(SR * 0.14));
  pluck(out, 1500, 0, 0.05, 0.8, 40);
  pluck(out, 2000, 0.06, 0.06, 0.7, 40);
  return polish(out, 0.9, 0.45, 0.006);
}

function sfxSweep(up = true) {
  const out = new Float32Array(Math.floor(SR * 0.22));
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = up ? 500 + 1400 * (t / 0.22) : 1900 - 1400 * (t / 0.22);
    const env = Math.sin((Math.PI * i) / out.length);
    out[i] = 0.5 * env * Math.sin(2 * Math.PI * f * t);
  }
  return polish(out, 0.6, 0.35, 0.01);
}

function sfxChime() {
  const out = new Float32Array(Math.floor(SR * 0.5));
  pluck(out, 659, 0, 0.35, 0.7, 6);
  pluck(out, 880, 0.11, 0.38, 0.6, 6);
  return polish(out, 0.6, 0.45, 0.02);
}

function sfxSuccess() {
  const out = new Float32Array(Math.floor(SR * 0.8));
  pluck(out, 523, 0, 0.3, 0.6, 5);
  pluck(out, 659, 0.09, 0.3, 0.6, 5);
  pluck(out, 784, 0.18, 0.35, 0.6, 5);
  pluck(out, 1047, 0.28, 0.5, 0.7, 4);
  return polish(out, 0.55, 0.5, 0.02);
}

function sfxGentle() {
  const out = new Float32Array(Math.floor(SR * 0.4));
  pluck(out, 587, 0, 0.3, 0.55, 6);
  pluck(out, 784, 0.1, 0.3, 0.5, 6);
  return polish(out, 0.55, 0.4, 0.02);
}

function sfxAlert() {
  const out = new Float32Array(Math.floor(SR * 0.5));
  pluck(out, 392, 0, 0.35, 0.6, 5);
  pluck(out, 330, 0.16, 0.35, 0.55, 5);
  return polish(out, 0.5, 0.4, 0.02);
}

/* ── Ambience (gapless noise WAV loops) ────────────────────────────── */

function renderAmbience(seed, brightness, lfoHz, seconds = 8) {
  const noise = mulberry(seed);
  const out = new Float32Array(SR * seconds);
  let brown = 0;
  for (let i = 0; i < out.length; i++) {
    brown += (noise() * 2 - 1) * 0.02;
    brown *= 0.997;
    const lfo = 0.75 + 0.25 * Math.sin(2 * Math.PI * lfoHz * (i / SR));
    out[i] = brown * lfo;
  }
  return polish(out, brightness, 0.16, 0.05);
}

/* ── Generate everything ───────────────────────────────────────────── */

writeWav('ui/button-click.wav', sfxClick());
writeWav('ui/button-hover.wav', sfxHover());
writeWav('ui/menu-navigation.wav', sfxNavigation());
writeWav('ui/window-open.wav', sfxSweep(true));
writeWav('ui/window-close.wav', sfxSweep(false));
writeWav('ui/notification.wav', sfxChime());
writeWav('events/success.wav', sfxSuccess());
writeWav('events/gentle.wav', sfxGentle());
writeWav('events/alert.wav', sfxAlert());
writeWav('ambience/office.wav', renderAmbience(42, 0.08, 0.05));
writeWav('ambience/town.wav', renderAmbience(7, 0.15, 0.08));

console.log('done — cozy sounds ready 🎵');
