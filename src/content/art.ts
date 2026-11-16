// Dimensions and anchors from the supplied graphics pack (logical pixels, 48 px per cell).
export const CAR_VARIANTS = [
  'car_oro', 'car_lila', 'van_terracota', 'car_azul',
  'car_rosa', 'van_lila', 'car_verde', 'van_verde'
] as const;
export const CAR_SIZE = [80, 42] as const;
export const CAR_ANCHOR = [40, 20] as const;
export const CAR_BODY_LENGTH = 68;
export const TILE_IDS = [
  'sidewalk_gate', 'sidewalk_people', 'sidewalk_plain', 'sidewalk_start',
  'island_4', 'island_7', 'island_10', 'street', 'cycleway', 'scooterway',
  'avenue_first', 'avenue_second', 'gate', 'start'
] as const;
export type TileId = typeof TILE_IDS[number];
export const CAR_PATHS = CAR_VARIANTS.map(id=>`art/sprites/${id}.png`);
export const TILE_PATHS = TILE_IDS.map(id=>`art/tiles/${id}.png`);
export const RASTER_PATHS = [...CAR_PATHS, ...TILE_PATHS];
