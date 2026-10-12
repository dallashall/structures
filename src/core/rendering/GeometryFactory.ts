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
 * Create a stair mesh by merging sub-boxes.
 *
 * All stairs have a full-width lower slab (half the cell height).
 * The upper portion varies by shape:
 * - straight: back half (1×0.5×0.5)
 * - inner corner: back half + front quarter (side determined by neighbor position)
 * - outer corner: back quarter only (side determined by neighbor position)
 *
 * Shape string format:
 * - "straight_{facing}" - e.g., "straight_y+"
 * - "inner_{facing}_{cornerEdge}" - e.g., "inner_y+_x-"
 * - "outer_{facing}_{cornerEdge}" - e.g., "outer_y+_x+"
 *
 * cornerEdge = the neighbor's back (tall side), which determines
 * where the extra/remaining quarter block goes.
 *
 * Default orientation faces y+ (north, +Z in Babylon).
 * Per-instance rotation handles the 4 facing directions.
 *
 * "bottom" half: lower slab at y=-0.25, upper at y=+0.25
 * "top" half: vertically mirrored
 */
export function createStairMesh(
  scene: Scene,
  half: 'top' | 'bottom',
  shape: string,
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
 *
 * Shape format: "straight_{facing}" or "{inner|outer}_{facing}_{cornerEdge}"
 * cornerEdge is the world-space direction where the quarter goes.
 *
 * Geometry is built in the default y+ frame, then rotated per-instance.
 * We must inverse-rotate the cornerEdge into the default frame's X axis.
 *
 * Babylon uses left-handed coords, so X-axis facings (x+, x-) flip the
 * perpendicular mapping compared to Y-axis facings (y+, y-).
 *
 * Lookup (verified by tracing rotation matrix):
 *   y+, x+ → +0.25    x+, y+ → -0.25
 *   y+, x- → -0.25    x+, y- → +0.25
 *   y-, x+ → -0.25    x-, y+ → +0.25
 *   y-, x- → +0.25    x-, y- → -0.25
 */
function getStairUpperBoxes(
  shape: string,
  _stepY: number,
  zSign: number,
  _faceUVData?: Array<{ u0: number; v0: number; u1: number; v1: number }>,
): Array<{ width: number; depth: number; x: number; z: number }> {
  const backZ = zSign * 0.25;
  const frontZ = -backZ;

  const parts = shape.split('_');
  const shapeType = parts[0];

  if (shapeType === 'straight') {
    return [{ width: 1, depth: 0.5, x: 0, z: backZ }];
  }

  // Transform world-space cornerEdge into default-frame X position.
  // X-axis facings need an extra sign flip due to left-handed rotation.
  const facing = parts[1];
  const cornerEdge = parts[2];
  const facingAxis = facing.startsWith('x') ? -1 : 1;
  const facingSign = facing.endsWith('+') ? 1 : -1;
  const cornerSign = cornerEdge.endsWith('+') ? 1 : -1;
  const xQuadrant = facingAxis * facingSign * cornerSign * 0.25;

  if (shapeType === 'inner') {
    // Full back half + front quarter on cornerEdge side
    return [
      { width: 1, depth: 0.5, x: 0, z: backZ },
      { width: 0.5, depth: 0.5, x: xQuadrant, z: frontZ },
    ];
  }

  if (shapeType === 'outer') {
    // Only back quarter on cornerEdge side
    return [{ width: 0.5, depth: 0.5, x: xQuadrant, z: backZ }];
  }

  return [{ width: 1, depth: 0.5, x: 0, z: backZ }];
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

