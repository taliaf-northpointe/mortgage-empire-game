/**
 * Generates every audio asset the AudioManager references. Fully
 * deterministic — rerun any time with:
 *
 *   node scripts/generate-audio.mjs
 *
 * Music: structured ~100-second compositions (intro / A / B / A' / outro,
 * seeded melodies) encoded as mono MP3 via lamejs so ten real songs stay
 * around 1 MB each. SFX: small crisp WAVs. Ambience: gapless noise WAV loops.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

/** Hand-picked real recordings — never overwritten by this generator. */
const PRESERVE = new Set(['ui/button-click.wav']);
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
// lamejs 1.2.1 quirk: the npm entry throws "MPEGMode is not defined" and the
// bundled build keeps everything on a module-scoped function — so evaluate
// the bundle and grab that function object directly.
import { readFileSync } from 'node:fs';
const lameSrc = readFileSync(require.resolve('lamejs/lame.min.js'), 'utf8');
const lamejs = new Function(`${lameSrc}; return lamejs;`)();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'audio');
const SR = 22050;

/* ── Writers ───────────────────────────────────────────────────────── */

function toInt16(samples) {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
  }
  return out;
}

function writeWav(relPath, samples) {
  const pcm = toInt16(samples);
  const buf = Buffer.alloc(44 + pcm.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + pcm.length * 2, 4);
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
  buf.writeUInt32LE(pcm.length * 2, 40);
  for (let i = 0; i < pcm.length; i++) buf.writeInt16LE(pcm[i], 44 + i * 2);
  save(relPath, buf);
}

function writeMp3(relPath, samples, kbps = 64) {
  const pcm = toInt16(samples);
  const encoder = new lamejs.Mp3Encoder(1, SR, kbps);
  const chunks = [];
  const block = 1152;
  for (let i = 0; i < pcm.length; i += block) {
    const piece = encoder.encodeBuffer(pcm.subarray(i, i + block));
    if (piece.length > 0) chunks.push(Buffer.from(piece));
  }
  const tail = encoder.flush();
  if (tail.length > 0) chunks.push(Buffer.from(tail));
  save(relPath, Buffer.concat(chunks));
}

function save(relPath, buf) {
  const full = join(OUT, relPath);
  if (PRESERVE.has(relPath) && existsSync(full)) {
    console.log(`kept  ${relPath} (hand-picked recording)`);
    return;
  }
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, buf);
  console.log(`wrote ${relPath} (${(buf.length / 1024).toFixed(0)} KB)`);
}

/* ── Synth helpers ─────────────────────────────────────────────────── */

const st = (root, semis) => root * Math.pow(2, semis / 12);

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function padNote(out, freq, start, dur, gain) {
  const a = Math.min(1.2, dur * 0.3);
  const r = Math.min(1.6, dur * 0.4);
  const s0 = Math.max(0, Math.floor(start * SR));
  const sN = Math.min(out.length, Math.floor((start + dur) * SR));
  for (let i = s0; i < sN; i++) {
    const t = i / SR - start;
    const env = Math.min(1, t / a) * Math.min(1, (dur - t) / r);
    const ph = 2 * Math.PI * freq * (i / SR);
    out[i] += gain * env * (Math.sin(ph) + 0.3 * Math.sin(2 * ph) + 0.12 * Math.sin(3 * ph));
  }
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

function bassNote(out, freq, start, dur, gain) {
  const s0 = Math.max(0, Math.floor(start * SR));
  const sN = Math.min(out.length, Math.floor((start + dur) * SR));
  for (let i = s0; i < sN; i++) {
    const t = i / SR - start;
    const env = Math.exp(-t * 1.6) * Math.min(1, t / 0.02);
    const ph = 2 * Math.PI * freq * (i / SR);
    out[i] += gain * env * (Math.sin(ph) + 0.2 * Math.sin(2 * ph));
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

/* ── Composer: real little songs (~100 s) ──────────────────────────── */

const MAJ = [0, 4, 7];
const MAJ7 = [0, 4, 7, 11];
const MIN = [0, 3, 7];
const MIN7 = [0, 3, 7, 10];
const SUS = [0, 5, 7];
const ADD9 = [0, 4, 7, 14];

// I IV V vi shapes offset onto scale degrees (semitone offsets of chord roots)
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16];

/**
 * Track spec: root (Hz), bpm, two 4-chord progressions (A and B sections),
 * seed for the melody, sparkle level.
 */
const TRACKS = {
  'music/main-menu.mp3': { root: 220.0, bpm: 72, A: [[0, MAJ7], [5, MAJ], [9, MIN7], [7, SUS]], B: [[2, MIN7], [5, ADD9], [0, MAJ7], [7, MAJ]], seed: 11, sparkle: 0.8 },
  'music/office-dashboard.mp3': { root: 196.0, bpm: 76, A: [[0, ADD9], [9, MIN], [5, MAJ7], [7, MAJ]], B: [[5, MAJ], [4, MIN7], [0, MAJ7], [7, SUS]], seed: 22, sparkle: 1.0 },
  'music/town-map.mp3': { root: 246.9, bpm: 84, A: [[0, MAJ], [7, MAJ], [9, MIN], [5, MAJ7]], B: [[2, MIN], [7, MAJ], [0, ADD9], [5, MAJ]], seed: 33, sparkle: 1.2 },
  'music/customer-screen.mp3': { root: 174.6, bpm: 66, A: [[0, MAJ7], [9, MIN7], [5, ADD9], [7, SUS]], B: [[5, MAJ7], [4, MIN7], [2, MIN7], [7, MAJ]], seed: 44, sparkle: 0.6 },
  'music/loan-pipeline.mp3': { root: 220.0, bpm: 88, A: [[0, ADD9], [5, MAJ], [7, MAJ], [9, MIN7]], B: [[4, MIN7], [5, MAJ7], [7, SUS], [0, MAJ]], seed: 55, sparkle: 1.1 },
  'music/upgrade-screen.mp3': { root: 261.6, bpm: 80, A: [[0, MAJ], [4, MIN], [5, MAJ7], [7, MAJ]], B: [[9, MIN7], [5, ADD9], [7, MAJ], [0, MAJ7]], seed: 66, sparkle: 1.0 },
  'music/daily-summary.mp3': { root: 164.8, bpm: 60, A: [[0, MAJ7], [5, ADD9], [9, MIN7], [7, SUS]], B: [[5, MAJ7], [2, MIN7], [7, MAJ], [0, MAJ7]], seed: 77, sparkle: 0.5 },
  'music/tutorial.mp3': { root: 233.1, bpm: 72, A: [[0, MAJ], [5, MAJ], [7, SUS], [0, ADD9]], B: [[9, MIN], [5, MAJ7], [7, MAJ], [0, MAJ]], seed: 88, sparkle: 0.7 },
  'music/celebration.mp3': { root: 261.6, bpm: 100, A: [[0, MAJ], [5, MAJ], [7, MAJ], [0, ADD9]], B: [[5, MAJ7], [7, MAJ], [9, MIN], [7, MAJ]], seed: 99, sparkle: 1.5 },
  'music/expansion.mp3': { root: 196.0, bpm: 92, A: [[0, ADD9], [7, MAJ], [5, MAJ7], [7, MAJ]], B: [[9, MIN7], [5, MAJ], [0, MAJ7], [7, SUS]], seed: 111, sparkle: 1.3 },
};

function composeTrack(spec) {
  const beat = 60 / spec.bpm;
  const bar = beat * 4;
  // Structure: intro 4 bars · A 8 · B 8 · A' 8 · outro 4 = 32 bars (~90–128 s)
  const sections = [
    { prog: spec.A, bars: 4, pads: true, bass: false, arp: false, melody: false }, // intro
    { prog: spec.A, bars: 8, pads: true, bass: true, arp: true, melody: false },
    { prog: spec.B, bars: 8, pads: true, bass: true, arp: true, melody: true },
    { prog: spec.A, bars: 8, pads: true, bass: true, arp: true, melody: true },
    { prog: spec.B.slice(2), bars: 4, pads: true, bass: false, arp: false, melody: false }, // outro
  ];
  const totalBars = sections.reduce((sum, s) => sum + s.bars, 0);
  const out = new Float32Array(Math.ceil(totalBars * bar * SR));
  const rng = mulberry(spec.seed);

  let barCursor = 0;
  for (const section of sections) {
    for (let b = 0; b < section.bars; b++) {
      // chords change every 2 bars
      const [chordRootSt, shape] = section.prog[Math.floor(b / 2) % section.prog.length] ?? section.prog[0];
      const tBar = (barCursor + b) * bar;
      const chordRoot = st(spec.root, chordRootSt);

      if (section.pads) {
        for (const semis of shape) padNote(out, st(chordRoot, semis), tBar, bar * 2.1, 0.11);
      }
      if (section.bass) {
        bassNote(out, chordRoot / 2, tBar, beat * 1.8, 0.22);
        bassNote(out, chordRoot / 2, tBar + beat * 2, beat * 1.6, 0.16);
      }
      if (section.arp) {
        for (let e = 0; e < 8; e++) {
          if (rng() < 0.7) {
            const semis = shape[e % shape.length];
            pluck(out, st(chordRoot * 2, semis), tBar + e * (beat / 2), 0.5, 0.05 * spec.sparkle, 7);
          }
        }
      }
      if (section.melody) {
        let tb = 0;
        while (tb < 4) {
          const len = rng() < 0.3 ? 2 : 1; // quarter or half notes
          if (rng() < 0.75) {
            const degree = PENTATONIC[Math.floor(rng() * PENTATONIC.length)];
            pluck(out, st(spec.root * 2, chordRootSt + degree), tBar + tb * beat, len * beat * 0.9, 0.09, 3);
          }
          tb += len;
        }
      }
    }
    barCursor += section.bars;
  }
  return polish(out, 0.2, 0.5, 0.4);
}

/* ── SFX ───────────────────────────────────────────────────────────── */

/** A crisp, satisfying UI click: tiny noise burst + high tick. */
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

for (const [path, spec] of Object.entries(TRACKS)) writeMp3(path, composeTrack(spec));

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
