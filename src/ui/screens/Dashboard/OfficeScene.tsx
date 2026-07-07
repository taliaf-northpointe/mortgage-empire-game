import type { Employee } from '../../../engine/types';
import styles from './Dashboard.module.css';

const DESKS_PER_ROW = 4;

const art = (name: string) => `${import.meta.env.BASE_URL}assets/art/${name}`;

/**
 * The office scene (GDD §11 screen 2, §12 lofi-cozy art direction) —
 * Talia's generated room + desk + character sprites, composited with the
 * dynamic desk-per-employee layout and the idle bob kept from the SVG era.
 */
export function OfficeScene({ employees }: { employees: Employee[] }) {
  const sorted = [...employees].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <svg className={styles.scene} viewBox="0 0 1323 1189" aria-label="Your office">
      <image href={art('office-room.png')} x="0" y="0" width="1323" height="1189" />

      {sorted.map((employee, i) => {
        const col = i % DESKS_PER_ROW;
        const row = Math.floor(i / DESKS_PER_ROW);
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
            {/* desk sprite in front */}
            <image href={art('desk.png')} x={x} y={y - 40} width={240} />
            {/* name chip */}
            <rect x={x + 70} y={y + 160} width={100} height={26} rx={13} fill="var(--color-paper)" opacity="0.85" />
            <text x={x + 120} y={y + 178} textAnchor="middle" className={styles.deskLabel}>
              {employee.name.split(' ')[0] ?? employee.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
