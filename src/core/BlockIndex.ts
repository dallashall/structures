import type { Vector3D, BlockData } from '../types';

// deriveState reads neighbors through this, so a preview can see committed blocks and other preview blocks alike
export interface BlockIndexReader {
  get(position: Vector3D): BlockData | null;
}

/**
 * BlockIndex - Blocks keyed by position. Iteration follows the order blocks were first set,
 * which Babylon3D relies on to grow a stroke in stroke order.
 */
export class BlockIndex implements BlockIndexReader {
  private blocks = new Map<string, BlockData>();

  // One map per axis, keyed with that axis first ("y:10:x:5:z:3"), so a layer query matches a key prefix.
  // getBlocksAtLayer still scans every key of the chosen map.
  private layerIndex = {
    xyz: new Map<string, BlockData[]>(),
    yxz: new Map<string, BlockData[]>(),
    zxy: new Map<string, BlockData[]>(),
  };

  set(position: Vector3D, blockData: BlockData): void {
    const key = this.positionToKey(position);

    const existing = this.blocks.get(key);
    if (existing) {
      this.removeFromIndices(position);
    }

    this.blocks.set(key, blockData);
    this.addToIndices(blockData);
  }

  delete(position: Vector3D): boolean {
    const key = this.positionToKey(position);
    const existed = this.blocks.delete(key);

    if (existed) {
      this.removeFromIndices(position);
    }

    return existed;
  }

  get(position: Vector3D): BlockData | null {
    const key = this.positionToKey(position);
    return this.blocks.get(key) || null;
  }

  getBlocksAtLayer(axis: 'x' | 'y' | 'z', layer: number): BlockData[] {
    const prefix = `${axis}:${layer}:`;
    const blocks: BlockData[] = [];

    const indexMap = axis === 'x' ? this.layerIndex.xyz : axis === 'y' ? this.layerIndex.yxz : this.layerIndex.zxy;

    for (const [key, blocksAtKey] of indexMap.entries()) {
      if (key.startsWith(prefix)) {
        blocks.push(...blocksAtKey);
      }
    }

    return blocks;
  }

  toArray(): BlockData[] {
    return Array.from(this.blocks.values());
  }

  get size(): number {
    return this.blocks.size;
  }

  forEach(callback: (blockData: BlockData, key: string) => void): void {
    this.blocks.forEach(callback);
  }

  private positionToKey(position: Vector3D): string {
    return `${position.x},${position.y},${position.z}`;
  }

  private getIndexKeys(pos: Vector3D) {
    return {
      xyz: `x:${pos.x}:y:${pos.y}:z:${pos.z}`,
      yxz: `y:${pos.y}:x:${pos.x}:z:${pos.z}`,
      zxy: `z:${pos.z}:x:${pos.x}:y:${pos.y}`,
    };
  }

  private addToIndices(blockData: BlockData): void {
    const keys = this.getIndexKeys(blockData.position);

    this.addToIndex(keys.xyz, this.layerIndex.xyz, blockData);
    this.addToIndex(keys.yxz, this.layerIndex.yxz, blockData);
    this.addToIndex(keys.zxy, this.layerIndex.zxy, blockData);
  }

  private addToIndex(key: string, indexMap: Map<string, BlockData[]>, blockData: BlockData): void {
    const existing = indexMap.get(key);
    if (existing) {
      existing.push(blockData);
    } else {
      indexMap.set(key, [blockData]);
    }
  }

  private removeFromIndices(position: Vector3D): void {
    const keys = this.getIndexKeys(position);

    this.removeFromIndex(keys.xyz, this.layerIndex.xyz, position);
    this.removeFromIndex(keys.yxz, this.layerIndex.yxz, position);
    this.removeFromIndex(keys.zxy, this.layerIndex.zxy, position);
  }

  private removeFromIndex(key: string, indexMap: Map<string, BlockData[]>, position: Vector3D): void {
    const existing = indexMap.get(key);
    if (!existing) return;

    const isElsewhere = (block: BlockData): boolean =>
      !(block.position.x === position.x && block.position.y === position.y && block.position.z === position.z);
    const filtered = existing.filter(isElsewhere);

    if (filtered.length === 0) {
      indexMap.delete(key);
    } else {
      indexMap.set(key, filtered);
    }
  }
}
