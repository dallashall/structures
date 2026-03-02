import React from 'react';
import { View } from '@adobe/react-spectrum';
import type { ViewType, Project, LayerState, Block } from '../types';

interface Canvas2DViewProps {
  viewType: ViewType;
  project: Project;
  activeLayers: LayerState;
  blocks: Block[];
  width: number;
  height: number;
}

/**
 * Canvas2DView - Renders 2D orthographic view with grid and blocks
 *
 * Initial implementation (rendering only, no painting):
 * - Renders grid based on project dimensions and view type
 * - Shows grid lines
 * - Will render placed blocks (future)
 * - Will render meta block (future)
 * - Will handle zoom/pan (future)
 * - Will handle painting (future)
 *
 * Uses HTML Canvas for rendering.
 */
export function Canvas2DView({
  viewType,
  project,
  activeLayers,
  width,
  height,
}: Canvas2DViewProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Render grid
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate grid dimensions based on view type
    const { gridWidth, gridHeight } = getGridDimensions(viewType, project.dimensions);

    // Calculate cell size to fit canvas
    const cellSize = Math.min(
      width / gridWidth,
      height / gridHeight
    );

    // Center the grid
    const offsetX = (width - gridWidth * cellSize) / 2;
    const offsetY = (height - gridHeight * cellSize) / 2;

    // Draw grid
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= gridWidth; x++) {
      const px = offsetX + x * cellSize;
      ctx.beginPath();
      ctx.moveTo(px, offsetY);
      ctx.lineTo(px, offsetY + gridHeight * cellSize);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= gridHeight; y++) {
      const py = offsetY + y * cellSize;
      ctx.beginPath();
      ctx.moveTo(offsetX, py);
      ctx.lineTo(offsetX + gridWidth * cellSize, py);
      ctx.stroke();
    }

    // Draw meta block (white square with "M" label)
    const metaBlock = project.metaBlock;
    if (metaBlock) {
      const { gridX, gridY } = projectToGrid(
        metaBlock.position,
        viewType,
        activeLayers
      );

      if (
        gridX >= 0 &&
        gridX < gridWidth &&
        gridY >= 0 &&
        gridY < gridHeight
      ) {
        const px = offsetX + gridX * cellSize;
        const py = offsetY + gridY * cellSize;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

        // Draw "M" label
        ctx.fillStyle = '#000000';
        ctx.font = `${Math.min(cellSize * 0.5, 16)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('M', px + cellSize / 2, py + cellSize / 2);
      }
    }
  }, [viewType, project, activeLayers, width, height]);

  return (
    <View width="100%" height="100%">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </View>
  );
}

/**
 * Get grid dimensions based on view type
 */
function getGridDimensions(
  viewType: ViewType,
  dimensions: { width: number; height: number; depth: number }
): { gridWidth: number; gridHeight: number } {
  switch (viewType) {
    case 'front':
    case 'back':
      return { gridWidth: dimensions.width, gridHeight: dimensions.height };
    case 'left':
    case 'right':
      return { gridWidth: dimensions.depth, gridHeight: dimensions.height };
    case 'top':
    case 'bottom':
      return { gridWidth: dimensions.width, gridHeight: dimensions.depth };
    default:
      return { gridWidth: 16, gridHeight: 16 };
  }
}

/**
 * Project 3D position to 2D grid coordinates based on view type
 */
function projectToGrid(
  position: { x: number; y: number; z: number },
  viewType: ViewType,
  // activeLayers: LayerState  // Reserved for future layer filtering
  _activeLayers: LayerState
): { gridX: number; gridY: number } {
  switch (viewType) {
    case 'front':
    case 'back':
      // X-Y plane at Z layer
      return { gridX: position.x, gridY: position.y };
    case 'left':
    case 'right':
      // Z-Y plane at X layer
      return { gridX: position.z, gridY: position.y };
    case 'top':
    case 'bottom':
      // X-Z plane at Y layer
      return { gridX: position.x, gridY: position.z };
    default:
      return { gridX: 0, gridY: 0 };
  }
}
