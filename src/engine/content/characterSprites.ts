/**
 * Character sprite metadata (v8, cast expanded in v10): Talia's generated
 * portraits under public/assets/art/char-N.png, tagged by gender so employees
 * always get a sprite that matches their name — and no two teammates share a
 * face while unused sprites remain. Sprites 1, 2, and 8 were retired when the
 * bigger cast arrived; the v10 migration re-faces anyone who wore them.
 */

export type SpriteGender = 'm' | 'f';

export const RETIRED_SPRITES: ReadonlySet<number> = new Set([1, 2, 8]);

export const SPRITE_GENDER: Record<number, SpriteGender> = {
  3: 'f', // black bun, glasses
  4: 'm', // glasses, sweater vest
  5: 'm', // dark messy hair, glasses
  6: 'f', // short dark hair, white blouse
  7: 'm', // silver hair, suit
  9: 'f', // curly updo, blue cardigan
  10: 'f', // long brown hair, olive shirt
  11: 'm', // tousled brown hair, stubble
  12: 'm', // salt-and-pepper, glasses
  13: 'f', // blonde, olive shirt
  14: 'f', // long brown hair, cream shirt
  15: 'm', // red curls, black sweater
  16: 'f', // red bun, glasses
};

export function spritesForGender(gender: SpriteGender): number[] {
  return Object.entries(SPRITE_GENDER)
    .filter(([, g]) => g === gender)
    .map(([id]) => Number(id));
}

/**
 * First-name → gender for everyone the game can employ (starter cast +
 * hire-pool candidates). Used by the v8 migration and any future
 * name-driven assignment.
 */
export const FIRST_NAME_GENDER: Record<string, SpriteGender> = {
  // starter team
  Marcus: 'm',
  Dana: 'f',
  Priya: 'f',
  Leo: 'm',
  // hire pool
  Avery: 'f',
  Jordan: 'm',
  Casey: 'f',
  Riley: 'f',
  Morgan: 'f',
  Quinn: 'm',
  Harper: 'f',
  Rowan: 'm',
  Sydney: 'f',
  Emerson: 'm',
  Jamie: 'f',
  Alexis: 'f',
  Taylor: 'f',
  Devon: 'm',
  Skyler: 'f',
  Reese: 'm',
};

export function genderForName(name: string): SpriteGender {
  const first = name.split(/\s+/)[0] ?? '';
  return FIRST_NAME_GENDER[first] ?? 'm';
}
