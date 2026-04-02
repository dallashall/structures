/**
 * StairShape - Shape behavior for stair blocks
 *
 * Delegates auto-join algorithm to StairShapeResolver pure functions.
 * Delegates mesh creation to GeometryFactory.createStairMesh().
 * Provides per-instance rotation via DirectionMath.directionToYRotation.
 */

import type { BlockShape, ClipPath, FaceUVData } from './BlockShape';
import type { Scene, Mesh } from '@babylonjs/core';
import type { BlockStateProperties, ViewType, Vector3D, HorizontalDirection } from '../../types';
import type { BlockIndexReader } from '../BlockIndex';
import { createStairMesh } from '../rendering/GeometryFactory';
import type { StairShape as StairShapeType } from '../rendering/GeometryFactory';
import { directionToYRotation } from '../DirectionMath';
import { calculateStairShape } from '../StairShapeResolver';

// --- 2D clip computation ---

type ScreenDirection = 'left' | 'right' | 'toward' | 'away';

/** Maps world facing direction to screen-relative direction per side view. */
const SCREEN_DIR_TABLE: Record<ViewType, Record<HorizontalDirection, ScreenDirection>> = {
  front:  { 'x+': 'right', 'x-': 'left',  'y-': 'toward', 'y+': 'away'   },
  back:   { 'x+': 'left',  'x-': 'right', 'y-': 'away',   'y+': 'toward' },
  left:   { 'x+': 'away',  'x-': 'toward','y-': 'left',   'y+': 'right'  },
  right:  { 'x+': 'toward','x-': 'away',  'y-': 'right',  'y+': 'left'   },
  top:    { 'x+': 'right', 'x-': 'left',  'y-': 'right',  'y+': 'left'   }, // unused — plan views return null
  bottom: { 'x+': 'right', 'x-': 'left',  'y-': 'left',   'y+': 'right'  }, // unused
};

const isSideView = (v: ViewType): boolean =>
  v === 'front' || v === 'back' || v === 'left' || v === 'right';

type Point = { x: number; y: number };

/** Build a 4-vertex rectangle path (clockwise). */
const rectPath = (x: number, y: number, w: number, h: number): Point[] => [
  { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h },
];

/**
 * Build a 6-vertex L-shape path for a bottom-half stair.
 * The step cutout is at the quadrant specified by screenDir.
 */
const bottomLPath = (
  screenDir: 'left' | 'right',
  px: number, py: number, cellSize: number,
): Point[] => {
  const mid = cellSize / 2;
  const r = px + cellSize;
  const b = py + cellSize;

  if (screenDir === 'right') {
    // Step cutout at top-right
    return [
      { x: px, y: py },
      { x: px + mid, y: py },
      { x: px + mid, y: py + mid },
      { x: r, y: py + mid },
      { x: r, y: b },
      { x: px, y: b },
    ];
  }
  // Step cutout at top-left
  return [
    { x: px + mid, y: py },
    { x: r, y: py },
    { x: r, y: b },
    { x: px, y: b },
    { x: px, y: py + mid },
    { x: px + mid, y: py + mid },
  ];
};

/** Flip a path vertically within the cell. */
const flipPathVertically = (path: Point[], py: number, cellSize: number): Point[] => {
  const bottom = py + cellSize;
  const flipY = (p: Point): Point => ({ x: p.x, y: bottom - (p.y - py) });
  return path.map(flipY);
};

/**
 * Compute the 2D clip polygon for a stair block.
 * Returns null when the block should render as a full cell.
 */
const computeStairClip = (
  facing: HorizontalDirection,
  half: 'top' | 'bottom',
  viewType: ViewType,
  px: number,
  py: number,
  cellSize: number,
): Point[] | null => {
  // Plan views (top/bottom): step is along Z depth axis — invisible from above
  if (!isSideView(viewType)) return null;

  const screenDir = SCREEN_DIR_TABLE[viewType][facing];

  // Away: full back face visible — no clip
  if (screenDir === 'away') return null;

  // Toward: step faces viewer — show solid half only (like slab)
  if (screenDir === 'toward') {
    const halfSize = cellSize / 2;
    if (half === 'bottom') {
      return rectPath(px, py + halfSize, cellSize, halfSize);
    }
    return rectPath(px, py, cellSize, halfSize);
  }

  // Left/right: L-shape
  const base = bottomLPath(screenDir, px, py, cellSize);
  if (half === 'top') return flipPathVertically(base, py, cellSize);
  return base;
};

class StairShapeImpl implements BlockShape {
  readonly shapeId = 'stair';

  getGeometryKey(blockState?: BlockStateProperties): string {
    const half = blockState?.half ?? 'bottom';
    const shape = blockState?.shape ?? 'straight';
    return `stair_${half}_${shape}`;
  }

  createMesh(
    scene: Scene,
    blockState: BlockStateProperties,
    faceUVData?: FaceUVData,
  ): Mesh | null {
    const half = (blockState?.half ?? 'bottom') as 'top' | 'bottom';
    const shape = (blockState?.shape ?? 'straight') as StairShapeType;
    return createStairMesh(scene, half, shape, faceUVData);
  }

  getRotation(blockState?: BlockStateProperties): number {
    if (!blockState?.facing) return 0;
    return directionToYRotation(blockState.facing);
  }

  get2DClip(
    blockState: BlockStateProperties,
    viewType: ViewType,
    px: number,
    py: number,
    cellSize: number,
  ): ClipPath | null {
    const facing = (blockState?.facing ?? 'x+') as HorizontalDirection;
    const half = (blockState?.half ?? 'bottom') as 'top' | 'bottom';
    return computeStairClip(facing, half, viewType, px, py, cellSize);
  }

  deriveState(
    position: Vector3D,
    baseState: BlockStateProperties,
    blockIndex: BlockIndexReader,
  ): BlockStateProperties {
    const facing = (baseState.facing ?? 'x+') as HorizontalDirection;
    const half = (baseState.half ?? 'bottom') as 'top' | 'bottom';
    const shape = calculateStairShape(position, facing, half, blockIndex);
    return { ...baseState, shape };
  }

  matchesBlock(blockId: string): boolean {
    return blockId.replace('minecraft:', '').includes('stair');
  }
}

export const stairShape: BlockShape = new StairShapeImpl();
