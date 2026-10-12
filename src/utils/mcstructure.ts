/**
 * Bedrock .mcstructure files
 *
 * Coordinates here are Bedrock's: Y is up. Block indices run in Z-Y-X order, so Z changes fastest.
 * A cell with no block holds -1, which leaves the world's block in place when the structure loads.
 * The second layer holds waterlogging and stays empty.
 */

import type { NbtValue } from './nbtWriter';
import { nbtByte, nbtCompound, nbtInt, nbtList, nbtString, writeNbt } from './nbtWriter';

export type BedrockStateValue = string | number | boolean;

export interface BedrockBlock {
  name: string;
  states: Record<string, BedrockStateValue>;
}

export interface StructureCell {
  x: number;
  y: number;
  z: number;
  block: BedrockBlock;
}

export interface StructureSize {
  x: number;
  y: number;
  z: number;
}

const EMPTY_CELL = -1;
const FORMAT_VERSION = 1;

/**
 * Bedrock's packed version int: one byte each for major, minor, patch, and revision
 */
export function toBlockVersion(major: number, minor: number, patch: number, revision = 0): number {
  return ((major << 24) | (minor << 16) | (patch << 8) | revision) >>> 0;
}

const toStateTag = (value: BedrockStateValue): NbtValue => {
  if (typeof value === 'boolean') return nbtByte(value ? 1 : 0);
  if (typeof value === 'number') return nbtInt(value);
  return nbtString(value);
};

const toPaletteKey = ({ name, states }: BedrockBlock): string => {
  const byKey = ([a]: [string, BedrockStateValue], [b]: [string, BedrockStateValue]): number => a.localeCompare(b);
  return `${name}${JSON.stringify(Object.entries(states).sort(byKey))}`;
};

export function toMcstructure(size: StructureSize, cells: StructureCell[], blockVersion: number): Uint8Array {
  const cellCount = size.x * size.y * size.z;
  const primary = new Array<number>(cellCount).fill(EMPTY_CELL);
  const paletteIndexes = new Map<string, number>();
  const palette: BedrockBlock[] = [];

  for (const cell of cells) {
    const isInside =
      cell.x >= 0 && cell.x < size.x && cell.y >= 0 && cell.y < size.y && cell.z >= 0 && cell.z < size.z;
    if (!isInside) continue;

    const key = toPaletteKey(cell.block);
    let paletteIndex = paletteIndexes.get(key);
    if (paletteIndex === undefined) {
      paletteIndex = palette.length;
      paletteIndexes.set(key, paletteIndex);
      palette.push(cell.block);
    }
    primary[(cell.x * size.y + cell.y) * size.z + cell.z] = paletteIndex;
  }

  const toIndexTag = (index: number): NbtValue => nbtInt(index);
  const toStatesTag = (states: Record<string, BedrockStateValue>): NbtValue => {
    const entries: Record<string, NbtValue> = {};
    for (const [key, value] of Object.entries(states)) entries[key] = toStateTag(value);
    return nbtCompound(entries);
  };
  const toPaletteTag = (block: BedrockBlock): NbtValue =>
    nbtCompound({ name: nbtString(block.name), states: toStatesTag(block.states), version: nbtInt(blockVersion | 0) });

  return writeNbt(
    nbtCompound({
      format_version: nbtInt(FORMAT_VERSION),
      size: nbtList('int', [nbtInt(size.x), nbtInt(size.y), nbtInt(size.z)]),
      structure: nbtCompound({
        block_indices: nbtList('list', [
          nbtList('int', primary.map(toIndexTag)),
          nbtList('int', new Array<number>(cellCount).fill(EMPTY_CELL).map(toIndexTag)),
        ]),
        entities: nbtList('compound', []),
        palette: nbtCompound({
          default: nbtCompound({
            block_palette: nbtList('compound', palette.map(toPaletteTag)),
            block_position_data: nbtCompound({}),
          }),
        }),
      }),
      structure_world_origin: nbtList('int', [nbtInt(0), nbtInt(0), nbtInt(0)]),
    }),
  );
}
