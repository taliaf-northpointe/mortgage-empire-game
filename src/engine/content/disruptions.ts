/**
 * Office disruptions (GDD §6 negative events — playtest request 2026-07-06):
 * once the office is established, some mornings bring a mishap that makes the
 * day harder. Deterministic per (rngSeed, day), like lead spawning.
 */
import {
  COFFEE_OUT_HAPPINESS_HIT,
  DISRUPTION_BASE_CHANCE,
  DISRUPTION_CHANCE_MAX,
  DISRUPTION_CHANCE_PER_LEVEL,
  DISRUPTION_START_DAY,
} from '../constants';
import { mulberry32 } from '../rng';
import type { DisruptionKind, GameEvent, GameState } from '../types';

export interface DisruptionDef {
  kind: DisruptionKind;
  /** Event feed + toast copy when it strikes. */
  title: string;
  detail: string;
  /** Copy when it clears. */
  overTitle: string;
  overDetail: string;
  /** Inclusive range of in-game hours it lasts. */
  hours: [number, number];
  /** Short label for the HUD chip while active. */
  chip: string;
}

export const DISRUPTIONS: DisruptionDef[] = [
  {
    kind: 'wifiDown',
    title: 'The Wi-Fi is down! 📡',
    detail: "A ticket is open with IT. Nothing moves until the router blinks green again — they say they're on it.",
    overTitle: 'IT saved the day 🎉',
    overDetail: 'The Wi-Fi is back. Everyone pretends they were working the whole time.',
    hours: [1, 2],
    chip: '📡 Wi-Fi down',
  },
  {
    kind: 'printerJam',
    title: 'The printer is jammed! 🖨️',
    detail: 'Paper tray three strikes again. Incoming documents are stuck until someone wrestles it open.',
    overTitle: 'Printer unjammed 🎉',
    overDetail: 'A brave soul freed the paper tray. Documents are flowing again.',
    hours: [1, 2],
    chip: '🖨️ Printer jammed',
  },
  {
    kind: 'systemUpdate',
    title: 'Surprise system update 💿',
    detail: 'The loan software chose today to install updates. Everyone is working at half speed.',
    overTitle: 'Update installed 🎉',
    overDetail: 'The progress bar finally finished. Back to full speed.',
    hours: [2, 3],
    chip: '💿 System updating',
  },
  {
    kind: 'coffeeOut',
    title: 'The coffee machine broke! ☕',
    detail: 'A dark day for morale. The repair tech is on the way, but the team is running on fumes.',
    overTitle: 'Coffee is back ☕🎉',
    overDetail: 'The machine gurgles happily once more. Morale will recover.',
    hours: [1, 1],
    chip: '☕ Coffee down',
  },
];

export const DISRUPTION_BY_KIND: Record<DisruptionKind, DisruptionDef> = Object.fromEntries(
  DISRUPTIONS.map((def) => [def.kind, def]),
) as Record<DisruptionKind, DisruptionDef>;

function pushDisruptionEvent(state: GameState, title: string, detail: string): void {
  const { day, hour } = state.clock;
  const event: GameEvent = {
    id: `evt-${day}-${hour}-${state.eventLog.length}`,
    day,
    hour,
    category: 'alerts',
    title,
    detail,
  };
  state.eventLog.push(event);
}

/**
 * Maybe start a mishap this morning (mutates the already-cloned state).
 * Never stacks: one disruption at a time, and never before DISRUPTION_START_DAY.
 */
export function maybeSpawnDisruption(state: GameState): void {
  if (state.disruption) return;
  if (state.clock.day < DISRUPTION_START_DAY) return;

  const rng = mulberry32((state.rngSeed ^ (state.clock.day * 74_207_281 + 13)) >>> 0);
  const chance = Math.min(
    DISRUPTION_CHANCE_MAX,
    DISRUPTION_BASE_CHANCE + (state.stats.level - 1) * DISRUPTION_CHANCE_PER_LEVEL,
  );
  if (rng.next() >= chance) return;

  const def = DISRUPTIONS[rng.int(0, DISRUPTIONS.length - 1)];
  if (!def) return;
  state.disruption = { kind: def.kind, hoursLeft: rng.int(def.hours[0], def.hours[1]) };
  if (def.kind === 'coffeeOut') {
    for (const employee of Object.values(state.employees)) {
      employee.happiness = Math.max(0, employee.happiness - COFFEE_OUT_HAPPINESS_HIT);
    }
  }
  pushDisruptionEvent(state, def.title, def.detail);
}

/** Tick the active disruption down one hour; clears it (with good news) at zero. */
export function tickDisruption(state: GameState): void {
  if (!state.disruption) return;
  state.disruption.hoursLeft -= 1;
  if (state.disruption.hoursLeft <= 0) {
    const def = DISRUPTION_BY_KIND[state.disruption.kind];
    state.disruption = null;
    if (def) pushDisruptionEvent(state, def.overTitle, def.overDetail);
  }
}
