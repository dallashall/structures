/**
 * The block list behind the animated build, shared by the Bedrock add-on and the Java data pack
 *
 * Both games place the blocks one by one, so neither rotates their states the way it does for a whole
 * structure. The export therefore stores every palette entry turned four ways, and the game picks the turn
 * that makes the player face the meta block's arrow. Each edition supplies its own lookup from a Java block
 * state to the entry it stores.
 *
 * Turns run clockwise seen from above (north → east), the same as rotateRight. Cell offsets are in game
 * axes relative to the meta block: x east, y up, z south.
 */

import type { AxisDirection, BlockData, BlockStateProperties, HorizontalDirection, MetaBlock } from '../types';
import { toJavaProperties } from './bedrockExport';
import { rotateRight } from '../core/DirectionMath';

export type Rgb = [number, number, number];

export interface AnimatedPaletteEntry<Entry> {
  // Index = clockwise quarter turns
  rotations: [Entry, Entry, Entry, Entry];
  // 0–1 channels, for the particle that marks the cell before its block lands
  color: Rgb;
}

export interface AnimatedBuild<Entry> {
  palette: AnimatedPaletteEntry<Entry>[];
  // Flat [dx, dy, dz, paletteIndex] per block
  cells: number[];
  skipped: Map<string, number>;
}

const FALLBACK_COLOR: Rgb = [0.8, 0.8, 0.8];
const QUARTER_TURNS = [0, 1, 2, 3];
const NO_ENTRY = -1;
const isMissing = (entry: unknown): boolean => entry === null;
// Minecraft's names for horizontal sides, clockwise from north. Wall heights keep these as keys.
const CARDINALS = ['north', 'east', 'south', 'west'];

const isHorizontal = (direction: string): direction is HorizontalDirection =>
  direction === 'x+' || direction === 'x-' || direction === 'y+' || direction === 'y-';

const turnDirection = (direction: string, turns: number): string => {
  let turned = direction;
  for (let i = 0; i < turns; i++) {
    if (isHorizontal(turned)) turned = rotateRight(turned);
  }
  return turned;
};

const turnCardinal = (name: string, turns: number): string => {
  const index = CARDINALS.indexOf(name);
  return index < 0 ? name : CARDINALS[(index + turns) % 4];
};

/**
 * The block state as it reads after the block turns clockwise by `turns` quarter turns, seen from above
 */
export function rotateBlockState(state: BlockStateProperties, turns: number): BlockStateProperties {
  const quarter = ((turns % 4) + 4) % 4;
  if (quarter === 0) return state;

  const rotated: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(state)) {
    if (key === 'facing' && typeof value === 'string') {
      rotated.facing = turnDirection(value, quarter);
    } else if (key === 'axis' && (value === 'x' || value === 'y')) {
      rotated.axis = quarter % 2 === 1 ? (value === 'x' ? 'y' : 'x') : value;
    } else if (key === 'shape' && typeof value === 'string') {
      const toTurnedPart = (part: string): string => turnDirection(part, quarter);
      rotated.shape = value.split('_').map(toTurnedPart).join('_');
    } else if ((key === 'connections' || key === 'wallSides') && value) {
      const sides: Partial<Record<AxisDirection, unknown>> = {};
      for (const [direction, side] of Object.entries(value as Record<string, unknown>)) {
        sides[turnDirection(direction, quarter) as AxisDirection] = side;
      }
      rotated[key] = sides;
    } else if (key === 'rotation' && typeof value === 'number') {
      rotated.rotation = (value + quarter * 4) % 16;
    } else {
      rotated[turnCardinal(key, quarter)] = value;
    }
  }
  return rotated as BlockStateProperties;
}

/**
 * Every block, except the meta block's own cell unless keepAnchor is set. The game clears that cell to air before
 * anything lands, so a wand never buries the player who stands there.
 * findEntry looks up an app block ID with Java properties, and returns null when the edition has no such block.
 */
export function toAnimatedBuild<Entry>(
  metaBlock: MetaBlock,
  blocks: BlockData[],
  findEntry: (blockId: string, properties: Record<string, string>) => Entry | null,
  toColor: (blockId: string) => Rgb | null,
  keepAnchor = false,
): AnimatedBuild<Entry> {
  const anchor = metaBlock.position;
  const paletteIndexes = new Map<string, number>();
  const palette: AnimatedPaletteEntry<Entry>[] = [];
  const cells: number[] = [];
  const skipped = new Map<string, number>();

  const toPaletteIndex = (block: BlockData): number => {
    const toRotation = (turns: number): Entry | null =>
      findEntry(block.blockType, toJavaProperties(rotateBlockState(block.blockState ?? {}, turns)));
    const rotations = QUARTER_TURNS.map(toRotation);
    if (rotations.some(isMissing)) return NO_ENTRY;
    palette.push({
      rotations: rotations as AnimatedPaletteEntry<Entry>['rotations'],
      color: toColor(block.blockType) ?? FALLBACK_COLOR,
    });
    return palette.length - 1;
  };

  for (const block of blocks) {
    const { x, y, z } = block.position;
    if (!keepAnchor && x === anchor.x && y === anchor.y && z === anchor.z) continue;

    const key = `${block.blockType}${JSON.stringify(block.blockState ?? {})}`;
    let paletteIndex = paletteIndexes.get(key);
    if (paletteIndex === undefined) {
      paletteIndex = toPaletteIndex(block);
      paletteIndexes.set(key, paletteIndex);
    }
    if (paletteIndex === NO_ENTRY) {
      skipped.set(block.blockType, (skipped.get(block.blockType) ?? 0) + 1);
      continue;
    }
    // App (x, y, z) with z up → game (x, z, y) with y up, the same in Bedrock and Java
    cells.push(x - anchor.x, z - anchor.z, y - anchor.y, paletteIndex);
  }

  return { palette, cells, skipped };
}
