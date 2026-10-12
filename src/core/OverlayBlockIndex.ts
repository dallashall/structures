/**
 * OverlayBlockIndex - Preview blocks laid over the committed blocks, preview winning at a shared position.
 * DraftingService hands it to deriveState, so a preview stair turns corners against other preview stairs.
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
