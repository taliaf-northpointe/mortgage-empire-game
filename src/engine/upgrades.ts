/**
 * Upgrade tree logic (GDD §7): purchase flow and effect lookups.
 * Effect rates live in constants.ts; definitions in content/upgrades.ts.
 */
import {
  MARKETING_REPUTATION_PER_PURCHASE,
  OFFICE_ART_STAGES,
  UPGRADES_SCREEN_LEVEL,
  UPGRADES_TIER45_LEVEL,
} from './constants';
import { UPGRADES, UPGRADES_BY_ID } from './content/upgrades';
import type { UpgradeCategory } from './content/upgrades';
import type { GameEvent, GameState } from './types';

function pushEvent(state: GameState, category: GameEvent['category'], title: string, detail: string): void {
  const { day, hour } = state.clock;
  const n = state.eventLog.length;
  state.eventLog.push({ id: `evt-${day}-${hour}-${n}`, day, hour, category, title, detail });
}

/** Fresh upgrade map for a new game: tier 1 available, everything else locked. */
export function initialUpgradeStates(): GameState['upgrades'] {
  const states: GameState['upgrades'] = {};
  for (const upgrade of UPGRADES) {
    states[upgrade.id] = upgrade.tier === 1 ? 'available' : 'locked';
  }
  return states;
}

/** How many tiers of a category are purchased — drives every passive effect. */
export function tiersOwned(state: GameState, category: UpgradeCategory): number {
  return UPGRADES.filter((u) => u.category === category && state.upgrades[u.id] === 'purchased').length;
}

export function totalPurchased(state: GameState): number {
  return UPGRADES.filter((u) => state.upgrades[u.id] === 'purchased').length;
}

/**
 * Which office room the player has earned (GDD §7 — the office visibly grows).
 * Office-category tiers map to Talia's staged art: 0–1 tiers → stage 1,
 * 2–3 → stage 2, 4–5 → stage 3 (office-room-N.png + desk-N.png).
 */
export function officeStage(state: GameState): number {
  return Math.min(OFFICE_ART_STAGES, 1 + Math.floor(tiersOwned(state, 'office') / 2));
}

/** Why a purchase isn't possible right now, or null if it is. */
export function purchaseBlockedReason(state: GameState, upgradeId: string): string | null {
  const def = UPGRADES_BY_ID[upgradeId];
  if (!def) return 'Unknown upgrade.';
  if (state.stats.level < UPGRADES_SCREEN_LEVEL) return `Reach Level ${UPGRADES_SCREEN_LEVEL} (Branch Manager) first.`;
  const status = state.upgrades[upgradeId];
  if (status === 'purchased') return 'Already yours!';
  if (status !== 'available') return 'Buy the previous tier first.';
  if (def.tier >= 4 && state.stats.level < UPGRADES_TIER45_LEVEL)
    return `Tiers 4–5 unlock at Level ${UPGRADES_TIER45_LEVEL} (Regional Director).`;
  if (state.currencies.coins < def.cost) return 'Not enough coins yet.';
  return null;
}

/** Purchase an upgrade (GDD §7). Pure: same-reference refusal when blocked. */
export function purchaseUpgrade(state: GameState, upgradeId: string): GameState {
  if (purchaseBlockedReason(state, upgradeId)) return state;
  const def = UPGRADES_BY_ID[upgradeId];
  if (!def) return state;

  const s = structuredClone(state);
  s.currencies.coins -= def.cost;
  s.upgrades[upgradeId] = 'purchased';

  // unlock the next tier in this category
  const next = UPGRADES.find((u) => u.category === def.category && u.tier === def.tier + 1);
  if (next && s.upgrades[next.id] === 'locked') s.upgrades[next.id] = 'available';

  // instant effects
  if (def.category === 'marketing') {
    s.stats.reputation = Math.min(100, s.stats.reputation + MARKETING_REPUTATION_PER_PURCHASE);
  }

  pushEvent(s, 'loans', `Upgrade purchased: ${def.name}`, def.flavor);
  return s;
}
