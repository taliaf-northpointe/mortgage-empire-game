/**
 * A cozy chibi office worker (GDD §12 lofi-cozy art direction): chair,
 * shouldered torso, arms, one of five hairstyles, optional glasses —
 * everything varied deterministically per person so each teammate looks
 * like themselves every day.
 */

const SKIN = [
  'var(--color-cream)',
  'color-mix(in srgb, var(--color-cocoa) 22%, var(--color-cream))',
  'color-mix(in srgb, var(--color-cocoa) 45%, var(--color-cream))',
];
const HAIR = [
  'var(--color-cocoa)',
  'var(--color-ink)',
  'color-mix(in srgb, var(--color-honey) 75%, var(--color-cocoa))',
  'color-mix(in srgb, var(--color-terracotta) 80%, var(--color-cocoa))',
];
const SHIRTS = ['var(--color-sky)', 'var(--color-sage)', 'var(--color-lavender)', 'var(--color-rose)'];

export function hashSeed(seed: string): number {
  let n = 0;
  for (const ch of seed) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return n;
}

interface CozyPersonProps {
  /** center of the head */
  x: number;
  y: number;
  seed: string;
  unhappy?: boolean;
  scale?: number;
}

export function CozyPerson({ x, y, seed, unhappy = false, scale = 1 }: CozyPersonProps) {
  const h = hashSeed(seed);
  const skin = SKIN[h % SKIN.length] ?? SKIN[0]!;
  const hair = HAIR[(h >> 3) % HAIR.length] ?? HAIR[0]!;
  const shirt = SHIRTS[(h >> 5) % SHIRTS.length] ?? SHIRTS[0]!;
  const hairstyle = (h >> 7) % 5;
  const glasses = (h >> 9) % 3 === 0;
  const collarTie = (h >> 11) % 4 === 0;

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* chair back peeking behind */}
      <rect x={-26} y={6} width={52} height={34} rx={14} fill="color-mix(in srgb, var(--color-cocoa) 35%, var(--color-paper))" />

      {/* torso with shoulders */}
      <path
        d="M -24 46 Q -26 16 -12 12 Q 0 8 12 12 Q 26 16 24 46 Z"
        fill={shirt}
      />
      {/* collar */}
      <path d="M -7 12 L 0 20 L 7 12 Q 0 9 -7 12 Z" fill="var(--color-paper)" opacity="0.9" />
      {collarTie && <path d="M 0 19 L 4 26 L 0 34 L -4 26 Z" fill="color-mix(in srgb, var(--color-ink) 60%, var(--color-paper))" />}
      {/* arms reaching toward the desk */}
      <path d="M -24 22 Q -34 34 -28 46 L -18 44 Q -22 32 -16 24 Z" fill={shirt} />
      <path d="M 24 22 Q 34 34 28 46 L 18 44 Q 22 32 16 24 Z" fill={shirt} />

      {/* head */}
      <circle cx={0} cy={-8} r={19} fill={skin} stroke="var(--color-cocoa)" strokeWidth="1.5" />

      {/* hairstyles */}
      {hairstyle === 0 && (
        // short crop
        <path d="M -18 -12 Q -16 -30 0 -29 Q 16 -30 18 -12 Q 10 -22 0 -21 Q -10 -22 -18 -12 Z" fill={hair} />
      )}
      {hairstyle === 1 && (
        // side part with sweep
        <path d="M -18 -10 Q -19 -30 2 -29 Q 18 -28 18 -12 Q 14 -24 -2 -22 Q -12 -21 -14 -12 Q -16 -10 -18 -10 Z" fill={hair} />
      )}
      {hairstyle === 2 && (
        // bun
        <>
          <path d="M -18 -12 Q -16 -29 0 -28 Q 16 -29 18 -12 Q 10 -22 0 -21 Q -10 -22 -18 -12 Z" fill={hair} />
          <circle cx={13} cy={-26} r={7} fill={hair} />
        </>
      )}
      {hairstyle === 3 && (
        // long hair down the sides
        <>
          <path d="M -19 -10 Q -18 -30 0 -29 Q 18 -30 19 -10 Q 10 -23 0 -22 Q -10 -23 -19 -10 Z" fill={hair} />
          <path d="M -19 -10 Q -22 6 -16 14 L -10 12 Q -15 2 -14 -8 Z" fill={hair} />
          <path d="M 19 -10 Q 22 6 16 14 L 10 12 Q 15 2 14 -8 Z" fill={hair} />
        </>
      )}
      {hairstyle === 4 && (
        // curly
        <>
          <circle cx={-12} cy={-20} r={8} fill={hair} />
          <circle cx={-4} cy={-25} r={8} fill={hair} />
          <circle cx={5} cy={-25} r={8} fill={hair} />
          <circle cx={13} cy={-20} r={8} fill={hair} />
        </>
      )}

      {/* face */}
      <circle cx={-6.5} cy={-10} r={2} fill="var(--color-ink)" />
      <circle cx={6.5} cy={-10} r={2} fill="var(--color-ink)" />
      {glasses && (
        <g stroke="color-mix(in srgb, var(--color-ink) 70%, var(--color-paper))" strokeWidth="1.6" fill="none">
          <circle cx={-6.5} cy={-10} r={5.5} />
          <circle cx={6.5} cy={-10} r={5.5} />
          <line x1={-1} y1={-10} x2={1} y2={-10} />
        </g>
      )}
      {/* blush */}
      <circle cx={-11} cy={-4} r={2.8} fill="var(--color-rose)" opacity="0.35" />
      <circle cx={11} cy={-4} r={2.8} fill="var(--color-rose)" opacity="0.35" />
      {/* mouth */}
      {unhappy ? (
        <path d="M -5 -1 Q 0 -5 5 -1" stroke="var(--color-ink)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M -5 -3 Q 0 2 5 -3" stroke="var(--color-ink)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      )}
    </g>
  );
}

/** Hands resting on the desk — drawn after the desk top so they sit on it. */
export function CozyHands({ x, y, seed, scale = 1 }: { x: number; y: number; seed: string; scale?: number }) {
  const h = hashSeed(seed);
  const skin = SKIN[h % SKIN.length] ?? SKIN[0]!;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle cx={-17} cy={0} r={5} fill={skin} stroke="var(--color-cocoa)" strokeWidth="1" />
      <circle cx={17} cy={0} r={5} fill={skin} stroke="var(--color-cocoa)" strokeWidth="1" />
    </g>
  );
}
