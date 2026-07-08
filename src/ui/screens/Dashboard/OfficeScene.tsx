import type { Employee } from '../../../engine/types';
import styles from './Dashboard.module.css';

const DESKS_PER_ROW = 4;

const art = (name: string) => `${import.meta.env.BASE_URL}assets/art/${name}`;

/** Each office stage's backdrop keeps its own native canvas (GDD §7 — the office grows). */
const STAGE_CANVAS: Record<number, { w: number; h: number }> = {
  1: { w: 1323, h: 1189 },
  2: { w: 1316, h: 1195 },
  3: { w: 1388, h: 1133 },
  4: { w: 1402, h: 1122 },
};

/**
 * The office scene (GDD §11 screen 2, §12 lofi-cozy art direction) —
 * Talia's generated room + desk + character sprites, composited with the
 * dynamic desk-per-employee layout and the idle bob kept from the SVG era.
 * The room and desks swap with the office upgrade stage.
 */
export function OfficeScene({ employees, stage = 1 }: { employees: Employee[]; stage?: number }) {
  const sorted = [...employees].sort((a, b) => a.id.localeCompare(b.id));
  const canvas = STAGE_CANVAS[stage] ?? STAGE_CANVAS[1] ?? { w: 1323, h: 1189 };

  // A big team must still fit the room (playtest 2026-07-08): wide teams get
  // a fifth desk per row, and the whole grid gently scales down toward the
  // floor's center until every last hire is visible.
  const perRow = sorted.length > 16 ? 5 : DESKS_PER_ROW;
  const rows = Math.max(1, Math.ceil(sorted.length / perRow));
  const neededH = 560 + (rows - 1) * 170 + 230; // last row's desk + name chip
  const gridScale = Math.min(1, (canvas.h - 30) / neededH);
  const gridTransform = `translate(${(canvas.w / 2) * (1 - gridScale)} ${canvas.h * 0.62 * (1 - gridScale)}) scale(${gridScale})`;

  return (
    <svg
      className={styles.scene}
      viewBox={`0 0 ${canvas.w} ${canvas.h}`}
      aria-label="Your office"
    >
      <image href={art(`office-room-${stage}.png`)} x="0" y="0" width={canvas.w} height={canvas.h} />

      <g transform={gridTransform}>
      {sorted.map((employee, i) => {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const x = 220 + col * 245 + (row % 2 === 1 ? 122 : 0);
        const y = 560 + row * 170;
        const sprite = employee.spriteId;
        const unhappy = employee.tag === 'needsBreak' || employee.tag === 'overworked';
        return (
          <g key={employee.id}>
            {/* person (bust sprite) behind the desk, gently bobbing */}
            <g className={i % 2 === 1 ? styles.bobSlow : styles.bob}>
              <image href={art(`char-${sprite}.png`)} x={x + 35} y={y - 118} width={170} />
              {unhappy && (
                <g>
                  <circle cx={x + 185} cy={y - 108} r={12} fill="var(--color-danger)" />
                  <text x={x + 185} y={y - 103} textAnchor="middle" className={styles.alertBadge}>
                    !
                  </text>
                </g>
              )}
            </g>
            {/* desk sprite in front — matches the office stage */}
            <image href={art(`desk-${stage}.png`)} x={x} y={y - 40} width={240} />
            {/* name chip */}
            <rect x={x + 70} y={y + 160} width={100} height={26} rx={13} fill="var(--color-paper)" opacity="0.85" />
            <text x={x + 120} y={y + 178} textAnchor="middle" className={styles.deskLabel}>
              {employee.name.split(' ')[0] ?? employee.name}
            </text>
          </g>
        );
      })}
      </g>
    </svg>
  );
}
