/**
 * StairShape - Stair geometry, 2D clipping, and the auto-join shape from StairShapeResolver
 *
 * Derived shape strings use absolute directions: `straight_{facing}` or `{inner|outer}_{facing}_{cornerEdge}`
 * (see StairShapeResolver). The facing is always the second `_` part.
 */

import type { BlockShape, ClipPath, FaceUVData } from "./BlockShape";
import type { Scene, Mesh } from "@babylonjs/core";
import type {
  BlockStateProperties,
  ViewType,
  Vector3D,
  HorizontalDirection,
} from "../../types";
import type { BlockIndexReader } from "../BlockIndex";
import { createStairMesh } from "../rendering/GeometryFactory";
import { calculateStairShape } from "../StairShapeResolver";

const isSideView = (v: ViewType): boolean =>
  v === "front" || v === "back" || v === "left" || v === "right";

type Point = { x: number; y: number };

const rectPath = (x: number, y: number, w: number, h: number): Point[] => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

/**
 * L-shape of a bottom-half stair seen from the side. xSide picks which side the step cuts out.
 */
const bottomLPath = (
  xSide: boolean,
  px: number,
  py: number,
  cellSize: number,
): Point[] => {
  const mid = cellSize / 2;
  const r = px + cellSize;
  const b = py + cellSize;

  if (xSide) {
    return [
      { x: px, y: py },
      { x: px + mid, y: py },
      { x: px + mid, y: py + mid },
      { x: r, y: py + mid },
      { x: r, y: b },
      { x: px, y: b },
    ];
  }
  return [
    { x: px + mid, y: py },
    { x: r, y: py },
    { x: r, y: b },
    { x: px, y: b },
    { x: px, y: py + mid },
    { x: px + mid, y: py + mid },
  ];
};

const flipPathVertically = (
  path: Point[],
  py: number,
  cellSize: number,
): Point[] => {
  const bottom = py + cellSize;
  const flipY = (p: Point): Point => ({ x: p.x, y: bottom - (p.y - py) });
  return path.map(flipY);
};

/**
 * Null when the stair fills its cell in this view
 */
const computeStairClip = (
  facing: HorizontalDirection,
  half: "top" | "bottom",
  viewType: ViewType,
  px: number,
  py: number,
  cellSize: number,
): Point[] | null => {
  // From above or below a stair covers its whole cell
  if (!isSideView(viewType)) return null;

  const isTowardViewer =
    (viewType === "front" && facing === "y+") ||
    (viewType === "back" && facing === "y-") ||
    (viewType === "left" && facing === "x-") ||
    (viewType === "right" && facing === "x+");

  const isAwayFromViewer =
    (viewType === "front" && facing === "y-") ||
    (viewType === "back" && facing === "y+") ||
    (viewType === "left" && facing === "x+") ||
    (viewType === "right" && facing === "x-");

  // Facing away, the solid back face fills the cell
  if (isAwayFromViewer) return null;

  // Facing the viewer, the step's profile hides behind the front half, which reads like a slab
  if (isTowardViewer) {
    const halfSize = cellSize / 2;
    if (half === "bottom") {
      return rectPath(px, py + halfSize, cellSize, halfSize);
    }
    return rectPath(px, py, cellSize, halfSize);
  }

  // Facing sideways, the profile shows as an L
  const xPlusSide =
    (viewType === "front" && facing === "x+") ||
    (viewType === "back" && facing === "x-") ||
    (viewType === "left" && facing === "y+") ||
    (viewType === "right" && facing === "y-");

  const base = bottomLPath(xPlusSide, px, py, cellSize);
  if (half === "top") return flipPathVertically(base, py, cellSize);
  return base;
};

class StairShapeImpl implements BlockShape {
  readonly shapeId = "stair";

  getGeometryKey(blockState?: BlockStateProperties): string {
    const half = blockState?.half ?? "bottom";
    const shape = blockState?.shape ?? `straight_${blockState?.facing ?? 'x+'}`;
    return `stair_${half}_${shape}`;
  }

  createMesh(
    scene: Scene,
    blockState: BlockStateProperties,
    faceUVData?: FaceUVData,
  ): Mesh | null {
    const half = (blockState?.half ?? "bottom") as "top" | "bottom";
    const shape = blockState?.shape ?? `straight_${blockState?.facing ?? 'x+'}`;
    return createStairMesh(scene, half, shape, faceUVData);
  }

  getRotation(blockState?: BlockStateProperties): number {
    const shapeString = blockState?.shape;
    if (!shapeString) return 0;

    const parts = shapeString.split('_');
    const facing = parts[1] as HorizontalDirection;

    switch (facing) {
      case 'y+': return 0;
      case 'x+': return Math.PI / 2;
      case 'y-': return Math.PI;
      case 'x-': return -Math.PI / 2;
      default: return 0;
    }
  }

  get2DClip(
    blockState: BlockStateProperties,
    viewType: ViewType,
    px: number,
    py: number,
    cellSize: number,
  ): ClipPath | null {
    const facing = (blockState?.facing ?? "x+") as HorizontalDirection;
    const half = (blockState?.half ?? "bottom") as "top" | "bottom";
    const path = computeStairClip(facing, half, viewType, px, py, cellSize);
    return path ? [path] : null;
  }

  deriveState(
    position: Vector3D,
    baseState: BlockStateProperties,
    blockIndex: BlockIndexReader,
  ): BlockStateProperties {
    const facing = (baseState.facing ?? "x+") as HorizontalDirection;
    const half = (baseState.half ?? "bottom") as "top" | "bottom";
    const shape = calculateStairShape(position, facing, half, blockIndex);
    return { ...baseState, shape };
  }

  getExportBlockId(blockId: string, _blockState: BlockStateProperties): string {
    return blockId;
  }

  matchesBlock(blockId: string): boolean {
    return blockId.replace("minecraft:", "").includes("stair");
  }
}

export const stairShape: BlockShape = new StairShapeImpl();
