/**
 * A 2×2 quadrant grid showing the selected stair or slab as the given 2D view will draw it,
 * so the user sees its orientation before placing.
 */

import React from "react";
import { Box } from "@mui/material";

import type {
  ViewType,
  BlockStateProperties,
  HorizontalDirection,
} from "../types";
import { withEditorState, WithEditorStateProps } from "../hocs/withEditorState";
import { shapeCatalog } from "../core/shapes/ShapeCatalog";

type ScreenDirection = "left" | "right" | "up" | "down" | "toward" | "away";
type CellFill = "solid" | "step" | "empty";
type Quadrants = [CellFill, CellFill, CellFill, CellFill]; // [TL, TR, BL, BR]

interface OwnProps {
  viewType: ViewType;
}

type BlockOrientationPreviewProps = OwnProps & WithEditorStateProps;

/** World facing to its direction on screen, per view */
const SCREEN_DIR_TABLE: Record<
  ViewType,
  Record<HorizontalDirection, ScreenDirection>
> = {
  front: { "x+": "right", "x-": "left", "y-": "away", "y+": "toward" },
  back: { "x+": "left", "x-": "right", "y-": "toward", "y+": "away" },
  left: { "x+": "away", "x-": "toward", "y-": "left", "y+": "right" },
  right: { "x+": "toward", "x-": "away", "y-": "left", "y+": "right" },
  top: { "x+": "right", "x-": "left", "y-": "down", "y+": "up" },
  bottom: { "x+": "right", "x-": "left", "y-": "up", "y+": "down" },
};

const projectFacingToScreen = (
  facing: HorizontalDirection,
  viewType: ViewType,
): ScreenDirection => SCREEN_DIR_TABLE[viewType][facing];

/** Side view: step cutout creates L-shape or profile */
const STAIR_SIDE: Record<ScreenDirection, Quadrants> = {
  right: ["solid", "empty", "solid", "solid"],
  left: ["empty", "solid", "solid", "solid"],
  up: ["empty", "empty", "solid", "solid"],
  down: ["solid", "solid", "empty", "empty"],
  toward: ["step", "step", "solid", "solid"],
  away: ["solid", "solid", "solid", "solid"],
};

/** Plan view (top/bottom): step is lower, shown as dimmer half */
const STAIR_PLAN: Record<ScreenDirection, Quadrants> = {
  right: ["solid", "step", "solid", "step"],
  left: ["step", "solid", "step", "solid"],
  up: ["step", "step", "solid", "solid"],
  down: ["solid", "solid", "step", "step"],
  toward: ["solid", "solid", "solid", "solid"], // unreachable in plan views
  away: ["solid", "solid", "solid", "solid"], // unreachable in plan views
};

const flipVertically = ([tl, tr, bl, br]: Quadrants): Quadrants => [
  bl,
  br,
  tl,
  tr,
];

const isSideView = (viewType: ViewType): boolean =>
  viewType === "front" ||
  viewType === "back" ||
  viewType === "left" ||
  viewType === "right";

const getStairQuadrants = (
  screenDir: ScreenDirection,
  half: "top" | "bottom",
  viewType: ViewType,
): Quadrants => {
  if (!isSideView(viewType)) {
    // A plan view looks along the half's axis, so it can't show top or bottom. It dims the step side instead.
    return STAIR_PLAN[screenDir];
  }
  const base = STAIR_SIDE[screenDir];
  return half === "top" ? flipVertically(base) : base;
};

const getSlabQuadrants = (slabType: string, viewType: ViewType): Quadrants => {
  if (!isSideView(viewType)) return ["solid", "solid", "solid", "solid"];
  if (slabType === "top") return ["solid", "solid", "empty", "empty"];
  return ["empty", "empty", "solid", "solid"];
};

const computeQuadrants = (
  shapeId: string,
  blockState: BlockStateProperties,
  viewType: ViewType,
): Quadrants | null => {
  if (shapeId === "stair") {
    const facing = (blockState.facing ?? "x+") as HorizontalDirection;
    const half = (blockState.half ?? "bottom") as "top" | "bottom";
    const screenDir = projectFacingToScreen(facing, viewType);
    return getStairQuadrants(screenDir, half, viewType);
  }

  if (shapeId === "slab") {
    const slabType = (blockState.type as string) ?? "bottom";
    // A double slab is a full cube, which needs no indicator
    if (slabType === "double") return null;
    return getSlabQuadrants(slabType, viewType);
  }

  return null;
};

const CELL_SIZE = 14;
const GAP = 2;

const CELL_STYLES: Record<CellFill, object> = {
  solid: { bgcolor: "rgba(255, 255, 255, 0.85)" },
  step: {
    bgcolor: "rgba(255, 255, 255, 0.25)",
    backgroundImage:
      "repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
  },
  empty: { bgcolor: "transparent" },
};

const renderCell = (fill: CellFill, index: number) => (
  <Box
    key={index}
    sx={{
      width: CELL_SIZE,
      height: CELL_SIZE,
      borderRadius: "2px",
      ...CELL_STYLES[fill],
    }}
  />
);

function BlockOrientationPreviewComponent({
  viewType,
  selectedBlock,
  hasBlockState,
  activeBlockState,
}: BlockOrientationPreviewProps) {
  if (!hasBlockState || !selectedBlock) return null;

  const shape = shapeCatalog.resolve(selectedBlock);
  const quadrants = computeQuadrants(shape.shapeId, activeBlockState, viewType);
  if (!quadrants) return null;

  const gridSize = CELL_SIZE * 2 + GAP;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 40,
        right: 8,
        zIndex: 10,
        pointerEvents: "none",
        bgcolor: "rgba(0, 0, 0, 0.5)",
        p: "4px",
        borderRadius: 1,
        display: "grid",
        gridTemplateColumns: `${CELL_SIZE}px ${CELL_SIZE}px`,
        gridTemplateRows: `${CELL_SIZE}px ${CELL_SIZE}px`,
        gap: `${GAP}px`,
        width: gridSize + 8,
        height: gridSize + 8,
      }}
    >
      {quadrants.map(renderCell)}
    </Box>
  );
}

export const BlockOrientationPreview = withEditorState(
  BlockOrientationPreviewComponent,
) as React.ComponentType<OwnProps>;
