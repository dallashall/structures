/**
 * DoorShape - A 3-thick panel in each of two stacked cells
 *
 * The paint pipeline stores the lower half with half 'lower' and the upper half above it with half 'upper'
 * (see PaintPipeline.pairDoorHalves). The upper half copies its facing, hinge, and open state from the lower half.
 *
 * The hinge follows Minecraft's placement rule, read from the neighbors on every derive:
 * - A door of the same type on the left makes a double door, so the hinge goes right. One on the right puts it left.
 * - Otherwise the side with more full blocks, counting both halves, holds the hinge. A tie puts it left.
 * Left and right are as seen looking toward the facing. A stored hingeFlipped swaps the result.
 *
 * Closed, the panel sits on the cell edge opposite the facing, as in Minecraft.
 */

import type { BlockShape, ClipPath, FaceUVData } from './BlockShape';
import type { ModelBox } from './BoxModel';
import type { Scene, Mesh } from '@babylonjs/core';
import type { BlockStateProperties, ViewType, Vector3D, HorizontalDirection, BlockData } from '../../types';
import type { BlockIndexReader } from '../BlockIndex';
import { project2D, turnBoxesAboutZ } from './BoxModel';
import { createBoxModelMesh } from '../rendering/GeometryFactory';
import { directionToOffset, addOffset, rotateLeft, rotateRight } from '../DirectionMath';
import { shapeCatalog } from './ShapeCatalog';

// Built facing y+: the closed panel lies on the y- edge, and a left hinge sits at x 16
const CLOSED_PANEL: ModelBox = { from: [0, 0, 0], to: [16, 3, 16] };

// Open, the panel swings about its hinge to lie along the hinge-side edge
const OPEN_PANELS: Record<'left' | 'right', ModelBox> = {
  left: { ...CLOSED_PANEL, rotation: { axis: 'z', angle: -Math.PI / 2, origin: [14.5, 1.5, 0] } },
  right: { ...CLOSED_PANEL, rotation: { axis: 'z', angle: Math.PI / 2, origin: [1.5, 1.5, 0] } },
};

// Instance rotation about Babylon's Y from the y+ build facing, as for stairs
const ROTATIONS: Record<HorizontalDirection, number> = {
  'y+': 0,
  'x+': Math.PI / 2,
  'y-': Math.PI,
  'x-': -Math.PI / 2,
};

// The same turns as counterclockwise quarter turns seen from above, for the 2D outline
const QUARTER_TURNS: Record<HorizontalDirection, number> = { 'y+': 0, 'x-': 1, 'y-': 2, 'x+': 3 };

const isOpen = (blockState: BlockStateProperties): boolean =>
  blockState.open === true || (blockState.open as unknown) === 'true';

const facingOf = (blockState: BlockStateProperties): HorizontalDirection => {
  const facing = blockState.facing as HorizontalDirection | undefined;
  return facing && facing in ROTATIONS ? facing : 'x+';
};

function unturnedBoxes(blockState: BlockStateProperties): ModelBox[] {
  if (!isOpen(blockState)) return [CLOSED_PANEL];
  return [OPEN_PANELS[blockState.hinge === 'right' ? 'right' : 'left']];
}

const bareId = (blockId: string): string => blockId.replace('minecraft:', '');
export const isDoorBlock = (blockId: string): boolean => bareId(blockId).endsWith('_door');

// shapeCatalog is read at call time, after every shape module has loaded
const isFullBlock = (block: BlockData | null): boolean =>
  block !== null && shapeCatalog.resolve(block.blockType).shapeId === 'cube';

function calculateHinge(position: Vector3D, door: BlockData, blockIndex: BlockIndexReader): 'left' | 'right' {
  const facing = facingOf(door.blockState ?? {});
  const left = addOffset(position, directionToOffset(rotateLeft(facing)));
  const right = addOffset(position, directionToOffset(rotateRight(facing)));
  const above = (cell: Vector3D): Vector3D => ({ ...cell, z: cell.z + 1 });
  const solidity = (cell: Vector3D): number =>
    (isFullBlock(blockIndex.get(cell)) ? 1 : 0) + (isFullBlock(blockIndex.get(above(cell))) ? 1 : 0);
  const isSameDoor = (cell: Vector3D): boolean => {
    const other = blockIndex.get(cell);
    return other !== null && other.blockType === door.blockType && other.blockState?.half !== 'upper';
  };

  const leftDoor = isSameDoor(left);
  const rightDoor = isSameDoor(right);
  if (leftDoor !== rightDoor) return leftDoor ? 'right' : 'left';
  return solidity(right) > solidity(left) ? 'right' : 'left';
}

function deriveLowerHalf(position: Vector3D, door: BlockData, blockIndex: BlockIndexReader): BlockStateProperties {
  const { hingeFlipped, ...state } = door.blockState ?? {};
  const auto = calculateHinge(position, door, blockIndex);
  const hinge = hingeFlipped ? (auto === 'left' ? 'right' : 'left') : auto;
  return { ...state, facing: facingOf(state), half: 'lower', hinge };
}

class DoorShapeImpl implements BlockShape {
  readonly shapeId = 'door';

  getGeometryKey(blockState?: BlockStateProperties): string {
    const state = blockState ?? {};
    return `door_${facingOf(state)}_${state.half ?? 'lower'}_${state.hinge ?? 'left'}_${isOpen(state) ? 'open' : 'closed'}`;
  }

  createMesh(scene: Scene, blockState: BlockStateProperties, faceUVData?: FaceUVData): Mesh | null {
    return createBoxModelMesh(scene, 'door', unturnedBoxes(blockState), mirrorForHinge(faceUVData, blockState));
  }

  getRotation(blockState?: BlockStateProperties): number {
    return ROTATIONS[facingOf(blockState ?? {})];
  }

  get2DClip(
    blockState: BlockStateProperties,
    viewType: ViewType,
    px: number,
    py: number,
    cellSize: number,
  ): ClipPath | null {
    const boxes = turnBoxesAboutZ(unturnedBoxes(blockState), QUARTER_TURNS[facingOf(blockState)]);
    return project2D(boxes, viewType, px, py, cellSize);
  }

  deriveState(position: Vector3D, baseState: BlockStateProperties, blockIndex: BlockIndexReader): BlockStateProperties {
    const self = blockIndex.get(position);
    if (!self) return baseState;
    if (baseState.half !== 'upper') return deriveLowerHalf(position, self, blockIndex);

    const belowPosition = { ...position, z: position.z - 1 };
    const below = blockIndex.get(belowPosition);
    if (!below || below.blockType !== self.blockType || below.blockState?.half === 'upper') {
      const { hingeFlipped: _ignored, ...state } = baseState;
      return { ...state, facing: facingOf(state), hinge: state.hinge === 'right' ? 'right' : 'left' };
    }
    return { ...deriveLowerHalf(belowPosition, below, blockIndex), half: 'upper' };
  }

  getExportBlockId(blockId: string, _blockState: BlockStateProperties): string {
    return blockId;
  }

  getTextureBlockId(blockId: string, blockState: BlockStateProperties): string {
    return blockState.half === 'upper' ? `${blockId}_upper` : blockId;
  }

  matchesBlock(blockId: string): boolean {
    return isDoorBlock(blockId);
  }
}

/**
 * Mirrors the panel faces so the handle sits on the edge away from the hinge, seen from either side.
 * In CreateBox order the +Z face (0) shows the texture's handle away from a left hinge, and the -Z face (1) shows it
 * on the hinge edge. So -Z mirrors for a left hinge, and +Z mirrors for a right one.
 */
function mirrorForHinge(faceUVData: FaceUVData | undefined, blockState: BlockStateProperties): FaceUVData | undefined {
  if (!faceUVData) return faceUVData;
  const mirroredFace = blockState.hinge === 'right' ? 0 : 1;
  const mirror = (uv: FaceUVData[number], face: number): FaceUVData[number] =>
    face === mirroredFace ? { ...uv, u0: uv.u1, u1: uv.u0 } : uv;
  return faceUVData.map(mirror);
}

export const doorShape: BlockShape = new DoorShapeImpl();
