import {
  BookOpen,
  Briefcase,
  Coins,
  FolderKanban,
  Home,
  Map,
  Pause,
  Percent,
  Play,
  Settings,
  Smile,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { audioManager } from '../../../audio/AudioManager';
import { DAY_END_HOUR, titleForLevel, WEEKDAYS } from '../../../engine/constants';
import { useGameStore } from '../../../store/gameStore';
import { Button } from '../../components/Button';
import { GlossaryTerm } from '../../glossary/GlossaryTerm';
import styles from './Dashboard.module.css';
import { NotificationPanel } from './NotificationPanel';
import { OfficeScene } from './OfficeScene';

type Speed = 0 | 1 | 2 | 3;

interface DashboardProps {
  speed: Speed;
  onSpeedChange(speed: Speed): void;
  onNavigate(screen: 'pipeline' | 'learning' | 'employees' | 'audioSettings'): void;
  onExitToMenu(): void;
}

export function Dashboard({ speed, onSpeedChange, onNavigate, onExitToMenu }: DashboardProps) {
  const game = useGameStore((s) => s.game);
  if (!game) return null;

  const { clock, meta, currencies, stats } = game;
  const customers = Object.values(game.customers);
  const employees = Object.values(game.employees);
  const loans = Object.values(game.loans);
  const activeLoans = loans.filter((l) => l.stage !== 'completed').length;
  const happiness =
    customers.length === 0
      ? 100
      : Math.round(customers.reduce((sum, c) => sum + c.happiness, 0) / customers.length);

  return (
    <div className={styles.layout}>
      <nav className={styles.sidebar}>
        <div className={styles.brand}>
          <h4>{meta.officeName}</h4>
          <span>Old Town</span>
        </div>
        <NavItem icon={<Home size={17} />} label="Office" active />
        <NavItem
          icon={<Users size={17} />}
          label="Employees"
          badge={employees.length}
          onClick={() => {
            audioManager.playCue('menuNavigation');
            onNavigate('employees');
          }}
        />
        <NavItem
          icon={<FolderKanban size={17} />}
          label="Pipeline"
          badge={activeLoans}
          onClick={() => {
            audioManager.playCue('menuNavigation');
            onNavigate('pipeline');
          }}
        />
        <NavItem icon={<Sparkles size={17} />} label="Upgrades" soon />
        <NavItem icon={<Map size={17} />} label="Map" soon />
        <NavItem
          icon={<BookOpen size={17} />}
          label="Learning Center"
          onClick={() => {
            audioManager.playCue('menuNavigation');
            onNavigate('learning');
          }}
        />
        <NavItem
          icon={<Settings size={17} />}
          label="Settings"
          onClick={() => {
            audioManager.playCue('windowOpen');
            onNavigate('audioSettings');
          }}
        />

        <div className={styles.sidebarFooter}>
          <div className={styles.playerCard}>
            <span className={styles.avatar}>{initials(meta.playerName)}</span>
            <div>
              <strong>{meta.playerName}</strong>
              <span>
                {titleForLevel(stats.level)} · Lv {stats.level}
              </span>
            </div>
          </div>
          <Button variant="ghost" onClick={onExitToMenu}>
            Save & Menu
          </Button>
        </div>
      </nav>

      <header className={styles.kpiBar}>
        <span className={styles.dayChip}>
          DAY {clock.day} · {clock.season.toUpperCase()} · {(WEEKDAYS[clock.weekday] ?? '').toUpperCase()}
        </span>
        <span className={styles.hourChip}>{formatHour(clock.hour)}</span>

        <div className={styles.kpis}>
          <Kpi icon={<Coins size={15} />} label="Money" value={`$${currencies.coins.toLocaleString('en-US')}`} />
          <Kpi icon={<Star size={15} />} label="Reputation" value={`${stats.reputation}/100`} />
          <Kpi icon={<Briefcase size={15} />} label="Active Loans" value={String(activeLoans)} />
          <Kpi icon={<Smile size={15} />} label="Happiness" value={`${happiness}%`} />
          <Kpi
            icon={<Percent size={15} />}
            label={<GlossaryTerm termKey="interestRate">Interest</GlossaryTerm>}
            value={`${stats.interestRate.toFixed(1)}%`}
          />
        </div>

        <div className={styles.speedControls}>
          <button
            type="button"
            className={speed === 0 ? styles.speedActive : styles.speedButton}
            onClick={() => onSpeedChange(0)}
            aria-label="Pause"
          >
            <Pause size={13} />
          </button>
          {([1, 2, 3] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={speed === s ? styles.speedActive : styles.speedButton}
              onClick={() => onSpeedChange(s)}
              aria-label={`Speed ${s}x`}
            >
              {speed === 0 && s === 1 ? <Play size={13} /> : `${s}×`}
            </button>
          ))}
        </div>
      </header>

      <main className={styles.stage}>
        <OfficeScene employees={employees} />
      </main>

      <NotificationPanel events={game.eventLog} currentHour={clock.hour} />
    </div>
  );
}

function NavItem({
  icon,
  label,
  badge,
  active = false,
  soon = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active?: boolean;
  soon?: boolean;
  onClick?(): void;
}) {
  return (
    <button
      type="button"
      className={active ? styles.navItemActive : styles.navItem}
      disabled={soon}
      title={soon ? 'Coming in a later milestone' : undefined}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && <span className={styles.badge}>{badge}</span>}
    </button>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: React.ReactNode; value: string }) {
  return (
    <div className={styles.kpi}>
      <span className={styles.kpiIcon}>{icon}</span>
      <div>
        <span className={styles.kpiLabel}>{label}</span>
        <strong className={styles.kpiValue}>{value}</strong>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatHour(hour: number): string {
  const clamped = Math.min(hour, DAY_END_HOUR);
  if (hour > DAY_END_HOUR) return 'Closing time!';
  if (clamped === 12) return '12 PM';
  return clamped < 12 ? `${clamped} AM` : `${clamped - 12} PM`;
}
