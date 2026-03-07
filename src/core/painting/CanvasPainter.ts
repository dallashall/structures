import type { PaintStrategy } from './strategies/PaintStrategy';
import type { PaintBehavior } from './behaviors/PaintBehavior';
import type { Vector3D, ViewType, LayerState, DepthConfig } from '../../types';
import { projectManager } from '../ProjectManager';
import { editorStateManager } from '../EditorStateManager';
import { modelHistory } from '../ModelHistory';
import { draftingService } from '../DraftingService';
import { CoordinateConverter } from './CoordinateConverter';

interface PaintOperation {
  position: Vector3D;
  blockType: string | null;
  previousBlockType?: string;
  isDelete?: boolean; // True for delete operations (stores the block being removed)
}

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

  // Draft mode: collect operations instead of executing immediately
  private isDraftMode = false;
  private draftOperations: PaintOperation[] = [];

  // Track painted positions during draft to prevent duplicates
  private draftPositionsMap: Map<string, PaintOperation> = new Map();

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
   * Begin draft mode - collect operations without executing
   */
  beginDraft(): void {
    console.log('CanvasPainter: beginDraft() called');
    this.isDraftMode = true;
    this.draftOperations = [];
    this.draftPositionsMap.clear();
  }

  /**
   * Finalize draft - persist all operations to ModelHistory
   */
  finalizeDraft(_description?: string): void {
    console.log(`CanvasPainter: finalizeDraft() called - isDraftMode: ${this.isDraftMode}, operations: ${this.draftOperations.length}`);

    if (!this.isDraftMode || this.draftOperations.length === 0) {
      this.isDraftMode = false;
      this.draftOperations = [];
      draftingService.cancel();
      return;
    }

    const project = projectManager.getProject();
    if (!project) {
      this.isDraftMode = false;
      this.draftOperations = [];
      draftingService.cancel();
      return;
    }

    // Prepare blocks for ModelHistory
    // For delete operations, pass blockType as null so ModelHistory creates BlockRemovedEvent
    // For paint operations, pass the blockType so ModelHistory creates BlockPlacedEvent
    const blocks = this.draftOperations.map(op => ({
      position: op.position,
      blockType: op.isDelete ? null : op.blockType, // null signals delete to ModelHistory
      previousBlockType: op.previousBlockType
    }));

    // Set current project ID for ModelHistory
    modelHistory.setCurrentProjectId(project.id);

    // Persist to ModelHistory (creates CompoundEvent internally)
    modelHistory.write(blocks);

    // Clear preview from DraftingService
    draftingService.cancel();

    // Clear draft state
    this.isDraftMode = false;
    this.draftOperations = [];
    this.draftPositionsMap.clear();
  }

  /**
   * Cancel draft - discard all collected operations
   */
  cancelDraft(): void {
    this.isDraftMode = false;
    this.draftOperations = [];
    this.draftPositionsMap.clear();
    draftingService.cancel();
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

    // Expand operations along depth axis if depth config is enabled
    const depthConfig = editorStateManager.getDepthConfig();
    const expandedOperations = this.expandOperationsWithDepth(
      operations,
      constrainAxis,
      depthConfig,
      project.dimensions,
      viewType
    );

    // Filter operations through behavior
    const getBlock = (pos: Vector3D) => {
      const blockData = projectManager.getBlock(pos);
      return blockData ? blockData.blockType : null;
    };
    const filteredOperations = this.behavior.filter(expandedOperations, getBlock);

    // Apply delete modifier (transforms operations if delete mode enabled)
    const finalOperations = this.applyDeleteModifier(filteredOperations);

    // Apply filtered operations
    if (this.isDraftMode) {
      // Draft mode: collect operations and update DraftingService preview
      // Use Map to deduplicate by position (prevent opacity stacking)
      console.log(`CanvasPainter: Draft mode - collecting ${finalOperations.length} operations`);

      const deleteMode = editorStateManager.getDeleteMode();

      for (const operation of finalOperations) {
        const posKey = `${operation.position.x},${operation.position.y},${operation.position.z}`;

        // Only add if this position hasn't been painted in this stroke yet
        if (!this.draftPositionsMap.has(posKey)) {
          const existingBlock = projectManager.getBlock(operation.position);
          const previousBlockType = existingBlock?.blockType;

          // Delete modifier has already transformed operations if needed
          // In delete mode: operation.blockType is the existing block
          // In paint mode: operation.blockType is the selected block
          const paintOp: PaintOperation = {
            position: operation.position,
            blockType: operation.blockType,
            previousBlockType,
            isDelete: deleteMode,
          };
          this.draftPositionsMap.set(posKey, paintOp);
          this.draftOperations.push(paintOp);
        }
      }

      // Update DraftingService with preview blocks (ephemeral, shared across views)
      // All operations now have blockType set (including deletes which store the block being removed)
      // The renderer will apply red tint for delete operations based on deleteMode state
      const previewBlocks = this.draftOperations.map(op => ({
        position: op.position,
        blockType: op.blockType!,
      }));

      draftingService.set(previewBlocks);
    } else {
      // Normal mode: execute immediately (creates events per operation)
      console.log(`CanvasPainter: Normal mode - executing ${finalOperations.length} operations immediately`);

      const deleteMode = editorStateManager.getDeleteMode();

      for (const operation of finalOperations) {
        if (deleteMode) {
          // Delete mode: remove blocks
          projectManager.removeBlock(operation.position);
        } else {
          // Paint mode: place blocks
          if (operation.blockType !== null) {
            projectManager.setBlock(operation.position, operation.blockType);
          }
        }
      }
    }
  }

  /**
   * Apply delete modifier - transforms operations if delete mode is enabled
   * This is a pure modifier function that converts paint operations to delete operations
   * In delete mode, replaces the blockType with the existing block at that position
   * @param operations - Operations from strategy + depth + behavior
   * @returns Transformed operations (delete modifier applied if enabled)
   */
  private applyDeleteModifier(
    operations: { position: Vector3D; blockType: string | null }[]
  ): { position: Vector3D; blockType: string | null }[] {
    const deleteMode = editorStateManager.getDeleteMode();

    // If delete mode not enabled, return operations unchanged
    if (!deleteMode) {
      return operations;
    }

    // Delete mode: transform operations to target existing blocks for deletion
    const transformedOperations: { position: Vector3D; blockType: string | null }[] = [];

    for (const operation of operations) {
      // Look up existing block at this position
      const existingBlock = projectManager.getBlock(operation.position);

      // Only add if there's a block to delete
      // The blockType is set to the existing block (for preview)
      // It will be converted to null when finalizing to ModelHistory
      if (existingBlock) {
        transformedOperations.push({
          position: operation.position,
          blockType: existingBlock.blockType, // Store actual block for preview
        });
      }
      // If no block exists, skip (nothing to delete)
    }

    return transformedOperations;
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

  /**
   * Expand operations along the depth axis based on depth configuration
   *
   * @param operations - Base operations from strategy
   * @param constrainAxis - The depth axis to expand along
   * @param depthConfig - Depth configuration
   * @param dimensions - Project dimensions for bounds checking
   * @param viewType - Current view type (to determine camera direction)
   * @returns Expanded operations array
   */
  private expandOperationsWithDepth(
    operations: { position: Vector3D; blockType: string | null }[],
    constrainAxis: { axis: 'x' | 'y' | 'z'; value: number },
    depthConfig: DepthConfig,
    dimensions: { width: number; height: number; depth: number },
    viewType: ViewType
  ): { position: Vector3D; blockType: string | null }[] {
    // If depth is not enabled, return operations unchanged
    if (!depthConfig.enabled) {
      return operations;
    }

    const expandedOperations: { position: Vector3D; blockType: string | null }[] = [];
    const { axis, value: currentLayer } = constrainAxis;

    // Get dimension bounds for the depth axis
    const getMaxForAxis = (ax: 'x' | 'y' | 'z'): number => {
      switch (ax) {
        case 'x': return dimensions.width;
        case 'y': return dimensions.height;
        case 'z': return dimensions.depth;
      }
    };
    const maxValue = getMaxForAxis(axis);

    // Determine direction (away from camera) based on view type
    const direction = this.getDepthDirection(viewType);

    // Expand each operation along the depth axis
    for (const operation of operations) {
      let layersPainted = 0;

      // Paint up to thickness layers in the away-from-camera direction
      for (let i = 0; i < depthConfig.thickness; i++) {
        const layer = currentLayer + (i * direction);

        // Check bounds
        if (layer < 0 || layer >= maxValue) {
          break;
        }

        const expandedPosition: Vector3D = { ...operation.position };
        expandedPosition[axis] = layer;

        // Check if there's already a block at this position
        const existingBlock = projectManager.getBlock(expandedPosition);

        // For "until-collision" mode: stop if we hit a block (when painting, not erasing)
        if (depthConfig.mode === 'until-collision' && operation.blockType !== null && existingBlock) {
          break;
        }

        // For "through" mode: always paint regardless of existing blocks
        expandedOperations.push({
          position: expandedPosition,
          blockType: operation.blockType,
        });

        layersPainted++;
      }
    }

    return expandedOperations;
  }

  /**
   * Get the depth direction (away from camera) based on view type
   * Returns +1 for increasing layer numbers, -1 for decreasing
   *
   * Camera positions and away directions:
   * - Front (looking North +Y): Camera at -Y, away = +Y (+1)
   * - Back (looking South -Y): Camera at +Y, away = -Y (-1)
   * - Left (looking East +X): Camera at -X, away = +X (+1)
   * - Right (looking West -X): Camera at +X, away = -X (-1)
   * - Top (looking Down -Z): Camera at +Z, away = -Z (-1)
   * - Bottom (looking Up +Z): Camera at -Z, away = +Z (+1)
   */
  private getDepthDirection(viewType: ViewType): number {
    switch (viewType) {
      case 'front':
        return 1;  // Y increases away from camera
      case 'back':
        return -1; // Y decreases away from camera
      case 'left':
        return 1;  // X increases away from camera
      case 'right':
        return -1; // X decreases away from camera
      case 'top':
        return -1; // Z decreases away from camera
      case 'bottom':
        return 1;  // Z increases away from camera
    }
  }
}
