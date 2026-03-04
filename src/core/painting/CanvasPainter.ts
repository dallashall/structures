import type { PaintStrategy } from './strategies/PaintStrategy';
import type { PaintBehavior } from './behaviors/PaintBehavior';
import type { Vector3D, ViewType, LayerState } from '../../types';
import { projectManager } from '../ProjectManager';
import { CoordinateConverter } from './CoordinateConverter';

/**
 * CanvasPainter - Orchestrates painting operations
 *
 * Coordinates between:
 * - PaintStrategy (calculates WHAT to paint)
 * - PaintBehavior (filters WHEN to allow painting)
 * - ProjectManager (executes the actual painting)
 *
 * This class follows the composition pattern from SlicePlaneVisualizer:
 * - Uses singleton projectManager (similar to SlicePlaneVisualizer using editorStateManager)
 * - Delegates to strategy and behavior
 * - Thin orchestration layer
 */
export class CanvasPainter {
  private strategy: PaintStrategy;
  private behavior: PaintBehavior;

  constructor(strategy: PaintStrategy, behavior: PaintBehavior) {
    this.strategy = strategy;
    this.behavior = behavior;
  }

  /**
   * Set the active paint strategy
   */
  setStrategy(strategy: PaintStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Set the active paint behavior
   */
  setBehavior(behavior: PaintBehavior): void {
    this.behavior = behavior;
  }

  /**
   * Execute a paint operation based on grid interaction
   *
   * @param gridX - Horizontal grid coordinate
   * @param gridY - Vertical grid coordinate
   * @param viewType - Current view
   * @param activeLayers - Current active layers
   * @param selectedBlockId - Currently selected block (null = erase)
   */
  paint(
    gridX: number,
    gridY: number,
    viewType: ViewType,
    activeLayers: LayerState,
    selectedBlockId: string | null
  ): void {
    const project = projectManager.getProject();
    if (!project) return;

    // Convert grid coordinates to 3D world position
    const position = CoordinateConverter.gridToPosition(
      gridX,
      gridY,
      viewType,
      activeLayers,
      project.dimensions
    );

    // Determine constrained axis based on view type
    // Each 2D view constrains one axis to the current layer value
    const constrainAxis = this.getConstrainedAxis(viewType, activeLayers);

    // Calculate operations from strategy
    const operations = this.strategy.calculateOperations(
      position,
      selectedBlockId,
      project.dimensions,
      constrainAxis
    );

    // Filter operations through behavior
    const getBlock = (pos: Vector3D) => {
      const blockData = projectManager.getBlock(pos);
      return blockData ? blockData.blockType : null;
    };
    const filteredOperations = this.behavior.filter(operations, getBlock);

    // Apply filtered operations to project
    for (const operation of filteredOperations) {
      if (operation.blockType === null) {
        // null = erase
        projectManager.removeBlock(operation.position);
      } else {
        // Paint with block type
        projectManager.setBlock(operation.position, operation.blockType);
      }
    }
  }

  /**
   * Get the constrained axis for the current view type
   * Each 2D view constrains operations to a single plane
   */
  private getConstrainedAxis(
    viewType: ViewType,
    activeLayers: LayerState
  ): { axis: 'x' | 'y' | 'z'; value: number } {
    switch (viewType) {
      case 'front':
      case 'back':
        // Front/back views: looking along Y axis, constrain to active Y layer
        return { axis: 'y', value: activeLayers.y };
      case 'left':
      case 'right':
        // Left/right views: looking along X axis, constrain to active X layer
        return { axis: 'x', value: activeLayers.x };
      case 'top':
      case 'bottom':
        // Top/bottom views: looking along Z axis, constrain to active Z layer
        return { axis: 'z', value: activeLayers.z };
    }
  }
}
