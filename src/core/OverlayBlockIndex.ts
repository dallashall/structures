/**
 * OverlayBlockIndex - Combines base blocks with uncommitted preview blocks
 *
 * Implements BlockIndexReader so it can be passed to deriveState().
 * Preview blocks override base blocks at the same position.
 * Used by DraftingService for accurate preview derivation — the derived
 * state of a preview stair needs to "see" other preview stairs nearby.
 */

import type { BlockIndexReader } from './BlockIndex';
import type { BlockData, Vector3D } from '../types';

export class OverlayBlockIndex implements BlockIndexReader {
  private overlay = new Map<string, BlockData>();

  constructor(
    private base: BlockIndexReader,
    previewBlocks: BlockData[],
  ) {
    for (const block of previewBlocks) {
      const key = `${block.position.x},${block.position.y},${block.position.z}`;
      this.overlay.set(key, block);
    }
  }

  get(position: Vector3D): BlockData | null {
    const key = `${position.x},${position.y},${position.z}`;
    return this.overlay.get(key) ?? this.base.get(position);
  }
}
