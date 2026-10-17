/**
 * Model → Bedrock structure cells, and where to place them around the player
 *
 * App axes are Z-up with north at y-. Bedrock is Y-up with north at -Z, so a cell at app (x, y, z)
 * lands at Bedrock (x, z, y), and the structure size is (width, depth, height).
 *
 * Block states go app → Java → Bedrock: the app state becomes Java property strings, and the Java state
 * key finds the Bedrock block in the table from scripts/buildBedrockBlocks.ts.
 */

import type { AxisDirection, BlockData, BlockStateProperties, Dimensions, HorizontalDirection, MetaBlock } from '../types';
import type { BedrockBlockTable, BedrockTableEntry } from './bedrockBlocks';
import type { BedrockBlock, StructureCell, StructureSize } from './mcstructure';
import { toJavaStateKey } from './bedrockBlocks';
import { rotateLeft } from '../core/DirectionMath';

const AIR: BedrockBlock = { name: 'minecraft:air', states: {} };

const JAVA_DIRECTIONS: Record<AxisDirection, string> = {
  'y-': 'north',
  'y+': 'south',
  'x+': 'east',
  'x-': 'west',
  'z+': 'up',
  'z-': 'down',
};

// Bedrock cardinal order. A placement turns the structure by the difference between two indexes.
const FACING_INDEX: Record<HorizontalDirection, number> = { 'y-': 0, 'x+': 1, 'y+': 2, 'x-': 3 };

export type PlayerFacing = 'north' | 'east' | 'south' | 'west';
export const PLAYER_FACINGS: PlayerFacing[] = ['north', 'east', 'south', 'west'];

export interface Placement {
  rotation: 'None' | 'Rotate90' | 'Rotate180' | 'Rotate270';
  // Added to the anchor block's position, it gives the structure's placed minimum corner
  offset: { x: number; y: number; z: number };
}

export interface BedrockStructure {
  size: StructureSize;
  cells: StructureCell[];
  // Block ID → count, for blocks with no Bedrock equivalent
  skipped: Map<string, number>;
  placements: Record<PlayerFacing, Placement>;
}

/**
 * The stair shape names Java uses, from the app's absolute "{inner|outer}_{facing}_{cornerEdge}" form
 */
function toJavaStairShape(shape: string): string {
  const [kind, facing, cornerEdge] = shape.split('_') as [string, HorizontalDirection, AxisDirection?];
  if (kind === 'straight' || !cornerEdge) return 'straight';
  const side = cornerEdge === rotateLeft(facing) ? 'left' : 'right';
  return `${kind}_${side}`;
}

/**
 * App block state → Java property strings. Properties the app does not track are left for the lookup to fill.
 */
export function toJavaProperties(state: BlockStateProperties): Record<string, string> {
  const properties: Record<string, string> = {};
  for (const [key, value] of Object.entries(state)) {
    if (value === undefined || value === null) continue;
    if (key === 'facing') {
      properties.facing = JAVA_DIRECTIONS[value as AxisDirection] ?? String(value);
    } else if (key === 'shape' && typeof value === 'string' && value.includes('_')) {
      properties.shape = toJavaStairShape(value);
    } else if (key === 'connections' || key === 'wallSides') {
      for (const [direction, side] of Object.entries(value as Record<AxisDirection, boolean | string>)) {
        properties[JAVA_DIRECTIONS[direction as AxisDirection]] = String(side);
      }
    } else if (key !== 'variant') {
      properties[key] = String(value);
    }
  }
  return properties;
}

const parseStateKey = (key: string): Record<string, string> => {
  const properties: Record<string, string> = {};
  const addPair = (pair: string): void => {
    const [name, value] = pair.split('=');
    properties[name] = value;
  };
  if (key) key.split(',').forEach(addPair);
  return properties;
};

/**
 * The table's key for a Java state: the exact state when the table has it. Otherwise the first state that
 * agrees with every property the app set, which fills properties the app does not track with a valid value.
 * The key is a complete, valid Java state, so the Java data pack writes it as is.
 */
export function findJavaStateKey(table: BedrockBlockTable, javaId: string, properties: Record<string, string>): string | null {
  const states = table.blocks[javaId];
  if (!states) return null;

  const exactKey = toJavaStateKey(properties);
  if (exactKey in states) return exactKey;

  const agreesWith = (key: string): boolean => {
    const candidate = parseStateKey(key);
    const agrees = ([name, value]: [string, string]): boolean => !(name in candidate) || candidate[name] === value;
    return Object.entries(properties).every(agrees);
  };
  return Object.keys(states).find(agreesWith) ?? null;
}

export function findBedrockBlock(
  table: BedrockBlockTable,
  javaId: string,
  properties: Record<string, string>,
): BedrockTableEntry | null {
  const key = findJavaStateKey(table, javaId, properties);
  return key === null ? null : table.blocks[javaId][key];
}

/**
 * Turn and corner offset for each way the player can face. Turning the structure by the difference
 * between the player's facing and the meta block's facing makes the player face the meta block's arrow.
 * Rotations are clockwise seen from above.
 */
export function toPlacements(anchor: { x: number; y: number; z: number }, size: StructureSize, facing: HorizontalDirection): Record<PlayerFacing, Placement> {
  const rotations: Placement['rotation'][] = ['None', 'Rotate90', 'Rotate180', 'Rotate270'];
  const toRotatedAnchor = (turns: number): { x: number; z: number } => {
    switch (turns) {
      case 1: return { x: size.z - 1 - anchor.z, z: anchor.x };
      case 2: return { x: size.x - 1 - anchor.x, z: size.z - 1 - anchor.z };
      case 3: return { x: anchor.z, z: size.x - 1 - anchor.x };
      default: return { x: anchor.x, z: anchor.z };
    }
  };

  const placements = {} as Record<PlayerFacing, Placement>;
  const addPlacement = (playerFacing: PlayerFacing, playerIndex: number): void => {
    const turns = (playerIndex - FACING_INDEX[facing] + 4) % 4;
    const rotated = toRotatedAnchor(turns);
    placements[playerFacing] = { rotation: rotations[turns], offset: { x: 0 - rotated.x || 0, y: 0 - anchor.y || 0, z: 0 - rotated.z || 0 } };
  };
  PLAYER_FACINGS.forEach(addPlacement);
  return placements;
}

export function toBedrockStructure(
  dimensions: Dimensions,
  metaBlock: MetaBlock,
  blocks: BlockData[],
  table: BedrockBlockTable,
  toJavaId: (blockId: string) => string,
  keepAnchor = false,
): BedrockStructure {
  const size = { x: dimensions.width, y: dimensions.depth, z: dimensions.height };
  const anchor = { x: metaBlock.position.x, y: metaBlock.position.z, z: metaBlock.position.y };
  const cells: StructureCell[] = [];
  const skipped = new Map<string, number>();

  for (const block of blocks) {
    const { x, y, z } = block.position;
    const isAnchor = x === metaBlock.position.x && y === metaBlock.position.y && z === metaBlock.position.z;
    if (isAnchor && !keepAnchor) continue;

    const entry = findBedrockBlock(table, toJavaId(block.blockType), toJavaProperties(block.blockState ?? {}));
    if (!entry) {
      skipped.set(block.blockType, (skipped.get(block.blockType) ?? 0) + 1);
      continue;
    }
    const [name, states] = entry;
    cells.push({ x, y: z, z: y, block: { name, states } });
  }

  // Without keepAnchor the anchor clears to air, so the player is never buried
  const isAnchorCell = (cell: StructureCell): boolean => cell.x === anchor.x && cell.y === anchor.y && cell.z === anchor.z;
  if (!cells.some(isAnchorCell)) cells.push({ ...anchor, block: AIR });

  return { size, cells, skipped, placements: toPlacements(anchor, size, metaBlock.direction) };
}
