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

  if (name.includes('stair')) {
    const half = blockState?.half ?? 'bottom';
    const shape = blockState?.shape ?? 'straight';
    return `stair_${half}_${shape}`;
  }

  // Future: doors
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

export type StairShape = 'straight' | 'inner_left' | 'inner_right' | 'outer_left' | 'outer_right';

/**
 * Create a stair mesh by merging sub-boxes.
 *
 * All stairs have a full-width lower slab (half the cell height).
 * The upper portion varies by shape:
 * - straight: back half (1×0.5×0.5)
 * - inner_left: back half + front-left quarter
 * - inner_right: back half + front-right quarter
 * - outer_left: back-left quarter only (0.5×0.5×0.5)
 * - outer_right: back-right quarter only (0.5×0.5×0.5)
 *
 * Default orientation faces back (+Z in Babylon = +Y in our system).
 * Per-instance rotation handles the 4 facing directions.
 *
 * "bottom" half: lower slab at y=-0.25, upper at y=+0.25
 * "top" half: vertically mirrored
 */
export function createStairMesh(
  scene: Scene,
  half: 'top' | 'bottom',
  shape: StairShape,
  faceUVData?: Array<{ u0: number; v0: number; u1: number; v1: number }>,
): Mesh {
  const subMeshes: Mesh[] = [];

  // Y offsets: bottom half has slab below, step above. Top half is mirrored.
  const slabY = half === 'bottom' ? -0.25 : 0.25;
  const stepY = half === 'bottom' ? 0.25 : -0.25;
  // For top-half stairs, the step is on the front side (z flipped)
  const zSign = half === 'bottom' ? -1 : 1;

  // 1. Lower slab (always full-width 1×0.5×1)
  const slabOptions: Record<string, unknown> = { width: 1, height: 0.5, depth: 1 };
  if (faceUVData) {
    const adjusted = faceUVData.map(adjustSideFaceUV(half === 'bottom' ? 'bottom' : 'top'));
    slabOptions.faceUV = adjusted.map(uvToVector4);
  }
  const slab = MeshBuilder.CreateBox('stair_slab', slabOptions, scene);
  slab.position.y = slabY;
  subMeshes.push(slab);

  // 2. Upper portion — varies by shape
  const upperBoxes = getStairUpperBoxes(shape, stepY, zSign, faceUVData);
  for (const boxDef of upperBoxes) {
    const opts: Record<string, unknown> = {
      width: boxDef.width,
      height: 0.5,
      depth: boxDef.depth,
    };
    if (faceUVData) {
      const adjusted = faceUVData.map(adjustSideFaceUV(half === 'bottom' ? 'top' : 'bottom'));
      opts.faceUV = adjusted.map(uvToVector4);
    }
    const box = MeshBuilder.CreateBox('stair_step', opts, scene);
    box.position.set(boxDef.x, stepY, boxDef.z);
    subMeshes.push(box);
  }

  // Bake positions into vertices before merging
  for (const m of subMeshes) {
    m.bakeCurrentTransformIntoVertices();
  }

  const merged = Mesh.MergeMeshes(subMeshes, true, true, undefined, false, false);
  if (!merged) {
    // Fallback — shouldn't happen
    return MeshBuilder.CreateBox('stair_fallback', { size: 1 }, scene);
  }

  merged.name = 'stair';
  return merged;
}

/**
 * Get upper portion sub-box definitions for a stair shape.
 * All positions assume default facing (south), bottom half.
 */
function getStairUpperBoxes(
  shape: StairShape,
  _stepY: number,
  zSign: number,
  _faceUVData?: Array<{ u0: number; v0: number; u1: number; v1: number }>,
): Array<{ width: number; depth: number; x: number; z: number }> {
  // "Back" = the direction opposite to facing = -Z for south-facing.
  // For bottom half, back is -Z (zSign = -1). For top half, it's +Z (zSign = 1).
  const backZ = zSign * 0.25;

  switch (shape) {
    case 'straight':
      // Full-width back half
      return [{ width: 1, depth: 0.5, x: 0, z: backZ }];

    case 'inner_left':
      // Back half + front-right quarter (inner corner fills more)
      return [
        { width: 1, depth: 0.5, x: 0, z: backZ },
        { width: 0.5, depth: 0.5, x: 0.25, z: -backZ },
      ];

    case 'inner_right':
      // Back half + front-left quarter
      return [
        { width: 1, depth: 0.5, x: 0, z: backZ },
        { width: 0.5, depth: 0.5, x: -0.25, z: -backZ },
      ];

    case 'outer_left':
      // Only back-left quarter
      return [{ width: 0.5, depth: 0.5, x: -0.25, z: backZ }];

    case 'outer_right':
      // Only back-right quarter
      return [{ width: 0.5, depth: 0.5, x: 0.25, z: backZ }];
  }
}

function uvToVector4(uv: { u0: number; v0: number; u1: number; v1: number }): Vector4 {
  return new Vector4(uv.u0, uv.v0, uv.u1, uv.v1);
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

