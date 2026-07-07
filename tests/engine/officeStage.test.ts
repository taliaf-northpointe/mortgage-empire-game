import { describe, expect, it } from 'vitest';
import { createStarterState } from '../../src/engine/content/starter';
import { officeStage } from '../../src/engine/upgrades';

// office-category tiers, in order (content/upgrades.ts)
const OFFICE_TIERS = ['cozyChairs', 'betterLighting', 'coffeeMachine', 'cornerOffice', 'executiveSuite'];

describe('the office visibly grows (GDD §7)', () => {
  it('maps office upgrade tiers onto the staged room art', () => {
    const s = createStarterState();
    const expected = [1, 1, 2, 2, 3, 3]; // stage after owning 0..5 tiers
    expect(officeStage(s)).toBe(expected[0]);
    OFFICE_TIERS.forEach((id, i) => {
      s.upgrades[id] = 'purchased';
      expect(officeStage(s), `after ${i + 1} tiers`).toBe(expected[i + 1]);
    });
  });
});
