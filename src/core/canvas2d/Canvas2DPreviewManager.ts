import type { Vector3D, Dimensions } from '../../types';
import { editorStateManager } from '../EditorStateManager';
import { projectManager } from '../ProjectManager';
import { CanvasPainter } from '../painting/CanvasPainter';
import type { Canvas2DViewport } from './Canvas2DViewport';

/**
 * Canvas2DPreviewManager - Manages preview state and calculations
 *
 * Responsibilities:
 * - Track preview state (outline drag, fill preview, point hover)
 * - Calculate preview blocks for different modes
 * - Update EditorStateManager with preview data
 * - Provide preview rendering data for Canvas2DRenderer
 *
 * This class handles preview logic without any rendering.
 */
export class Canvas2DPreviewManager {
  // Outline mode state
  private outlineStart: { gridX: number; gridY: number } | null = null;
  private outlineEnd: { gridX: number; gridY: number } | null = null;

  // Point mode hover preview
  private pointPreviewCell: { gridX: number; gridY: number } | null = null;

  // Fill/point preview (Alt key)
  private lastGridPos: { gridX: number; gridY: number } | null = null;

  constructor(
    private viewport: Canvas2DViewport,
    private canvasPainter: CanvasPainter
  ) {}

  /**
   * Start outline drag preview
   */
  startOutlineDrag(gridX: number, gridY: number): void {
    this.outlineStart = { gridX, gridY };
    this.outlineEnd = { gridX, gridY };
    this.updateOutlinePreview();
  }

  /**
   * Update outline drag preview
   */
  updateOutlineDrag(gridX: number, gridY: number): void {
    if (!this.outlineStart) return;
    this.outlineEnd = { gridX, gridY };
    this.updateOutlinePreview();
  }

  /**
   * End outline drag preview
   */
  endOutlineDrag(): void {
    this.outlineStart = null;
    this.outlineEnd = null;
    editorStateManager.clearPreview();
  }

  /**
   * Update point mode hover preview (both 2D and 3D)
   * In delete mode, shows the existing block that will be removed
   * In paint mode, shows the block that will be placed
   */
  updatePointPreview(gridX: number, gridY: number): void {
    this.pointPreviewCell = { gridX, gridY };

    const position = this.viewport.gridToPosition(gridX, gridY);
    const deleteMode = editorStateManager.getDeleteMode();

    if (deleteMode) {
      // Delete mode: show existing block that will be removed (if any)
      const existingBlock = projectManager.getBlock(position);
      if (existingBlock) {
        const previewBlocks = [{
          position,
          blockType: existingBlock.blockType,
        }];
        editorStateManager.setPreviewBlocks(previewBlocks);
      } else {
        // No block to delete at this position
        editorStateManager.clearPreview();
      }
    } else {
      // Paint mode: show block that will be placed
      const selectedBlock = editorStateManager.getSelectedBlock();
      if (selectedBlock) {
        const previewBlocks = [{
          position,
          blockType: selectedBlock,
        }];
        editorStateManager.setPreviewBlocks(previewBlocks);
      } else {
        editorStateManager.clearPreview();
      }
    }
  }

  /**
   * Clear point mode hover preview (both 2D and 3D)
   */
  clearPointPreview(): void {
    this.pointPreviewCell = null;
    editorStateManager.clearPreview();
  }

  /**
   * Update last grid position for preview key
   */
  updateLastGridPosition(gridX: number, gridY: number): void {
    this.lastGridPos = { gridX, gridY };
  }

  /**
   * Activate preview key (Alt) - shows what would happen if user clicked
   */
  activatePreviewKey(): void {
    this.updatePreviewKeyPreview();
  }

  /**
   * Deactivate preview key
   */
  deactivatePreviewKey(): void {
    editorStateManager.clearPreview();
  }

  /**
   * Clear all preview state
   */
  clearAll(): void {
    this.outlineStart = null;
    this.outlineEnd = null;
    this.pointPreviewCell = null;
    this.lastGridPos = null;
    editorStateManager.clearPreview();
  }

  /**
   * Get outline preview bounds (for 2D rendering)
   */
  getOutlinePreview(): {
    start: { gridX: number; gridY: number };
    end: { gridX: number; gridY: number };
  } | null {
    if (!this.outlineStart || !this.outlineEnd) return null;
    return {
      start: this.outlineStart,
      end: this.outlineEnd,
    };
  }

  /**
   * Get point preview cell (for 2D rendering)
   */
  getPointPreview(): { gridX: number; gridY: number } | null {
    return this.pointPreviewCell;
  }

  /**
   * Check if outline preview is active
   */
  isOutlinePreviewActive(): boolean {
    return this.outlineStart !== null && this.outlineEnd !== null;
  }

  /**
   * Update outline preview (calculates 3D blocks)
   */
  private updateOutlinePreview(): void {
    const selectedBlock = editorStateManager.getSelectedBlock();
    if (!selectedBlock || !this.outlineStart || !this.outlineEnd) {
      editorStateManager.clearPreview();
      return;
    }

    const project = projectManager.getProject();
    if (!project) {
      editorStateManager.clearPreview();
      return;
    }

    // Convert grid to 3D positions
    const startPos = this.viewport.gridToPosition(this.outlineStart.gridX, this.outlineStart.gridY);
    const endPos = this.viewport.gridToPosition(this.outlineEnd.gridX, this.outlineEnd.gridY);

    // Calculate outline positions
    const positions = this.calculateOutlinePositions(startPos, endPos, project.dimensions);

    // Create preview blocks
    const previewBlocks = positions.map(pos => ({
      position: pos,
      blockType: selectedBlock,
    }));

    editorStateManager.setPreviewBlocks(previewBlocks);
  }

  /**
   * Update preview key preview (calculates what would be painted)
   */
  private updatePreviewKeyPreview(): void {
    if (!this.lastGridPos) {
      editorStateManager.clearPreview();
      return;
    }

    const selectedBlock = editorStateManager.getSelectedBlock();
    if (!selectedBlock) {
      editorStateManager.clearPreview();
      return;
    }

    const project = projectManager.getProject();
    if (!project) {
      editorStateManager.clearPreview();
      return;
    }

    // Convert grid to 3D position
    const position = this.viewport.gridToPosition(this.lastGridPos.gridX, this.lastGridPos.gridY);

    // Get constrained axis for current view
    const constrainAxis = this.getConstrainedAxis();

    // Calculate operations using current strategy
    const operations = this.canvasPainter['strategy'].calculateOperations(
      position,
      selectedBlock,
      project.dimensions,
      constrainAxis
    );

    // Filter through behavior
    const getBlock = (pos: Vector3D) => {
      const blockData = projectManager.getBlock(pos);
      return blockData ? blockData.blockType : null;
    };
    const filteredOperations = this.canvasPainter['behavior'].filter(operations, getBlock);

    // Convert to preview blocks
    const previewBlocks = filteredOperations.map(op => ({
      position: op.position,
      blockType: op.blockType,
    }));

    editorStateManager.setPreviewBlocks(previewBlocks);
  }

  /**
   * Get constrained axis for current view
   */
  private getConstrainedAxis(): { axis: 'x' | 'y' | 'z'; value: number } {
    const activeLayers = editorStateManager.getActiveLayers();
    const viewType = this.viewport.getViewType();

    switch (viewType) {
      case 'front':
      case 'back':
        return { axis: 'y', value: activeLayers.y };
      case 'left':
      case 'right':
        return { axis: 'x', value: activeLayers.x };
      case 'top':
      case 'bottom':
        return { axis: 'z', value: activeLayers.z };
    }
  }

  /**
   * Calculate outline rectangle positions
   */
  private calculateOutlinePositions(
    start: Vector3D,
    end: Vector3D,
    dimensions: Dimensions
  ): Vector3D[] {
    const positions: Vector3D[] = [];

    const minX = Math.max(0, Math.min(start.x, end.x));
    const maxX = Math.min(dimensions.width - 1, Math.max(start.x, end.x));
    const minY = Math.max(0, Math.min(start.y, end.y));
    const maxY = Math.min(dimensions.height - 1, Math.max(start.y, end.y));
    const minZ = Math.max(0, Math.min(start.z, end.z));
    const maxZ = Math.min(dimensions.depth - 1, Math.max(start.z, end.z));

    const isXConstant = start.x === end.x;
    const isYConstant = start.y === end.y;
    const isZConstant = start.z === end.z;

    if (isXConstant) {
      // YZ plane
      const x = start.x;
      for (let y = minY; y <= maxY; y++) {
        positions.push({ x, y, z: minZ });
        positions.push({ x, y, z: maxZ });
      }
      for (let z = minZ + 1; z < maxZ; z++) {
        positions.push({ x, y: minY, z });
        positions.push({ x, y: maxY, z });
      }
    } else if (isYConstant) {
      // XZ plane
      const y = start.y;
      for (let x = minX; x <= maxX; x++) {
        positions.push({ x, y, z: minZ });
        positions.push({ x, y, z: maxZ });
      }
      for (let z = minZ + 1; z < maxZ; z++) {
        positions.push({ x: minX, y, z });
        positions.push({ x: maxX, y, z });
      }
    } else if (isZConstant) {
      // XY plane
      const z = start.z;
      for (let x = minX; x <= maxX; x++) {
        positions.push({ x, y: minY, z });
        positions.push({ x, y: maxY, z });
      }
      for (let y = minY + 1; y < maxY; y++) {
        positions.push({ x: minX, y, z });
        positions.push({ x: maxX, y, z });
      }
    }

    return positions;
  }
}
