import { useMemo, useState } from 'react';
import { ArrowLeft, Scale, Smile, UserPlus, Users, Wallet } from 'lucide-react';
import {
  FIRE_TEAM_HAPPINESS_COST,
  ROLE_DISPLAY_NAME,
  ROLE_UNLOCK_LEVEL,
  TRAINING_COST,
  WEEKDAYS,
} from '../../../engine/constants';
import { generateCandidates } from '../../../engine/content/candidates';
import { assignedLoanCount, fireBlockedReason, skillCap } from '../../../engine/employees';
import type { HireCandidate } from '../../../engine/employees';
import type { Employee, Role } from '../../../engine/types';
import { useGameStore } from '../../../store/gameStore';
import { Button } from '../../components/Button';
import { moneyFull } from '../../format';
import styles from './Employees.module.css';

/** The employee's actual portrait (Talia's art), cropped to a circle. */
function Face({ spriteId, size = 38 }: { spriteId: number; size?: number }) {
  return (
    <span className={styles.face} style={{ width: size, height: size }}>
      <img src={`${import.meta.env.BASE_URL}assets/art/char-${spriteId}.png`} alt="" />
    </span>
  );
}

const ROLES: Role[] = [
  'loanOfficer',
  'loanOfficerAssistant',
  'processor',
  'underwriter',
  'closer',
  'it',
  'compliance',
];
type Tab = 'all' | Role;

const TAG_LABEL: Record<NonNullable<Employee['tag']>, string> = {
  star: 'Star Employee',
  readyToPromote: 'Ready to Promote',
  overworked: 'Overworked',
  needsBreak: 'Needs a break',
};

export function Employees({ onBack }: { onBack(): void }) {
  const game = useGameStore((s) => s.game);
  const trainEmployee = useGameStore((s) => s.trainEmployee);
  const promoteEmployee = useGameStore((s) => s.promoteEmployee);
  const hireEmployee = useGameStore((s) => s.hireEmployee);
  const fireEmployee = useGameStore((s) => s.fireEmployee);
  const rebalanceLoans = useGameStore((s) => s.rebalanceLoans);
  const [tab, setTab] = useState<Tab>('all');
  const [hiring, setHiring] = useState(false);

  if (!game) return null;

  const employees = Object.values(game.employees).sort((a, b) => a.name.localeCompare(b.name));
  const visible = tab === 'all' ? employees : employees.filter((e) => e.role === tab);
  const avgHappiness = employees.length
    ? Math.round(employees.reduce((sum, e) => sum + e.happiness, 0) / employees.length)
    : 0;
  const payroll = employees.reduce((sum, e) => sum + e.salaryMonthly, 0);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBack} aria-label="Back">
          <ArrowLeft size={16} />
        </button>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <button type="button" onClick={onBack}>
            Dashboard
          </button>
          <span>/</span>
          <strong>Employees</strong>
        </nav>
        <span className={styles.dayChip}>
          DAY {game.clock.day} · {game.clock.season.toUpperCase()} ·{' '}
          {(WEEKDAYS[game.clock.weekday] ?? '').toUpperCase()}
        </span>
        <div className={styles.teamStats}>
          <span>
            <Users size={14} /> {employees.length} on the team
          </span>
          <span>
            <Smile size={14} /> {avgHappiness}% avg happiness
          </span>
          <span>
            <Wallet size={14} /> {moneyFull(payroll)}/mo payroll
          </span>
        </div>
        <Button onClick={() => rebalanceLoans()} title="Spread the loans across the least-busy hands">
          <Scale size={14} /> Rebalance work
        </Button>
        <Button variant="primary" onClick={() => setHiring(true)}>
          <UserPlus size={14} /> Hire
        </Button>
      </header>

      <div className={styles.tabs} role="tablist">
        <TabButton label={`All (${employees.length})`} active={tab === 'all'} onClick={() => setTab('all')} />
        {ROLES.map((role) => (
          <TabButton
            key={role}
            label={`${ROLE_DISPLAY_NAME[role]}s (${employees.filter((e) => e.role === role).length})`}
            active={tab === role}
            onClick={() => setTab(role)}
          />
        ))}
      </div>

      <div className={styles.grid}>
        {visible.map((employee) => (
          <article key={employee.id} className={styles.card}>
            <div className={styles.cardTop}>
              <Face spriteId={employee.spriteId} />
              <div>
                <strong>{employee.name}</strong>
                <span className={styles.role}>
                  {ROLE_DISPLAY_NAME[employee.role]} · Lv {employee.level}
                </span>
              </div>
              {employee.tag && <span className={styles[`tag_${employee.tag}`]}>{TAG_LABEL[employee.tag]}</span>}
            </div>

            <div className={styles.skillRow} aria-label={`Skill ${employee.skill} of 5`}>
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={i < Math.round(employee.skill) ? styles.starOn : styles.star}>
                  ★
                </span>
              ))}
              <span className={styles.skillNumber}>
                {employee.skill.toFixed(2)} / {skillCap(employee).toFixed(1)} cap
              </span>
            </div>

            <Meter label="Happiness" value={employee.happiness} tone={employee.happiness < 40 ? 'danger' : 'sage'} />
            <Meter label="Workload" value={employee.workload} tone={employee.workload >= 90 ? 'danger' : 'sky'} />

            <div className={styles.cardMeta}>
              <span>{moneyFull(employee.salaryMonthly)}/mo</span>
              <span>
                {assignedLoanCount(game, employee.id)} {assignedLoanCount(game, employee.id) === 1 ? 'loan' : 'loans'} in
                progress
              </span>
            </div>

            <div className={styles.cardActions}>
              <Button
                onClick={() => trainEmployee(employee.id)}
                disabled={game.currencies.coins < TRAINING_COST || employee.skill >= skillCap(employee)}
                title={`Spend ${moneyFull(TRAINING_COST)} on training`}
              >
                Train ({moneyFull(TRAINING_COST)})
              </Button>
              <Button
                variant={employee.tag === 'readyToPromote' ? 'primary' : 'secondary'}
                onClick={() => promoteEmployee(employee.id)}
                disabled={employee.tag !== 'readyToPromote'}
                title="Available when skill hits the level cap"
              >
                Promote
              </Button>
              <Button
                variant="ghost"
                className={styles.letGo}
                onClick={() => fireEmployee(employee.id)}
                disabled={fireBlockedReason(game, employee.id) !== null}
                title={
                  fireBlockedReason(game, employee.id) ??
                  `Save ${moneyFull(employee.salaryMonthly)}/mo — but everyone else loses ${FIRE_TEAM_HAPPINESS_COST} happiness`
                }
              >
                Let go
              </Button>
            </div>
          </article>
        ))}
      </div>

      {hiring && (
        <HireModal
          coins={game.currencies.coins}
          playerLevel={game.stats.level}
          onHire={(candidate) => {
            hireEmployee(candidate);
            setHiring(false);
          }}
          onClose={() => setHiring(false)}
        />
      )}
    </div>
  );
}

function TabButton({
  label,
  active,
  disabled = false,
  title,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  title?: string;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={active ? styles.tabActive : styles.tab}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: 'sage' | 'sky' | 'danger' }) {
  return (
    <div className={styles.meter}>
      <span>{label}</span>
      <div className={styles.meterTrack}>
        <div className={`${styles.meterFill} ${styles[`fill_${tone}`]}`} style={{ width: `${value}%` }} />
      </div>
      <strong>{value}%</strong>
    </div>
  );
}

function HireModal({
  coins,
  playerLevel,
  onHire,
  onClose,
}: {
  coins: number;
  playerLevel: number;
  onHire(candidate: HireCandidate): void;
  onClose(): void;
}) {
  const [role, setRole] = useState<Role>('processor');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 0xffffffff));
  const candidates = useMemo(() => generateCandidates(seed ^ role.length, role), [seed, role]);

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <section className={styles.modal} role="dialog" aria-label="Hire a new teammate" onClick={(e) => e.stopPropagation()}>
        <h3>Hire a new teammate</h3>
        <p className={styles.modalNote}>
          Hiring fee: $1,000 · they start fresh and happy. Each hire automates their part of the
          journey — until then, that work is yours.
        </p>
        <div className={styles.tabs} role="tablist">
          {ROLES.map((r) => {
            const unlockAt = ROLE_UNLOCK_LEVEL[r];
            const locked = unlockAt !== undefined && playerLevel < unlockAt;
            return (
              <TabButton
                key={r}
                label={locked ? `${ROLE_DISPLAY_NAME[r]} 🔒 Lv ${unlockAt}` : ROLE_DISPLAY_NAME[r]}
                active={role === r}
                disabled={locked}
                title={locked ? `${ROLE_DISPLAY_NAME[r]} unlocks at level ${unlockAt}` : undefined}
                onClick={() => setRole(r)}
              />
            );
          })}
        </div>
        <div className={styles.candidates}>
          {candidates.map((candidate) => (
            <article key={candidate.name} className={styles.candidateCard}>
              <Face spriteId={candidate.spriteId} size={56} />
              <strong>{candidate.name}</strong>
              <span className={styles.role}>{ROLE_DISPLAY_NAME[candidate.role]}</span>
              <span className={styles.candidateSkill}>
                {'★'.repeat(Math.round(candidate.skill))}
                {'☆'.repeat(5 - Math.round(candidate.skill))} {candidate.skill.toFixed(2)}
              </span>
              <span className={styles.candidateSalary}>{moneyFull(candidate.salaryMonthly)}/mo</span>
              <Button variant="primary" onClick={() => onHire(candidate)} disabled={coins < 1_000}>
                Hire
              </Button>
            </article>
          ))}
        </div>
        <div className={styles.modalActions}>
          <Button onClick={() => setSeed(Math.floor(Math.random() * 0xffffffff))}>New candidates</Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </section>
    </div>
  );
}
