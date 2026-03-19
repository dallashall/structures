/**
 * Shared BabylonJS rendering utilities
 *
 * Pure functions for coordinate conversion, color parsing,
 * position key generation, and block type detection.
 * No dependencies on singletons or scene state.
 */

import { Color3, Vector3 } from '@babylonjs/core';

import type { Vector3D } from '../../types';

/**
 * Parse a hex color string (#RRGGBB) into a BabylonJS Color3
 */
export function hexToColor3(hex: string): Color3 {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return new Color3(r, g, b);
}

/**
 * Convert our coordinate system to BabylonJS coordinate system
 *
 * Our system: Z-up, right-handed (X=width, Y=depth, Z=height)
 * BabylonJS: Y-up, left-handed
 *
 * Conversion:
 * - Our X → Babylon X (width)
 * - Our Y → Babylon Z (depth)
 * - Our Z → Babylon Y (height)
 */
export function toBabylonVector(v: Vector3D): Vector3 {
  return new Vector3(v.x, v.z, v.y);
}

/**
 * Generate a unique string key for a 3D position
 */
export function positionKey(position: Vector3D): string {
  return `${position.x},${position.y},${position.z}`;
}

/**
 * Center a grid-aligned position within its cell by adding 0.5 offset
 */
export function centerInCell(position: Vector3D): Vector3D {
  return {
    x: position.x + 0.5,
    y: position.y + 0.5,
    z: position.z + 0.5,
  };
}

/**
 * Check if a block uses tinted texture rendering (single-texture blocks)
 * These blocks use individually generated tinted textures rather than the shared atlas.
 * Excludes multi-face blocks like grass_block, podzol, mycelium.
 */
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
