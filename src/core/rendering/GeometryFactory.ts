/**
 * GeometryFactory - Slab and stair meshes
 *
 * Each mesh is built at the origin with its transforms baked into the vertices, so it can serve as an instanced base.
 * Coordinates here are Babylon's: y is up.
 */

import {
  MeshBuilder,
  Mesh,
  Vector4,
  Scene,
} from '@babylonjs/core';

/**
 * faceUVData follows CreateBox face order, by normal: +Z, -Z, +X, -X, +Y, -Y.
 * Side faces show only the matching half of the texture.
 */
export function createSlabMesh(
  scene: Scene,
  slabType: 'top' | 'bottom' | 'double',
  faceUVData?: Array<{ u0: number; v0: number; u1: number; v1: number }>,
): Mesh {
  if (slabType === 'double') {
    const options: Record<string, unknown> = { size: 1 };
    if (faceUVData) {
      const toVector4 = (uv: { u0: number; v0: number; u1: number; v1: number }): Vector4 =>
        new Vector4(uv.u0, uv.v0, uv.u1, uv.v1);
      options.faceUV = faceUVData.map(toVector4);
    }
    return MeshBuilder.CreateBox('slab_double', options, scene);
  }

  const options: Record<string, unknown> = {
    width: 1,
    height: 0.5,
    depth: 1,
  };

  if (faceUVData) {
    const adjustedUVs = faceUVData.map(adjustSideFaceUV(slabType));
    const toVector4 = (uv: { u0: number; v0: number; u1: number; v1: number }): Vector4 =>
      new Vector4(uv.u0, uv.v0, uv.u1, uv.v1);
    options.faceUV = adjustedUVs.map(toVector4);
  }

  const mesh = MeshBuilder.CreateBox('slab', options, scene);

  // The cell spans -0.5..0.5, so a half-height box centers at ±0.25
  const yOffset = slabType === 'bottom' ? -0.25 : 0.25;
  mesh.position.y = yOffset;
  mesh.bakeCurrentTransformIntoVertices();

  return mesh;
}

/**
 * A full-width half-height slab plus an upper part that depends on the shape:
 * - straight: the back half
 * - inner: the back half plus a front quarter on the cornerEdge side
 * - outer: only the back quarter on the cornerEdge side
 *
 * Shape strings are "straight_{facing}" or "{inner|outer}_{facing}_{cornerEdge}" (see StairShapeResolver).
 * The mesh is built facing model y+ (Babylon +Z). Per-instance rotation turns it to the other facings.
 * A "top" half stair is the bottom one mirrored vertically.
 */
export function createStairMesh(
  scene: Scene,
  half: 'top' | 'bottom',
  shape: string,
  faceUVData?: Array<{ u0: number; v0: number; u1: number; v1: number }>,
): Mesh {
  const subMeshes: Mesh[] = [];

  const slabY = half === 'bottom' ? -0.25 : 0.25;
  const stepY = half === 'bottom' ? 0.25 : -0.25;
  // For top-half stairs, the step is on the front side (z flipped)
  const zSign = half === 'bottom' ? -1 : 1;

  const slabOptions: Record<string, unknown> = { width: 1, height: 0.5, depth: 1 };
  if (faceUVData) {
    const adjusted = faceUVData.map(adjustSideFaceUV(half === 'bottom' ? 'bottom' : 'top'));
    slabOptions.faceUV = adjusted.map(uvToVector4);
  }
  const slab = MeshBuilder.CreateBox('stair_slab', slabOptions, scene);
  slab.position.y = slabY;
  subMeshes.push(slab);

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

  for (const m of subMeshes) {
    m.bakeCurrentTransformIntoVertices();
  }

  const merged = Mesh.MergeMeshes(subMeshes, true, true, undefined, false, false);
  if (!merged) {
    // MergeMeshes returns null when it cannot merge the parts
    return MeshBuilder.CreateBox('stair_fallback', { size: 1 }, scene);
  }

  merged.name = 'stair';
  return merged;
}

/**
 * cornerEdge is a world direction, but the boxes are built in the unrotated y+ frame,
 * so the corner's x position undoes the instance rotation. Babylon is left-handed,
 * which flips the sign for x facings relative to y facings.
 *
 * facing, cornerEdge → quarter's x in the unrotated frame:
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

  const facing = parts[1];
  const cornerEdge = parts[2];
  const facingAxis = facing.startsWith('x') ? -1 : 1;
  const facingSign = facing.endsWith('+') ? 1 : -1;
  const cornerSign = cornerEdge.endsWith('+') ? 1 : -1;
  const xQuadrant = facingAxis * facingSign * cornerSign * 0.25;

  if (shapeType === 'inner') {
    return [
      { width: 1, depth: 0.5, x: 0, z: backZ },
      { width: 0.5, depth: 0.5, x: xQuadrant, z: frontZ },
    ];
  }

  if (shapeType === 'outer') {
    return [{ width: 0.5, depth: 0.5, x: xQuadrant, z: backZ }];
  }

  return [{ width: 1, depth: 0.5, x: 0, z: backZ }];
}

function uvToVector4(uv: { u0: number; v0: number; u1: number; v1: number }): Vector4 {
  return new Vector4(uv.u0, uv.v0, uv.u1, uv.v1);
}

/**
 * The faceUV field CreateBox puts on each side face's upper edge, in face order +Z, -Z, +X, -X.
 * The opposite field (v1, v0, u0, u0) sits on the lower edge. On ±X faces U runs vertically.
 */
const SIDE_FACE_TOP_FIELD = ['v0', 'v1', 'u1', 'u1'] as const;
const OPPOSITE_FIELD = { u0: 'u1', u1: 'u0', v0: 'v1', v1: 'v0' } as const;

/**
 * Keeps the half of each side face's range (indexes 0-3) that matches the slab half. Top and bottom (4, 5) keep the full face.
 */
function adjustSideFaceUV(slabType: 'top' | 'bottom') {
  const adjustUV = (uv: { u0: number; v0: number; u1: number; v1: number }, index: number) => {
    if (index >= 4) return uv;

    const topField = SIDE_FACE_TOP_FIELD[index];
    const bottomField = OPPOSITE_FIELD[topField];
    const mid = (uv[topField] + uv[bottomField]) / 2;
    // A bottom slab moves its upper edge to the middle of the texture. A top slab moves its lower edge.
    return { ...uv, [slabType === 'bottom' ? topField : bottomField]: mid };
  };
  return adjustUV;
}

