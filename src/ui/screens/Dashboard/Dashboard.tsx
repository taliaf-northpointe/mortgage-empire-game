import {
  BookOpen,
  Briefcase,
  Coins,
  FolderKanban,
  Heart,
  HelpCircle,
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
import { DAY_END_HOUR, REAL_MS_PER_HOUR, titleForLevel, WEEKDAYS } from '../../../engine/constants';
import { DISRUPTION_BY_KIND } from '../../../engine/content/disruptions';
import { officeStage } from '../../../engine/upgrades';
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
  onNavigate(
    screen: 'pipeline' | 'learning' | 'employees' | 'upgrades' | 'map' | 'memoryWall' | 'audioSettings',
  ): void;
  onExitToMenu(): void;
  /** Reopen the guided tour (replay mode — no rewards, no save changes). */
  onReplayTutorial(): void;
}

export function Dashboard({ speed, onSpeedChange, onNavigate, onExitToMenu, onReplayTutorial }: DashboardProps) {
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
          tutorialId="nav-pipeline"
          onClick={() => {
            audioManager.playCue('menuNavigation');
            onNavigate('pipeline');
          }}
        />
        <NavItem
          icon={<Sparkles size={17} />}
          label="Upgrades"
          tutorialId="nav-upgrades"
          onClick={() => {
            audioManager.playCue('menuNavigation');
            onNavigate('upgrades');
          }}
        />
        <NavItem
          icon={<Map size={17} />}
          label="Map"
          onClick={() => {
            audioManager.playCue('menuNavigation');
            onNavigate('map');
          }}
        />
        <NavItem
          icon={<Heart size={17} />}
          label="Wall of Homes"
          badge={game.memoryWall.length || undefined}
          tutorialId="nav-wall"
          onClick={() => {
            audioManager.playCue('menuNavigation');
            onNavigate('memoryWall');
          }}
        />
        <NavItem
          icon={<BookOpen size={17} />}
          label="Learning Center"
          tutorialId="nav-learning"
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
        <span className={styles.dayChip} data-tutorial="clock">
          DAY {clock.day} · {clock.season.toUpperCase()} · {(WEEKDAYS[clock.weekday] ?? '').toUpperCase()}
        </span>
        <span className={styles.hourChip}>
          {formatHour(clock.hour)}
          {clock.hour <= DAY_END_HOUR && (
            <span
              key={`${clock.day}-${clock.hour}`}
              className={styles.hourProgress}
              style={{
                animationDuration: `${REAL_MS_PER_HOUR / Math.max(1, speed)}ms`,
                animationPlayState: speed === 0 ? 'paused' : 'running',
              }}
              aria-hidden="true"
            />
          )}
        </span>
        {game.disruption && (
          <span
            className={styles.disruptionChip}
            title={DISRUPTION_BY_KIND[game.disruption.kind]?.detail}
          >
            {DISRUPTION_BY_KIND[game.disruption.kind]?.chip} ·{' '}
            {game.disruption.hoursLeft}h
          </span>
        )}

        <div className={styles.kpis} data-tutorial="kpis">
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

        <div className={styles.speedControls} data-tutorial="speed">
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
        <button
          type="button"
          className={styles.helpButton}
          onClick={() => {
            audioManager.playCue('windowOpen');
            onReplayTutorial();
          }}
          title="Replay the guided tour"
          aria-label="Replay the guided tour"
        >
          <HelpCircle size={16} />
        </button>
      </header>

      <main className={styles.stage} data-tutorial="office">
        <OfficeScene employees={employees} stage={officeStage(game)} />
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
  tutorialId,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active?: boolean;
  soon?: boolean;
  /** Lets the tutorial spotlight this entry ([data-tutorial]). */
  tutorialId?: string;
  onClick?(): void;
}) {
  return (
    <button
      type="button"
      className={active ? styles.navItemActive : styles.navItem}
      disabled={soon}
      title={soon ? 'Coming in a later milestone' : undefined}
      data-tutorial={tutorialId}
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
