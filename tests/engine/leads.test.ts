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

  it('every lead is a photo persona; the whole cast appears before any repeats', () => {
    // spawn many leads, completing loans as we go so the cap never blocks
    let s = structuredClone(createStarterState(31));
    const seen: Record<number, string[]> = {};
    for (let day = 2; day < 120; day++) {
      s.clock.day = day;
      maybeSpawnLead(s);
      for (const loan of Object.values(s.loans)) loan.stage = 'completed';
    }

    const spawned = Object.values(s.customers).filter((c) => c.id !== 'cust-sarah-chen');
    expect(spawned.length).toBeGreaterThan(15); // enough to force portrait repeats
    for (const c of spawned) {
      expect(c.portraitId).toBeGreaterThanOrEqual(2);
      expect(c.portraitId).toBeLessThanOrEqual(17);
      expect(c.about).toBeTruthy();
      expect(c.houseId).toBeGreaterThanOrEqual(1);
      (seen[c.portraitId ?? 0] ??= []).push(c.name);
    }

    // round-robin: no portrait is reused until every persona has appeared
    const counts = Object.values(seen).map((names) => names.length);
    expect(Object.keys(seen)).toHaveLength(16); // all 16 personas walked in
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);

    // names and abouts NEVER repeat across the whole save (only Sarah is fixed)
    const allNames = spawned.map((c) => c.name);
    expect(new Set(allNames).size).toBe(allNames.length);
    const allAbouts = spawned.map((c) => c.about);
    expect(new Set(allAbouts).size).toBe(allAbouts.length);

    // a repeated portrait is paired with a house it hasn't lived in before
    for (const portraitId of Object.keys(seen).map(Number)) {
      const houses = spawned.filter((c) => c.portraitId === portraitId).map((c) => c.houseId);
      expect(new Set(houses).size).toBe(houses.length);
    }
    // first appearances keep the matched pair (portrait N lives in house N)
    for (const c of spawned.filter((x) => x.portraitVariant === 0)) {
      expect(c.houseId).toBe(c.portraitId);
    }
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
