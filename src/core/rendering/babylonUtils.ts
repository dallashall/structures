import { Color3, Vector3 } from '@babylonjs/core';

import type { Vector3D } from '../../types';

/**
 * Expects #RRGGBB
 */
export function hexToColor3(hex: string): Color3 {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return new Color3(r, g, b);
}

/**
 * Model space is Z-up and right-handed. Babylon is Y-up and left-handed.
 * Swapping y and z converts between them with no negation: model (x, y, z) → Babylon (x, z, y).
 * Model x spans dimensions.width, y spans dimensions.height, and z (vertical) spans dimensions.depth.
 */
export function toBabylonVector(v: Vector3D): Vector3 {
  return new Vector3(v.x, v.z, v.y);
}

export function positionKey(position: Vector3D): string {
  return `${position.x},${position.y},${position.z}`;
}

/**
 * A block at integer position p occupies p..p+1, so its mesh sits at p + 0.5
 */
export function centerInCell(position: Vector3D): Vector3D {
  return {
    x: position.x + 0.5,
    y: position.y + 0.5,
    z: position.z + 0.5,
  };
}

export function isTintedTextureBlock(blockId: string): boolean {
  const blockName = blockId.toLowerCase().replace('minecraft:', '');
  return (
    blockName.includes('glass') ||
    blockName.includes('leaves') ||
    blockName === 'grass' ||
    blockName === 'tall_grass' ||
    blockName === 'short_grass' ||
    blockName === 'fern' ||
    blockName === 'large_fern'
  );
}
