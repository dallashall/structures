import type { Vector3D, BlockData } from '../types';

/**
 * Read-only interface for block lookups.
 * Implemented by BlockIndex and OverlayBlockIndex.
 */
export interface BlockIndexReader {
  get(position: Vector3D): BlockData | null;
}

/**
 * BlockIndex - Efficient block storage with layer-based queries
 *
 * Combines direct lookup (Map) with spatial indexing (multi-key text index).
 * Maintains three index orderings (xyz, yxz, zxy) for efficient layer queries.
 *
 * This is a data structure, not a singleton - used by Project.blocks
 */
export class BlockIndex implements BlockIndexReader {
  private blocks = new Map<string, BlockData>();

  // Multi-key text index for layer-based queries
  // Three orderings enable efficient prefix-based layer queries:
  // - xyz: "x:5:y:10:z:3" → fast x-layer queries
  // - yxz: "y:10:x:5:z:3" → fast y-layer queries
  // - zxy: "z:3:x:5:y:10" → fast z-layer queries
  private layerIndex = {
    xyz: new Map<string, BlockData[]>(),
    yxz: new Map<string, BlockData[]>(),
    zxy: new Map<string, BlockData[]>(),
  };

  /**
   * Set/update a block at position
   */
  set(position: Vector3D, blockData: BlockData): void {
    const key = this.positionToKey(position);

    // If block already exists, remove from indices first
    const existing = this.blocks.get(key);
    if (existing) {
      this.removeFromIndices(position);
    }

    // Update Map
    this.blocks.set(key, blockData);

    // Update indices
    this.addToIndices(blockData);
  }

  /**
   * Delete a block at position
   */
  delete(position: Vector3D): boolean {
    const key = this.positionToKey(position);
    const existed = this.blocks.delete(key);

    if (existed) {
      this.removeFromIndices(position);
    }

    return existed;
  }

  /**
   * Get a block at position
   */
  get(position: Vector3D): BlockData | null {
    const key = this.positionToKey(position);
    return this.blocks.get(key) || null;
  }

  /**
   * Check if a block exists at position
   */
  has(position: Vector3D): boolean {
    const key = this.positionToKey(position);
    return this.blocks.has(key);
  }

  /**
   * Get all blocks at a specific layer
   * This is the key optimization - O(blocks at layer) instead of O(all blocks)
   */
  getBlocksAtLayer(axis: 'x' | 'y' | 'z', layer: number): BlockData[] {
    const prefix = `${axis}:${layer}:`;
    const blocks: BlockData[] = [];

    // Choose the right index based on which axis we're querying
    const indexMap = axis === 'x' ? this.layerIndex.xyz : axis === 'y' ? this.layerIndex.yxz : this.layerIndex.zxy;

    // Find all keys starting with our prefix (e.g., "y:10:")
    for (const [key, blocksAtKey] of indexMap.entries()) {
      if (key.startsWith(prefix)) {
        blocks.push(...blocksAtKey);
      }
    }

    return blocks;
  }

  /**
   * Get all blocks as an iterator
   */
  values(): IterableIterator<BlockData> {
    return this.blocks.values();
  }

  /**
   * Get all blocks as an array
   */
  toArray(): BlockData[] {
    return Array.from(this.blocks.values());
  }

  /**
   * Get number of blocks
   */
  get size(): number {
    return this.blocks.size;
  }

  /**
   * Clear all blocks and indices
   */
  clear(): void {
    this.blocks.clear();
    this.layerIndex.xyz.clear();
    this.layerIndex.yxz.clear();
    this.layerIndex.zxy.clear();
  }

  /**
   * Iterate over all blocks
   */
  forEach(callback: (blockData: BlockData, key: string) => void): void {
    this.blocks.forEach(callback);
  }

  /**
   * Convert position to string key for Map storage
   */
  private positionToKey(position: Vector3D): string {
    return `${position.x},${position.y},${position.z}`;
  }

  /**
   * Generate all three index keys for a position
   */
  private getIndexKeys(pos: Vector3D) {
    return {
      xyz: `x:${pos.x}:y:${pos.y}:z:${pos.z}`,
      yxz: `y:${pos.y}:x:${pos.x}:z:${pos.z}`,
      zxy: `z:${pos.z}:x:${pos.x}:y:${pos.y}`,
    };
  }

  /**
   * Add block to all layer indices
   */
  private addToIndices(blockData: BlockData): void {
    const keys = this.getIndexKeys(blockData.position);

    this.addToIndex(keys.xyz, this.layerIndex.xyz, blockData);
    this.addToIndex(keys.yxz, this.layerIndex.yxz, blockData);
    this.addToIndex(keys.zxy, this.layerIndex.zxy, blockData);
  }

  /**
   * Add block to specific index
   */
  private addToIndex(key: string, indexMap: Map<string, BlockData[]>, blockData: BlockData): void {
    const existing = indexMap.get(key);
    if (existing) {
      existing.push(blockData);
    } else {
      indexMap.set(key, [blockData]);
    }
  }

  /**
   * Remove block from all layer indices
   */
  private removeFromIndices(position: Vector3D): void {
    const keys = this.getIndexKeys(position);

    this.removeFromIndex(keys.xyz, this.layerIndex.xyz, position);
    this.removeFromIndex(keys.yxz, this.layerIndex.yxz, position);
    this.removeFromIndex(keys.zxy, this.layerIndex.zxy, position);
  }

  /**
   * Remove block from specific index
   */
  private removeFromIndex(key: string, indexMap: Map<string, BlockData[]>, position: Vector3D): void {
    const existing = indexMap.get(key);
    if (!existing) return;

    const filtered = existing.filter(
      (b) => !(b.position.x === position.x && b.position.y === position.y && b.position.z === position.z)
    );

    if (filtered.length === 0) {
      indexMap.delete(key);
    } else {
      indexMap.set(key, filtered);
    }
  }
}
