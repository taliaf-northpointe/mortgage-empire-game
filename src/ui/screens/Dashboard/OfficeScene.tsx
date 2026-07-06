import type { Employee } from '../../../engine/types';
import { CozyHands, CozyPerson } from './CozyPerson';
import styles from './Dashboard.module.css';

const SHIRTS = ['var(--color-sky)', 'var(--color-sage)', 'var(--color-lavender)', 'var(--color-rose)'];
const DESKS_PER_ROW = 4;

const WALL = 'color-mix(in srgb, var(--color-sky) 22%, var(--color-paper))';
const WALL_DARK = 'color-mix(in srgb, var(--color-sky) 34%, var(--color-paper))';

/**
 * The office scene (GDD §11 screen 2, §12 lofi-cozy art direction): a proper
 * isometric room — walls, window, wall art, bookshelf, rug — with a desk for
 * every employee; the floor grows a row per four hires. SVG first pass;
 * generated sprite art can replace pieces later.
 */
export function OfficeScene({ employees }: { employees: Employee[] }) {
  const sorted = [...employees].sort((a, b) => a.id.localeCompare(b.id));
  const rows = Math.max(1, Math.ceil(sorted.length / DESKS_PER_ROW));
  const height = 300 + rows * 150;
  const midY = 110 + (height - 140) / 2;
  const wallH = 130;

  return (
    <svg className={styles.scene} viewBox={`40 ${90 - wallH} 820 ${height + wallH}`} aria-label="Your office">
      {/* ── the room: two walls meeting at the top corner ── */}
      <polygon points={`40,${midY} 450,90 450,${90 - wallH} 40,${midY - wallH}`} fill={WALL} />
      <polygon points={`860,${midY} 450,90 450,${90 - wallH} 860,${midY - wallH}`} fill={WALL_DARK} />

      {/* window with blinds (right wall) */}
      <g>
        <rect x="600" y={midY - wallH + 6} width="150" height="76" rx="8" fill="var(--color-paper)" opacity="0.95" />
        <rect x="606" y={midY - wallH + 12} width="138" height="64" rx="6" fill="color-mix(in srgb, var(--color-honey) 30%, var(--color-paper))" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x="606" y={midY - wallH + 18 + i * 14} width="138" height="4" rx="2" fill="var(--color-sand)" opacity="0.9" />
        ))}
      </g>

      {/* wall clock (right wall) */}
      <g>
        <circle cx="800" cy={midY - wallH + 30} r="16" fill="var(--color-paper)" stroke="var(--color-cocoa)" strokeWidth="2" />
        <line x1="800" y1={midY - wallH + 30} x2="800" y2={midY - wallH + 20} stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" />
        <line x1="800" y1={midY - wallH + 30} x2="807" y2={midY - wallH + 33} stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* framed poster (left wall) */}
      <g>
        <rect x="120" y={midY - wallH + 4} width="120" height="70" rx="8" fill="var(--color-paper)" stroke="var(--color-sand)" strokeWidth="3" />
        <path d={`M 160 ${midY - wallH + 40} L 180 ${midY - wallH + 22} L 200 ${midY - wallH + 40} Z`} fill="var(--color-terracotta)" opacity="0.9" />
        <rect x="166" y={midY - wallH + 40} width="28" height="16" rx="3" fill="var(--color-cream)" stroke="var(--color-cocoa)" strokeWidth="1" />
        <text x="180" y={midY - wallH + 66} textAnchor="middle" className={styles.posterText}>
          dream homes
        </text>
      </g>

      {/* bookshelf (left wall base) */}
      <g>
        <rect x="280" y={midY - 78} width="86" height="64" rx="6" fill="color-mix(in srgb, var(--color-cocoa) 55%, var(--color-paper))" />
        {[0, 1].map((shelf) => (
          <g key={shelf}>
            {[0, 1, 2, 3, 4].map((book) => (
              <rect
                key={book}
                x={288 + book * 14}
                y={midY - 72 + shelf * 30}
                width="10"
                height="22"
                rx="2"
                fill={SHIRTS[(book + shelf) % SHIRTS.length]}
                opacity="0.9"
              />
            ))}
          </g>
        ))}
      </g>

      {/* ── floor ── */}
      <polygon
        points={`450,90 860,${midY} 450,${height + 40} 40,${midY}`}
        fill="color-mix(in srgb, var(--color-sand) 55%, var(--color-paper))"
        stroke="var(--color-sand)"
        strokeWidth="2"
      />
      {/* cozy rug */}
      <polygon
        points={`450,${midY - 60} 610,${midY + 20} 450,${midY + 100} 290,${midY + 20}`}
        fill="color-mix(in srgb, var(--color-sage) 30%, var(--color-paper))"
        stroke="color-mix(in srgb, var(--color-sage) 55%, var(--color-paper))"
        strokeWidth="4"
        opacity="0.8"
      />

      {/* water cooler */}
      <g className={styles.bobSlow}>
        <rect x="790" y={midY - 60} width="26" height="52" rx="8" fill="var(--color-paper)" stroke="var(--color-sand)" />
        <rect x="793" y={midY - 80} width="20" height="26" rx="7" fill="var(--color-sky)" opacity="0.55" />
      </g>

      {/* plants */}
      <Plant x={80} y={midY} />
      <Plant x={735} y={midY + 60} />

      {sorted.map((employee, i) => {
        const col = i % DESKS_PER_ROW;
        const row = Math.floor(i / DESKS_PER_ROW);
        const x = 160 + col * 165 + (row % 2 === 1 ? 82 : 0);
        const y = 190 + row * 150;
        return (
          <Workstation
            key={employee.id}
            x={x}
            y={y}
            name={employee.name.split(' ')[0] ?? employee.name}
            seed={employee.id}
            slow={i % 2 === 1}
            unhappy={employee.tag === 'needsBreak' || employee.tag === 'overworked'}
          />
        );
      })}
    </svg>
  );
}

function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g className={styles.bob}>
      <rect x={x - 4} y={y - 4} width={30} height={26} rx={8} fill="var(--color-terracotta)" opacity="0.85" />
      <circle cx={x + 11} cy={y - 18} r={20} fill="var(--color-sage)" />
      <circle cx={x - 4} cy={y - 8} r={13} fill="var(--color-sage)" opacity="0.8" />
      <circle cx={x + 26} cy={y - 8} r={13} fill="var(--color-sage)" opacity="0.8" />
    </g>
  );
}

function Workstation({
  x,
  y,
  name,
  seed,
  slow,
  unhappy,
}: {
  x: number;
  y: number;
  name: string;
  seed: string;
  slow: boolean;
  unhappy: boolean;
}) {
  return (
    <g>
      {/* person behind the desk */}
      <g className={slow ? styles.bobSlow : styles.bob}>
        <CozyPerson x={x + 70} y={y - 42} seed={seed} unhappy={unhappy} />
      </g>

      {/* iso desk */}
      <polygon
        points={`${x},${y + 26} ${x + 70},${y - 4} ${x + 140},${y + 26} ${x + 70},${y + 56}`}
        fill="var(--color-paper)"
        stroke="var(--color-sand)"
        strokeWidth="2"
      />
      <polygon
        points={`${x},${y + 26} ${x + 70},${y + 56} ${x + 70},${y + 76} ${x},${y + 46}`}
        fill="var(--color-sand)"
      />
      <polygon
        points={`${x + 140},${y + 26} ${x + 70},${y + 56} ${x + 70},${y + 76} ${x + 140},${y + 46}`}
        fill="color-mix(in srgb, var(--color-sand) 70%, var(--color-cocoa))"
      />
      {/* monitor + keyboard + hands + mug + papers */}
      <rect x={x + 56} y={y - 6} width={28} height={20} rx={5} fill="var(--color-ink)" opacity="0.85" />
      <rect x={x + 59} y={y - 3} width={22} height={14} rx={3} fill="var(--color-sky)" opacity="0.7" />
      <rect x={x + 55} y={y + 20} width={30} height={7} rx={3} fill="color-mix(in srgb, var(--color-cocoa) 30%, var(--color-paper))" />
      <CozyHands x={x + 70} y={y + 24} seed={seed} />
      <circle cx={x + 106} cy={y + 24} r={5} fill="var(--color-rose)" opacity="0.85" />
      <rect x={x + 22} y={y + 16} width={18} height={10} rx={2} fill="var(--color-paper)" stroke="var(--color-sand)" transform={`rotate(-8 ${x + 31} ${y + 21})`} />

      <text x={x + 70} y={y + 96} textAnchor="middle" className={styles.deskLabel}>
        {name}
      </text>
    </g>
  );
}
