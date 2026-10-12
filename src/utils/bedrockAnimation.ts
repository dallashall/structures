/**
 * The block list behind the add-on's scripted build animation
 *
 * The script places blocks one by one, so Bedrock never rotates their states the way it does for a whole
 * structure. The export therefore stores every palette entry turned four ways, and the script picks the turn
 * that makes the player face the meta block's arrow.
 *
 * Turns run clockwise seen from above (north → east), the same as rotateRight. Cell offsets are in Bedrock
 * axes relative to the meta block: x east, y up, z south.
 */

import type { AxisDirection, BlockData, BlockStateProperties, HorizontalDirection, MetaBlock } from '../types';
import type { BedrockBlockTable, BedrockTableEntry } from './bedrockBlocks';
import { findBedrockBlock, toJavaProperties } from './bedrockExport';
import { rotateRight } from '../core/DirectionMath';

export type Rgb = [number, number, number];

export interface AnimatedPaletteEntry {
  // Index = clockwise quarter turns
  rotations: [BedrockTableEntry, BedrockTableEntry, BedrockTableEntry, BedrockTableEntry];
  // 0–1 channels, for the particle that marks the cell before its block lands
  color: Rgb;
}

export interface AnimatedBuild {
  palette: AnimatedPaletteEntry[];
  // Flat [dx, dy, dz, paletteIndex] per block
  cells: number[];
  skipped: Map<string, number>;
}

const FALLBACK_COLOR: Rgb = [0.8, 0.8, 0.8];
const QUARTER_TURNS = [0, 1, 2, 3];
const NO_BEDROCK_BLOCK = -1;
const isMissing = (entry: BedrockTableEntry | null): boolean => entry === null;
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
    } else if (key === 'connections' && value) {
      const connections: Partial<Record<AxisDirection, boolean>> = {};
      for (const [direction, isConnected] of Object.entries(value as Record<string, boolean>)) {
        connections[turnDirection(direction, quarter) as AxisDirection] = isConnected;
      }
      rotated.connections = connections;
    } else if (key === 'rotation' && typeof value === 'number') {
      rotated.rotation = (value + quarter * 4) % 16;
    } else {
      rotated[turnCardinal(key, quarter)] = value;
    }
  }
  return rotated as BlockStateProperties;
}

/**
 * Every block except the meta block's own cell, which the script clears to air before anything lands
 */
export function toAnimatedBuild(
  metaBlock: MetaBlock,
  blocks: BlockData[],
  table: BedrockBlockTable,
  toJavaId: (blockId: string) => string,
  toColor: (blockId: string) => Rgb | null,
): AnimatedBuild {
  const anchor = metaBlock.position;
  const paletteIndexes = new Map<string, number>();
  const palette: AnimatedPaletteEntry[] = [];
  const cells: number[] = [];
  const skipped = new Map<string, number>();

  const toPaletteIndex = (block: BlockData): number => {
    const toRotation = (turns: number): BedrockTableEntry | null =>
      findBedrockBlock(table, toJavaId(block.blockType), toJavaProperties(rotateBlockState(block.blockState ?? {}, turns)));
    const rotations = QUARTER_TURNS.map(toRotation);
    if (rotations.some(isMissing)) return NO_BEDROCK_BLOCK;
    palette.push({
      rotations: rotations as AnimatedPaletteEntry['rotations'],
      color: toColor(block.blockType) ?? FALLBACK_COLOR,
    });
    return palette.length - 1;
  };

  for (const block of blocks) {
    const { x, y, z } = block.position;
    if (x === anchor.x && y === anchor.y && z === anchor.z) continue;

    const key = `${block.blockType}${JSON.stringify(block.blockState ?? {})}`;
    let paletteIndex = paletteIndexes.get(key);
    if (paletteIndex === undefined) {
      paletteIndex = toPaletteIndex(block);
      paletteIndexes.set(key, paletteIndex);
    }
    if (paletteIndex === NO_BEDROCK_BLOCK) {
      skipped.set(block.blockType, (skipped.get(block.blockType) ?? 0) + 1);
      continue;
    }
    // App (x, y, z) with z up → Bedrock (x, z, y) with y up
    cells.push(x - anchor.x, z - anchor.z, y - anchor.y, paletteIndex);
  }

  return { palette, cells, skipped };
}
