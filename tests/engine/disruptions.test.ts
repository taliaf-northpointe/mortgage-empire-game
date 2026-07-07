import { describe, expect, it } from 'vitest';
import { DISRUPTION_START_DAY, SYSTEM_UPDATE_SPEED_FACTOR } from '../../src/engine/constants';
import { maybeSpawnDisruption } from '../../src/engine/content/disruptions';
import { createStarterState } from '../../src/engine/content/starter';
import { advanceHour } from '../../src/engine/tick';
import type { GameState } from '../../src/engine/types';
import { withClassicTeam } from '../helpers';

/** Starter state with the loan parked mid-Processing so progress is measurable. */
function withProcessingLoan(): GameState {
  const s = withClassicTeam(createStarterState());
  const loan = s.loans['LN-2026-0001'];
  if (!loan) throw new Error('starter loan missing');
  loan.stage = 'processing';
  loan.progressHours = 1;
  loan.assignedEmployeeId = 'emp-processor-1';
  return s;
}

describe('office disruptions (GDD §6)', () => {
  it('wifi down: nothing moves until IT closes the ticket', () => {
    const s = withProcessingLoan();
    s.disruption = { kind: 'wifiDown', hoursLeft: 1 };

    const after = advanceHour(s);
    expect(after.loans['LN-2026-0001']?.progressHours).toBe(1); // no progress
    expect(after.disruption).toBeNull(); // ticket resolved after the hour
    expect(after.eventLog.some((e) => e.title.includes('IT saved the day'))).toBe(true);

    const later = advanceHour(after);
    expect(later.loans['LN-2026-0001']?.progressHours ?? 0).toBeGreaterThan(1); // back to work
  });

  it('surprise system update: everyone works at half speed', () => {
    const normal = advanceHour(withProcessingLoan());
    const slowed = withProcessingLoan();
    slowed.disruption = { kind: 'systemUpdate', hoursLeft: 2 };
    const after = advanceHour(slowed);

    const normalGain = (normal.loans['LN-2026-0001']?.progressHours ?? 0) - 1;
    const slowedGain = (after.loans['LN-2026-0001']?.progressHours ?? 0) - 1;
    expect(slowedGain).toBeCloseTo(normalGain * SYSTEM_UPDATE_SPEED_FACTOR, 1);
    expect(after.disruption?.hoursLeft).toBe(1); // still updating
  });

  it('printer jam: documents stop arriving, other work continues', () => {
    const s = withClassicTeam(createStarterState());
    const loan = s.loans['LN-2026-0001'];
    if (!loan) throw new Error('starter loan missing');
    loan.stage = 'documentCollection';
    loan.progressHours = 0;
    s.disruption = { kind: 'printerJam', hoursLeft: 3 };

    // several hours pass; the waiting-on-documents clock must not tick at all
    let state: GameState = s;
    for (let i = 0; i < 3; i++) state = advanceHour(state);
    expect(state.loans['LN-2026-0001']?.progressHours).toBe(0);
    expect(Object.values(state.loans['LN-2026-0001']?.documents ?? {})).not.toContain('collected');
  });

  it('never strikes during the honeymoon, and spawns deterministically after it', () => {
    // honeymoon: no disruption possible before DISRUPTION_START_DAY
    for (let day = 1; day < DISRUPTION_START_DAY; day++) {
      const s = createStarterState(1234);
      s.clock.day = day;
      maybeSpawnDisruption(s);
      expect(s.disruption ?? null).toBeNull();
    }

    // after it: some (seed, day) pair spawns one, and the same pair always does
    let spawnedDay: number | null = null;
    for (let day = DISRUPTION_START_DAY; day < DISRUPTION_START_DAY + 60 && !spawnedDay; day++) {
      const s = createStarterState(1234);
      s.clock.day = day;
      maybeSpawnDisruption(s);
      if (s.disruption) spawnedDay = day;
    }
    expect(spawnedDay).not.toBeNull();

    const a = createStarterState(1234);
    a.clock.day = spawnedDay ?? DISRUPTION_START_DAY;
    maybeSpawnDisruption(a);
    const b = createStarterState(1234);
    b.clock.day = spawnedDay ?? DISRUPTION_START_DAY;
    maybeSpawnDisruption(b);
    expect(a.disruption).toEqual(b.disruption);
    expect(a.eventLog[a.eventLog.length - 1]?.category).toBe('alerts');
  });

  it('only one mishap at a time', () => {
    const s = createStarterState(1234);
    s.clock.day = 30;
    s.disruption = { kind: 'wifiDown', hoursLeft: 2 };
    maybeSpawnDisruption(s);
    expect(s.disruption).toEqual({ kind: 'wifiDown', hoursLeft: 2 });
  });
});
