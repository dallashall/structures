/**
 * GeometryFactory - Slab, stair, and box-model meshes
 *
 * Each mesh is built at the origin with its transforms baked into the vertices, so it can serve as an instanced base.
 * Coordinates here are Babylon's: y is up.
 */

import {
  MeshBuilder,
  Mesh,
  Vector4,
  Scene,
  VertexBuffer,
} from '@babylonjs/core';
import { rotateModelPoint } from '../shapes/BoxModel';
import type { ModelBox, Vec3 } from '../shapes/BoxModel';

type FaceUV = { u0: number; v0: number; u1: number; v1: number };

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


/**
 * Maps a point on a cell face to the UV the full cube shows there, so a box smaller than the cell shows
 * the matching part of each face texture, as Minecraft model elements do.
 */
type CellUVProjector = (position: ArrayLike<number>, normal: ArrayLike<number>) => [number, number];

// CreateBox face order by Babylon normal: +Z, -Z, +X, -X, +Y, -Y
const faceIndexForNormal = (normal: ArrayLike<number>): number => {
  if (normal[2] > 0.5) return 0;
  if (normal[2] < -0.5) return 1;
  if (normal[0] > 0.5) return 2;
  if (normal[0] < -0.5) return 3;
  return normal[1] > 0 ? 4 : 5;
};

// The two in-plane Babylon axes of each face, in face order
const FACE_PLANE_AXES: Array<[number, number]> = [[0, 1], [0, 1], [1, 2], [1, 2], [0, 2], [0, 2]];

function createCellUVProjector(scene: Scene, faceUVData?: FaceUV[]): CellUVProjector {
  const options: Record<string, unknown> = { size: 1 };
  if (faceUVData) options.faceUV = faceUVData.map(uvToVector4);
  const reference = MeshBuilder.CreateBox('uv_reference', options, scene);
  const positions = reference.getVerticesData(VertexBuffer.PositionKind)!;
  const uvs = reference.getVerticesData(VertexBuffer.UVKind)!;
  reference.dispose();

  // UV at the face center, and its change per unit along each in-plane axis. Corners sit at ±0.5.
  const toFaceMapping = (axes: [number, number], face: number) => {
    const center = [0, 0];
    const gradients = [[0, 0], [0, 0]];
    for (let corner = 0; corner < 4; corner++) {
      const vertex = face * 4 + corner;
      for (let c = 0; c < 2; c++) {
        const uv = uvs[vertex * 2 + c];
        center[c] += uv / 4;
        for (let a = 0; a < 2; a++) {
          gradients[a][c] += Math.sign(positions[vertex * 3 + axes[a]]) * uv / 2;
        }
      }
    }
    return { axes, center, gradients };
  };
  const faces = FACE_PLANE_AXES.map(toFaceMapping);

  const projectPoint: CellUVProjector = (position, normal) => {
    const { axes, center, gradients } = faces[faceIndexForNormal(normal)];
    const p0 = position[axes[0]];
    const p1 = position[axes[1]];
    return [
      center[0] + gradients[0][0] * p0 + gradients[1][0] * p1,
      center[1] + gradients[0][1] * p0 + gradients[1][1] * p1,
    ];
  };
  return projectPoint;
}

// Model (x, y, z) in 1/16 units maps to Babylon (x, z, y) in cell units centered on the origin
const babylonToModel = (b: ArrayLike<number>, offset: number, scale: number): Vec3 =>
  [b[offset] * scale, b[offset + 2] * scale, b[offset + 1] * scale];

function buildModelBox(scene: Scene, box: ModelBox, project: CellUVProjector): Mesh {
  const size = (axis: number): number => Math.max(box.to[axis] - box.from[axis], 0.001) / 16;
  const center = (axis: number): number => (box.from[axis] + box.to[axis]) / 32 - 0.5;
  const mesh = MeshBuilder.CreateBox('model_box', { width: size(0), height: size(2), depth: size(1) }, scene);
  mesh.position.set(center(0), center(2), center(1));
  mesh.bakeCurrentTransformIntoVertices();

  const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
  const normals = mesh.getVerticesData(VertexBuffer.NormalKind)!;
  const uvs: number[] = [];
  for (let i = 0; i < positions.length / 3; i++) {
    uvs.push(...project(positions.slice(i * 3, i * 3 + 3), normals.slice(i * 3, i * 3 + 3)));
  }
  mesh.setVerticesData(VertexBuffer.UVKind, uvs);

  if (box.rotation) {
    const { rotation } = box;
    const turnedPositions: number[] = [];
    const turnedNormals: number[] = [];
    const normalRotation = { ...rotation, origin: [0, 0, 0] as Vec3 };
    for (let i = 0; i < positions.length; i += 3) {
      const point = rotateModelPoint(babylonToModel(positions, i, 16).map(shiftToCorner) as Vec3, rotation);
      turnedPositions.push(point[0] / 16 - 0.5, point[2] / 16 - 0.5, point[1] / 16 - 0.5);
      const normal = rotateModelPoint(babylonToModel(normals, i, 1), normalRotation);
      turnedNormals.push(normal[0], normal[2], normal[1]);
    }
    mesh.setVerticesData(VertexBuffer.PositionKind, turnedPositions);
    mesh.setVerticesData(VertexBuffer.NormalKind, turnedNormals);
  }
  return mesh;
}

// Babylon cell coordinates center on the origin. Model coordinates start at the cell corner.
const shiftToCorner = (value: number): number => value + 8;

/**
 * Merges the boxes into one mesh. Coordinates are model axes in 1/16 units (see BoxModel).
 * faceUVData follows CreateBox face order and the atlas 3D table, as for a full cube.
 */
export function createBoxModelMesh(
  scene: Scene,
  name: string,
  boxes: ModelBox[],
  faceUVData?: FaceUV[],
): Mesh {
  const project = createCellUVProjector(scene, faceUVData);
  const build = (box: ModelBox): Mesh => buildModelBox(scene, box, project);
  const parts = boxes.map(build);
  const merged = parts.length === 1 ? parts[0] : Mesh.MergeMeshes(parts, true, true, undefined, false, false);
  if (!merged) {
    // MergeMeshes returns null when it cannot merge the parts
    return MeshBuilder.CreateBox(`${name}_fallback`, { size: 1 }, scene);
  }
  merged.name = name;
  return merged;
}
