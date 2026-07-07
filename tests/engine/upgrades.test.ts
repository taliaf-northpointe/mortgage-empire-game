import { describe, expect, it } from 'vitest';
import { TRAINING_COST, UPGRADES_SCREEN_LEVEL } from '../../src/engine/constants';
import { UPGRADES } from '../../src/engine/content/upgrades';
import { createStarterState } from '../../src/engine/content/starter';
import { trainEmployee } from '../../src/engine/employees';
import {
  initialUpgradeStates,
  purchaseBlockedReason,
  purchaseUpgrade,
  tiersOwned,
  totalPurchased,
} from '../../src/engine/upgrades';
import type { GameState } from '../../src/engine/types';
import { withClassicTeam } from '../helpers';

function atLevel(level: number): GameState {
  const s = withClassicTeam(createStarterState());
  s.stats.level = level;
  s.currencies.coins = 100_000;
  return s;
}

describe('upgrade tree (GDD §7)', () => {
  it('defines exactly 25 upgrades: 5 categories × tiers 1–5', () => {
    expect(UPGRADES).toHaveLength(25);
    const states = initialUpgradeStates();
    expect(Object.values(states).filter((v) => v === 'available')).toHaveLength(5);
    expect(Object.values(states).filter((v) => v === 'locked')).toHaveLength(20);
  });

  it('purchasing unlocks the next tier and spends coins', () => {
    let s = atLevel(3);
    s = purchaseUpgrade(s, 'cozyChairs');
    expect(s.upgrades['cozyChairs']).toBe('purchased');
    expect(s.upgrades['betterLighting']).toBe('available');
    expect(s.currencies.coins).toBe(100_000 - 400);
    expect(tiersOwned(s, 'office')).toBe(1);
    expect(totalPurchased(s)).toBe(1);
  });

  it('is level-gated: no purchases below Level 3, Tiers 4–5 need Level 5', () => {
    const low = atLevel(1);
    expect(purchaseBlockedReason(low, 'cozyChairs')).toContain(`Level ${UPGRADES_SCREEN_LEVEL}`);
    expect(purchaseUpgrade(low, 'cozyChairs')).toBe(low);

    let mid = atLevel(3);
    for (const id of ['cozyChairs', 'betterLighting', 'coffeeMachine']) mid = purchaseUpgrade(mid, id);
    expect(mid.upgrades['cornerOffice']).toBe('available');
    expect(purchaseBlockedReason(mid, 'cornerOffice')).toContain('Level 5');
    expect(purchaseUpgrade(mid, 'cornerOffice')).toBe(mid);

    let high = structuredClone(mid);
    high.stats.level = 5;
    high = purchaseUpgrade(high, 'cornerOffice');
    expect(high.upgrades['cornerOffice']).toBe('purchased');
  });

  it('cannot skip tiers or buy without coins', () => {
    const s = atLevel(3);
    expect(purchaseBlockedReason(s, 'betterLighting')).toContain('previous tier');
    const broke = atLevel(3);
    broke.currencies.coins = 100;
    expect(purchaseBlockedReason(broke, 'cozyChairs')).toContain('coins');
  });

  it('marketing purchases bump reputation instantly', () => {
    const s = purchaseUpgrade(atLevel(3), 'flyers');
    expect(s.stats.reputation).toBe(52);
  });

  it('Staff Training tiers boost training gains', () => {
    let s = atLevel(3);
    s = purchaseUpgrade(s, 'basicSkills'); // 1 training tier → +20% gain
    const trained = trainEmployee(s, 'emp-processor-1');
    expect(trained.currencies.coins).toBe(s.currencies.coins - TRAINING_COST);
    expect(trained.employees['emp-processor-1']?.skill).toBe(2.3); // 2 + 0.25 × 1.2
  });
});
