import { describe, it, expect } from 'vitest';
import { toBlockVersion, toMcstructure } from '../mcstructure';
import type { StructureCell } from '../mcstructure';

type Parsed = number | string | Parsed[] | { [name: string]: Parsed };

// Little-endian reader, the inverse of nbtWriter, so the tests read back what Bedrock would read
function readNbt(bytes: Uint8Array): { [name: string]: Parsed } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  let offset = 0;

  const readString = (): string => {
    const length = view.getUint16(offset, true);
    offset += 2;
    const text = decoder.decode(bytes.subarray(offset, offset + length));
    offset += length;
    return text;
  };

  const readPayload = (tag: number): Parsed => {
    switch (tag) {
      case 1: {
        const value = view.getInt8(offset);
        offset += 1;
        return value;
      }
      case 3: {
        const value = view.getInt32(offset, true);
        offset += 4;
        return value;
      }
      case 8:
        return readString();
      case 9: {
        const itemTag = view.getInt8(offset);
        const count = view.getInt32(offset + 1, true);
        offset += 5;
        const items: Parsed[] = [];
        for (let i = 0; i < count; i++) items.push(readPayload(itemTag));
        return items;
      }
      case 10: {
        const entries: { [name: string]: Parsed } = {};
        for (;;) {
          const entryTag = view.getInt8(offset);
          offset += 1;
          if (entryTag === 0) return entries;
          const name = readString();
          entries[name] = readPayload(entryTag);
        }
      }
      default:
        throw new Error(`Unexpected tag ${tag}`);
    }
  };

  const rootTag = view.getInt8(0);
  offset = 1;
  readString();
  return readPayload(rootTag) as { [name: string]: Parsed };
}

const STONE = { name: 'minecraft:stone', states: {} };
const STAIRS = { name: 'minecraft:oak_stairs', states: { weirdo_direction: 3, upside_down_bit: true } };
const AIR = { name: 'minecraft:air', states: {} };

describe('toMcstructure', () => {
  const cells: StructureCell[] = [
    { x: 0, y: 0, z: 0, block: STONE },
    { x: 1, y: 0, z: 0, block: STONE },
    { x: 0, y: 1, z: 2, block: STAIRS },
    { x: 1, y: 1, z: 1, block: AIR },
    { x: 5, y: 0, z: 0, block: STONE },
  ];
  const file = readNbt(toMcstructure({ x: 2, y: 2, z: 3 }, cells, toBlockVersion(1, 26, 50)));
  const structure = file.structure as { [name: string]: Parsed };
  const [primary, secondary] = structure.block_indices as number[][];
  const palette = ((structure.palette as Record<string, Parsed>).default as Record<string, Parsed>)
    .block_palette as Array<{ [name: string]: Parsed }>;
  const toName = (entry: { [name: string]: Parsed }): Parsed => entry.name;
  const isStoneIndex = (index: number): boolean => index === 0;
  const isEmpty = (index: number): boolean => index === -1;

  it('writes the size and format version', () => {
    expect(file.format_version).toBe(1);
    expect(file.size).toEqual([2, 2, 3]);
  });

  it('orders cells with Z fastest, then Y, then X, and leaves empty cells at -1', () => {
    expect(primary).toHaveLength(12);
    const at = (x: number, y: number, z: number): number => primary[(x * 2 + y) * 3 + z];
    expect(palette.map(toName)).toEqual(['minecraft:stone', 'minecraft:oak_stairs', 'minecraft:air']);
    expect([at(0, 0, 0), at(1, 0, 0), at(0, 1, 2), at(1, 1, 1), at(0, 0, 1)]).toEqual([0, 0, 1, 2, -1]);
  });

  it('drops cells outside the size and keeps the second layer empty', () => {
    expect(primary.filter(isStoneIndex)).toHaveLength(2);
    expect(secondary.every(isEmpty)).toBe(true);
  });

  it('writes state types the way Bedrock reads them: ints as ints, booleans as bytes', () => {
    expect(palette[1].states).toEqual({ weirdo_direction: 3, upside_down_bit: 1 });
    expect(palette[1].version).toBe(toBlockVersion(1, 26, 50) | 0);
  });
});

describe('toBlockVersion', () => {
  it('packs one byte per part', () => {
    expect(toBlockVersion(1, 21, 60, 33)).toBe(18168865);
  });
});
