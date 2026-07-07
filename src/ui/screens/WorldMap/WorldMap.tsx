import { useState } from 'react';
import { ArrowLeft, Binoculars, Building2, Lock } from 'lucide-react';
import { MAP_SCREEN_LEVEL, SCOUTING_COST, WEEKDAYS } from '../../../engine/constants';
import { NEIGHBORHOODS, NEIGHBORHOODS_BY_ID } from '../../../engine/content/neighborhoods';
import { branchBlockedReason } from '../../../engine/map';
import { useGameStore } from '../../../store/gameStore';
import { Button } from '../../components/Button';
import { moneyFull } from '../../format';
import styles from './WorldMap.module.css';

/** Chip positions over the illustrated map (fractions of the image). */
const PLOTS: Record<string, { x: number; y: number }> = {
  oldTown: { x: 0.262, y: 0.16 },
  sunnyHeights: { x: 0.685, y: 0.165 },
  riversideVillage: { x: 0.415, y: 0.47 },
  uptownHills: { x: 0.9, y: 0.4 },
  eastRidge: { x: 0.13, y: 0.76 },
  greenValley: { x: 0.83, y: 0.75 },
};

const STATUS_LABEL: Record<string, string> = {
  mainOffice: 'Main Office',
  branch: 'Branch',
  available: 'Available!',
  locked: 'Locked',
};

export function WorldMap({ onBack }: { onBack(): void }) {
  const game = useGameStore((s) => s.game);
  const scout = useGameStore((s) => s.scoutNeighborhood);
  const open = useGameStore((s) => s.openBranch);
  const [selectedId, setSelectedId] = useState('riversideVillage');

  if (!game) return null;
  const gated = game.stats.level < MAP_SCREEN_LEVEL;
  const selected = NEIGHBORHOODS_BY_ID[selectedId];
  const selectedState = game.neighborhoods[selectedId];
  const blocked = branchBlockedReason(game, selectedId);
  const loansIn = (id: string) =>
    Object.values(game.loans).filter((l) => {
      const customer = game.customers[l.customerId];
      return customer?.dreamHome.neighborhoodId === id && l.stage !== 'completed';
    }).length;

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
          <strong>Meadowbrook Region</strong>
        </nav>
        <span className={styles.dayChip}>
          DAY {game.clock.day} · {game.clock.season.toUpperCase()} ·{' '}
          {(WEEKDAYS[game.clock.weekday] ?? '').toUpperCase()}
        </span>
        <span className={styles.repChip}>⭐ Reputation {game.stats.reputation}/100</span>
        <span className={styles.coinChip}>{moneyFull(game.currencies.coins)}</span>
      </header>

      {gated ? (
        <section className={styles.gate}>
          <Lock size={28} aria-hidden="true" />
          <h2>The World Map unlocks at Level {MAP_SCREEN_LEVEL}</h2>
          <p>
            Become a <strong>CEO</strong> and the whole Meadowbrook Region opens up for expansion.
            You're Level {game.stats.level}.
          </p>
        </section>
      ) : (
        <div className={styles.body}>
          {/* ── Neighborhood list ── */}
          <nav className={styles.list} aria-label="Neighborhoods">
            {NEIGHBORHOODS.map((def) => {
              const hood = game.neighborhoods[def.id];
              if (!hood) return null;
              const statusLine =
                hood.status === 'mainOffice'
                  ? `Main Office · ${loansIn(def.id)} loans`
                  : hood.status === 'branch'
                    ? `Branch · ${loansIn(def.id)} loans`
                    : hood.status === 'available'
                      ? hood.scouted
                        ? `Available! · ${hood.leads} leads`
                        : 'Available! · ?'
                      : `Locked · needs ${def.reputationRequired} rep`;
              return (
                <button
                  key={def.id}
                  type="button"
                  className={def.id === selectedId ? styles.hoodActive : styles.hood}
                  onClick={() => setSelectedId(def.id)}
                  aria-current={def.id === selectedId}
                >
                  <span className={`${styles.dot} ${styles[`dot_${hood.status}`]}`} aria-hidden="true" />
                  <span className={styles.hoodName}>{def.name}</span>
                  <span className={styles.hoodStatus}>{statusLine}</span>
                </button>
              );
            })}
            <div className={styles.legend} aria-label="Legend">
              <span>
                <span className={`${styles.dot} ${styles.dot_mainOffice}`} /> Main Office
              </span>
              <span>
                <span className={`${styles.dot} ${styles.dot_branch}`} /> Branch
              </span>
              <span>
                <span className={`${styles.dot} ${styles.dot_available}`} /> Available
              </span>
              <span>
                <span className={`${styles.dot} ${styles.dot_locked}`} /> Locked
              </span>
            </div>
          </nav>

          {/* ── Region view (Talia's illustrated Meadowbrook) ── */}
          <section className={styles.mapArea} aria-label="Region map">
            <div className={styles.mapCanvas}>
              <img
                src={`${import.meta.env.BASE_URL}assets/art/map-region.png`}
                alt="Meadowbrook Region"
                className={styles.mapImage}
              />
              {NEIGHBORHOODS.map((def) => {
                const hood = game.neighborhoods[def.id];
                const plot = PLOTS[def.id];
                if (!hood || !plot) return null;
                return (
                  <button
                    key={def.id}
                    type="button"
                    className={`${styles.mapChip} ${styles[`chip_${hood.status}`]} ${
                      def.id === selectedId ? styles.mapChipSelected : ''
                    }`}
                    style={{ left: `${plot.x * 100}%`, top: `${plot.y * 100}%` }}
                    onClick={() => setSelectedId(def.id)}
                    aria-label={`${def.name}: ${STATUS_LABEL[hood.status]}`}
                  >
                    <strong>
                      {hood.status === 'locked' ? '🔒 ' : hood.status === 'mainOffice' ? '🏠 ' : hood.status === 'branch' ? '🏢 ' : ''}
                      {def.name}
                    </strong>
                    <span>{STATUS_LABEL[hood.status]}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Detail panel ── */}
          {selected && selectedState && (
            <aside className={styles.detail}>
              <h3>{selected.name}</h3>
              <span className={styles.detailStatus}>{STATUS_LABEL[selectedState.status]}</span>
              <p className={styles.description}>{selected.description}</p>
              <dl className={styles.stats}>
                <div>
                  <dt>Demand</dt>
                  <dd>{selectedState.demand.toUpperCase()}</dd>
                </div>
                <div>
                  <dt>Homes</dt>
                  <dd>{selectedState.scouted ? selected.homes : '?'}</dd>
                </div>
                <div>
                  <dt>Leads</dt>
                  <dd>{selectedState.scouted ? selectedState.leads : '?'}</dd>
                </div>
              </dl>

              {selectedState.status === 'available' || selectedState.status === 'locked' ? (
                <>
                  <div className={styles.costRow}>
                    <span>Branch cost</span>
                    <strong>{moneyFull(selected.branchCost)}</strong>
                  </div>
                  <Button variant="primary" disabled={blocked !== null} onClick={() => open(selectedId)}>
                    <Building2 size={14} /> Open Branch Office
                  </Button>
                  {!selectedState.scouted && (
                    <Button
                      onClick={() => scout(selectedId)}
                      disabled={game.currencies.coins < SCOUTING_COST}
                    >
                      <Binoculars size={14} /> Send scouts first — {moneyFull(SCOUTING_COST)}
                    </Button>
                  )}
                  {blocked && <span className={styles.blockedNote}>{blocked}</span>}
                </>
              ) : (
                <p className={styles.description}>
                  {selectedState.status === 'mainOffice'
                    ? 'Home sweet headquarters. The whole story started here.'
                    : 'Your branch is open and greeting neighbors every day. 🎊'}
                </p>
              )}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
