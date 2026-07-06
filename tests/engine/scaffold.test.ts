import { describe, expect, it } from 'vitest';
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  GAME_TITLE,
  TICKS_PER_DAY,
} from '../../src/engine/constants';

describe('M0 scaffold', () => {
  it('exposes the game identity constants', () => {
    expect(GAME_TITLE).toBe('Mortgage Tycoon');
  });

  it('models the 9 AM – 6 PM working day as 10 ticks (TDD §4)', () => {
    expect(DAY_END_HOUR - DAY_START_HOUR).toBe(TICKS_PER_DAY - 1);
  });
});
