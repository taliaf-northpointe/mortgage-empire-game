import { describe, expect, it } from 'vitest';
import { MAX_ACTIVE_LOANS } from '../../src/engine/constants';
import { maybeSpawnLead } from '../../src/engine/content/leads';
import { createStarterState } from '../../src/engine/content/starter';
import { advanceDay } from '../../src/engine/tick';
import type { GameState } from '../../src/engine/types';

function spawnOn(state: GameState, day: number): GameState {
  const s = structuredClone(state);
  s.clock.day = day;
  maybeSpawnLead(s);
  return s;
}

describe('lead generation (GDD §13 decision 8)', () => {
  it('is deterministic for a given seed and day', () => {
    const base = createStarterState(1234);
    const a = spawnOn(base, 5);
    const b = spawnOn(base, 5);
    expect(JSON.stringify(a.loans)).toBe(JSON.stringify(b.loans));
    expect(JSON.stringify(a.customers)).toBe(JSON.stringify(b.customers));
  });

  it('spawns leads over a week of play (60% daily chance)', () => {
    let s = createStarterState(7);
    for (let i = 0; i < 7; i++) s = advanceDay(s);
    expect(Object.keys(s.loans).length).toBeGreaterThan(1);
  });

  it('a spawned lead is a complete, well-formed customer + loan', () => {
    // find a (seed, day) that spawns
    let spawned: GameState | null = null;
    for (let day = 2; day < 12 && !spawned; day++) {
      const s = spawnOn(createStarterState(99), day);
      if (Object.keys(s.loans).length > 1) spawned = s;
    }
    expect(spawned).not.toBeNull();
    if (!spawned) return;

    const newLoan = Object.values(spawned.loans).find((l) => l.id !== 'LN-2026-0001');
    expect(newLoan).toBeDefined();
    expect(newLoan?.stage).toBe('lead');
    expect(newLoan?.delayed).toBe(false);
    expect(newLoan?.amount).toBeGreaterThanOrEqual(195_000);

    const customer = newLoan ? spawned.customers[newLoan.customerId] : undefined;
    expect(customer).toBeDefined();
    expect(customer?.dreamHome.price).toBeGreaterThan(newLoan?.amount ?? 0);
    expect(customer?.happinessAtWeekStart).toBe(customer?.happiness);

    expect(spawned.eventLog.some((e) => e.title.startsWith('New lead'))).toBe(true);
  });

  it('respects the active-loan cap', () => {
    const s = createStarterState(7);
    // stuff the pipeline to the cap
    for (let i = 0; i < MAX_ACTIVE_LOANS; i++) {
      const clone = structuredClone(s.loans['LN-2026-0001']);
      if (!clone) throw new Error('missing loan');
      clone.id = `LN-2026-8${String(i).padStart(3, '0')}`;
      s.loans[clone.id] = clone;
    }
    const before = Object.keys(s.loans).length;
    let capped = structuredClone(s);
    for (let day = 2; day < 9; day++) {
      capped.clock.day = day;
      maybeSpawnLead(capped);
    }
    expect(Object.keys(capped.loans).length).toBe(before);
  });
});
