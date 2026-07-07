/**
 * Character sprite metadata (v8): Talia's eight generated portraits under
 * public/assets/art/char-N.png, tagged by gender so employees always get a
 * sprite that matches their name — and no two teammates share a face while
 * unused sprites remain.
 */

export type SpriteGender = 'm' | 'f';

export const SPRITE_COUNT = 8;

export const SPRITE_GENDER: Record<number, SpriteGender> = {
  1: 'm', // dark wavy hair, olive shirt
  2: 'f', // blonde updo, cream cardigan
  3: 'f', // black bun, glasses
  4: 'm', // glasses, sweater vest
  5: 'm', // dark messy hair, glasses
  6: 'f', // short dark hair, white blouse
  7: 'm', // silver hair, suit
  8: 'f', // long brown hair, cream cardigan
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
