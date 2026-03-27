/**
 * GeometryFactory - Pure functions for creating non-cube block geometries
 *
 * Creates BabylonJS meshes for slabs, stairs, doors, etc.
 * All meshes are created at the origin with transforms baked into vertices
 * so they can be used as instanced mesh bases.
 */

import {
  MeshBuilder,
  Mesh,
  Vector4,
  Scene,
} from '@babylonjs/core';

import type { BlockStateProperties } from '../../types';

/**
 * Determine the geometry variant key for a given block and its state.
 * Blocks with the same geometry key share a base mesh.
 * Rotation (facing direction) is per-instance, NOT encoded in the key.
 */
export function getGeometryKey(blockId: string, blockState?: BlockStateProperties): string {
  const name = blockId.replace('minecraft:', '');

  if (name.includes('slab')) {
    const slabType = blockState?.type ?? 'bottom';
    return `slab_${slabType}`;
  }

  // Future: stairs, doors
  // if (name.includes('stair')) { ... }
  // if (name.includes('door')) { ... }

  return ''; // cube — default geometry
}

/**
 * Create a slab mesh (half-height block).
 *
 * BabylonJS CreateBox face order: [back, front, right, left, top, bottom]
 * Our faceUV order matches this.
 *
 * For slabs, side face UVs are halved vertically to show only the
 * top or bottom half of the texture.
 */
export function createSlabMesh(
  scene: Scene,
  slabType: 'top' | 'bottom' | 'double',
  faceUVData?: Array<{ u0: number; v0: number; u1: number; v1: number }>,
): Mesh {
  if (slabType === 'double') {
    // Double slab = full cube
    const options: Record<string, unknown> = { size: 1 };
    if (faceUVData) {
      const toVector4 = (uv: { u0: number; v0: number; u1: number; v1: number }): Vector4 =>
        new Vector4(uv.u0, uv.v0, uv.u1, uv.v1);
      options.faceUV = faceUVData.map(toVector4);
    }
    return MeshBuilder.CreateBox('slab_double', options, scene);
  }

  // Half-height slab
  const options: Record<string, unknown> = {
    width: 1,
    height: 0.5,
    depth: 1,
  };

  if (faceUVData) {
    // Adjust side face UVs to show only top or bottom half of texture.
    // Top/bottom faces keep original UVs (full face visible from above/below).
    // Side faces (indices 0-3) get V range halved.
    const adjustedUVs = faceUVData.map(adjustSideFaceUV(slabType));
    const toVector4 = (uv: { u0: number; v0: number; u1: number; v1: number }): Vector4 =>
      new Vector4(uv.u0, uv.v0, uv.u1, uv.v1);
    options.faceUV = adjustedUVs.map(toVector4);
  }

  const mesh = MeshBuilder.CreateBox('slab', options, scene);

  // Offset so the slab sits at bottom or top of the cell
  // BabylonJS Y maps to our Z (height)
  // Cell center is at 0, so bottom=-0.25, top=+0.25
  const yOffset = slabType === 'bottom' ? -0.25 : 0.25;
  mesh.position.y = yOffset;
  mesh.bakeCurrentTransformIntoVertices();

  return mesh;
}

/**
 * Adjust UV coordinates for slab side faces.
 * Side faces (indices 0-3 in BabylonJS face order) are halved vertically.
 * Top face (4) and bottom face (5) keep full UVs.
 */
function adjustSideFaceUV(slabType: 'top' | 'bottom') {
  return (uv: { u0: number; v0: number; u1: number; v1: number }, index: number) => {
    // Indices 4 (top) and 5 (bottom) are full faces — no adjustment
    if (index >= 4) return uv;

    // Side faces: show only half the V range
    const vMid = (uv.v0 + uv.v1) / 2;
    if (slabType === 'bottom') {
      // Bottom slab: show bottom half of texture (higher V values in UV space)
      return { u0: uv.u0, v0: vMid, u1: uv.u1, v1: uv.v1 };
    }
    // Top slab: show top half of texture (lower V values in UV space)
    return { u0: uv.u0, v0: uv.v0, u1: uv.u1, v1: vMid };
  };
}

/**
 * Convert a facing direction to a Y-axis rotation in radians.
 * Used for per-instance rotation of oriented blocks.
 *
 * Assumes the mesh faces south (+Z in Babylon = +Y in our system) by default.
 */
export function facingToYRotation(facing: string): number {
  switch (facing) {
    case 'south': return 0;
    case 'west': return Math.PI / 2;
    case 'north': return Math.PI;
    case 'east': return -Math.PI / 2;
    default: return 0;
  }
}
