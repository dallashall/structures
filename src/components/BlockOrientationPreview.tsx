/**
 * BlockOrientationPreview - Tetris-style block orientation indicator
 *
 * Shows a 2×2 quadrant grid representing the current block's shape
 * as seen from the active 2D panel's perspective. Helps the user
 * understand stair/slab orientation before placing.
 *
 * Data flow: EditorState → withEditorState HOC → props.
 * Only `viewType` comes from the parent layout.
 */

import React from 'react';
import { Box } from '@mui/material';

import type { ViewType, BlockStateProperties, HorizontalDirection } from '../types';
import { withEditorState, WithEditorStateProps } from '../hocs/withEditorState';
import { shapeCatalog } from '../core/shapes/ShapeCatalog';

// --- Types ---

type ScreenDirection = 'left' | 'right' | 'up' | 'down' | 'toward' | 'away';
type CellFill = 'solid' | 'step' | 'empty';
type Quadrants = [CellFill, CellFill, CellFill, CellFill]; // [TL, TR, BL, BR]

/** Props passed by the parent layout */
interface OwnProps {
  viewType: ViewType;
}

/** Full props: own + HOC-injected */
type BlockOrientationPreviewProps = OwnProps & WithEditorStateProps;

// --- Screen projection ---

/** Maps world facing direction to screen-relative direction per view. */
const SCREEN_DIR_TABLE: Record<ViewType, Record<HorizontalDirection, ScreenDirection>> = {
  front:  { 'x+': 'right', 'x-': 'left',  'y-': 'toward', 'y+': 'away'   },
  back:   { 'x+': 'left',  'x-': 'right', 'y-': 'away',   'y+': 'toward' },
  left:   { 'x+': 'away',  'x-': 'toward','y-': 'left',   'y+': 'right'  },
  right:  { 'x+': 'toward','x-': 'away',  'y-': 'right',  'y+': 'left'   },
  top:    { 'x+': 'right', 'x-': 'left',  'y-': 'up',     'y+': 'down'   },
  bottom: { 'x+': 'right', 'x-': 'left',  'y-': 'down',   'y+': 'up'     },
};

const projectFacingToScreen = (
  facing: HorizontalDirection,
  viewType: ViewType,
): ScreenDirection => SCREEN_DIR_TABLE[viewType][facing];

// --- Quadrant computation ---

/** Side view: step cutout creates L-shape or profile */
const STAIR_SIDE: Record<ScreenDirection, Quadrants> = {
  right:  ['solid', 'empty', 'solid', 'solid'],
  left:   ['empty', 'solid', 'solid', 'solid'],
  up:     ['empty', 'empty', 'solid', 'solid'],
  down:   ['solid', 'solid', 'empty', 'empty'],
  toward: ['step',  'step',  'solid', 'solid'],
  away:   ['solid', 'solid', 'solid', 'solid'],
};

/** Plan view (top/bottom): step is lower, shown as dimmer half */
const STAIR_PLAN: Record<ScreenDirection, Quadrants> = {
  right:  ['solid', 'step', 'solid', 'step'],
  left:   ['step', 'solid', 'step', 'solid'],
  up:     ['step',  'step',  'solid', 'solid'],
  down:   ['solid', 'solid', 'step',  'step'],
  toward: ['solid', 'solid', 'solid', 'solid'], // unreachable in plan views
  away:   ['solid', 'solid', 'solid', 'solid'], // unreachable in plan views
};

const flipVertically = ([tl, tr, bl, br]: Quadrants): Quadrants => [bl, br, tl, tr];

const isSideView = (viewType: ViewType): boolean =>
  viewType === 'front' || viewType === 'back' || viewType === 'left' || viewType === 'right';

const getStairQuadrants = (
  screenDir: ScreenDirection,
  half: 'top' | 'bottom',
  viewType: ViewType,
): Quadrants => {
  if (!isSideView(viewType)) {
    // Plan views: half is along depth axis (invisible), show dimmer half for step side
    return STAIR_PLAN[screenDir];
  }
  const base = STAIR_SIDE[screenDir];
  return half === 'top' ? flipVertically(base) : base;
};

const getSlabQuadrants = (
  slabType: string,
  viewType: ViewType,
): Quadrants => {
  if (!isSideView(viewType)) return ['solid', 'solid', 'solid', 'solid'];
  if (slabType === 'top') return ['solid', 'solid', 'empty', 'empty'];
  return ['empty', 'empty', 'solid', 'solid']; // bottom
};

const computeQuadrants = (
  shapeId: string,
  blockState: BlockStateProperties,
  viewType: ViewType,
): Quadrants | null => {
  if (shapeId === 'stair') {
    const facing = (blockState.facing ?? 'x+') as HorizontalDirection;
    const half = (blockState.half ?? 'bottom') as 'top' | 'bottom';
    const screenDir = projectFacingToScreen(facing, viewType);
    return getStairQuadrants(screenDir, half, viewType);
  }

  if (shapeId === 'slab') {
    const slabType = (blockState.type as string) ?? 'bottom';
    if (slabType === 'double') return null; // Double slab = full cube, hide indicator
    return getSlabQuadrants(slabType, viewType);
  }

  return null; // Cube or unknown — don't render
};

// --- Cell rendering ---

const CELL_SIZE = 14;
const GAP = 2;

const CELL_STYLES: Record<CellFill, object> = {
  solid: { bgcolor: 'rgba(255, 255, 255, 0.85)' },
  step: {
    bgcolor: 'rgba(255, 255, 255, 0.25)',
    backgroundImage:
      'repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)',
  },
  empty: { bgcolor: 'transparent' },
};

const renderCell = (fill: CellFill, index: number) => (
  <Box
    key={index}
    sx={{
      width: CELL_SIZE,
      height: CELL_SIZE,
      borderRadius: '2px',
      ...CELL_STYLES[fill],
    }}
  />
);

// --- Component ---

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
        position: 'absolute',
        top: 40,
        right: 8,
        zIndex: 10,
        pointerEvents: 'none',
        bgcolor: 'rgba(0, 0, 0, 0.5)',
        p: '4px',
        borderRadius: 1,
        display: 'grid',
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
