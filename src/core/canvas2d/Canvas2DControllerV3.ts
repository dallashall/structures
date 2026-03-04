import type { ViewType } from '../../types';
import { projectManager } from '../ProjectManager';
import { editorStateManager } from '../EditorStateManager';
import { CanvasPainter } from '../painting/CanvasPainter';
import { PointPaintStrategy } from '../painting/strategies/PointPaintStrategy';
import { FillPaintStrategy } from '../painting/strategies/FillPaintStrategy';
import { OutlinePaintStrategy } from '../painting/strategies/OutlinePaintStrategy';
import { NormalBehavior } from '../painting/behaviors/NormalBehavior';
import { OnlyReplaceBehavior } from '../painting/behaviors/OnlyReplaceBehavior';
import { SelectiveReplaceBehavior } from '../painting/behaviors/SelectiveReplaceBehavior';

import { Canvas2DViewport } from './Canvas2DViewport';
import { Canvas2DRenderer } from './Canvas2DRenderer';
import { Canvas2DPreviewManager } from './Canvas2DPreviewManager';
import { Canvas2DPaintHandler } from './Canvas2DPaintHandler';
import { Canvas2DInteractionHandler } from './Canvas2DInteractionHandlerV2';
import type { GridPosition, ModifierKeys } from './Canvas2DInteractionEvents';

/**
 * Canvas2DController - Orchestrates 2D canvas with proper separation of concerns
 *
 * Architecture:
 * - InteractionHandler: Generic input events (no domain knowledge)
 * - Controller: Domain logic and orchestration (THIS class)
 * - Viewport, Renderer, PreviewManager, PaintHandler: Focused modules
 *
 * This class receives generic interaction events and implements domain logic:
 * - Point mode + hover = show preview
 * - Outline mode + drag = show outline preview
 * - Click + placement mode = place meta block
 * - etc.
 */
export class Canvas2DController {
  private viewport: Canvas2DViewport;
  private renderer: Canvas2DRenderer;
  private previewManager: Canvas2DPreviewManager;
  private paintHandler: Canvas2DPaintHandler;
  private interactionHandler: Canvas2DInteractionHandler;
  private canvasPainter: CanvasPainter;

  // Domain state
  private isPlacementMode = false;
  private cursorState: 'default' | 'crosshair' | 'grab' | 'grabbing' | 'pointer' | 'not-allowed' = 'crosshair';

  // Bound event handlers (for cleanup)
  private boundHandlers = {
    projectChanged: this.render.bind(this),
    editorChanged: this.render.bind(this),
    paintModeChanged: this.handlePaintModeChanged.bind(this),
    paintBehaviorChanged: this.handlePaintBehaviorChanged.bind(this),
  };

  constructor(
    private canvas: HTMLCanvasElement,
    viewType: ViewType
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    // Create modules
    this.viewport = new Canvas2DViewport(viewType, canvas.width, canvas.height);
    this.renderer = new Canvas2DRenderer(ctx, canvas);

    // Create painting system
    const initialStrategy = this.createStrategyForMode(editorStateManager.getPaintMode());
    const initialBehavior = this.createBehaviorForType(editorStateManager.getPaintBehavior());
    this.canvasPainter = new CanvasPainter(initialStrategy, initialBehavior);

    this.paintHandler = new Canvas2DPaintHandler(this.viewport, this.canvasPainter);
    this.previewManager = new Canvas2DPreviewManager(this.viewport, this.canvasPainter);

    // Create interaction handler with event handlers
    this.interactionHandler = new Canvas2DInteractionHandler(
      canvas,
      this.viewport,
      {
        onHover: this.handleHover.bind(this),
        onClick: this.handleClick.bind(this),
        onDragStart: this.handleDragStart.bind(this),
        onDragMove: this.handleDragMove.bind(this),
        onDragEnd: this.handleDragEnd.bind(this),
        onMouseLeave: this.handleMouseLeave.bind(this),
        onZoom: this.handleZoom.bind(this),
        onPanStart: this.handlePanStart.bind(this),
        onPanMove: this.handlePanMove.bind(this),
        onPanEnd: this.handlePanEnd.bind(this),
        onModifierChange: this.handleModifierChange.bind(this),
      }
    );

    // Subscribe to singleton events
    this.subscribeToEvents();

    // Initial render
    this.render();
    this.updateCursor();
  }

  /**
   * Subscribe to singleton events
   */
  private subscribeToEvents(): void {
    projectManager.on('project:changed', this.boundHandlers.projectChanged);
    projectManager.on('block:added', this.boundHandlers.projectChanged);
    projectManager.on('block:removed', this.boundHandlers.projectChanged);
    editorStateManager.on('block:selected', this.boundHandlers.editorChanged);
    editorStateManager.on('layer:changed', this.boundHandlers.editorChanged);
    editorStateManager.on('paintmode:changed', this.boundHandlers.paintModeChanged);
    editorStateManager.on('paintbehavior:changed', this.boundHandlers.paintBehaviorChanged);
  }

  /**
   * Unsubscribe from singleton events
   */
  private unsubscribeFromEvents(): void {
    projectManager.off('project:changed', this.boundHandlers.projectChanged);
    projectManager.off('block:added', this.boundHandlers.projectChanged);
    projectManager.off('block:removed', this.boundHandlers.projectChanged);
    editorStateManager.off('block:selected', this.boundHandlers.editorChanged);
    editorStateManager.off('layer:changed', this.boundHandlers.editorChanged);
    editorStateManager.off('paintmode:changed', this.boundHandlers.paintModeChanged);
    editorStateManager.off('paintbehavior:changed', this.boundHandlers.paintBehaviorChanged);
  }

  /**
   * Destroy controller and clean up
   */
  destroy(): void {
    this.unsubscribeFromEvents();
    this.interactionHandler.destroy();
  }

  /**
   * Set view type
   */
  setViewType(viewType: ViewType): void {
    this.viewport.setViewType(viewType);
    this.render();
  }

  /**
   * Set placement mode (domain state)
   */
  setPlacementMode(isPlacementMode: boolean): void {
    this.isPlacementMode = isPlacementMode;
    this.updateCursor();
    this.render();
  }

  /**
   * Resize canvas
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.viewport.setCanvasSize(width, height);
    this.render();
  }

  /**
   * Render the canvas
   */
  private render(): void {
    this.renderer.render(this.viewport, this.previewManager);
  }

  // ============================================================================
  // Interaction Event Handlers (Domain Logic)
  // ============================================================================

  /**
   * Handle hover - domain logic decides what to do based on mode
   */
  private handleHover(position: GridPosition, modifiers: ModifierKeys): void {
    const paintMode = editorStateManager.getPaintMode();

    // Point mode: show preview
    if (paintMode === 'point' && !modifiers.shift && !modifiers.alt) {
      this.previewManager.updatePointPreview(position.gridX, position.gridY);
      this.render();
    }

    // Update last grid position for preview key
    this.previewManager.updateLastGridPosition(position.gridX, position.gridY);
  }

  /**
   * Handle click - domain logic
   */
  private handleClick(position: GridPosition, button: number, modifiers: ModifierKeys): void {
    // Placement mode: place meta block
    if (this.isPlacementMode && button === 0 && !modifiers.shift) {
      this.placeMetaBlock(position);
      return;
    }

    // Normal painting handled in drag events
  }

  /**
   * Handle drag start - domain logic
   */
  private handleDragStart(position: GridPosition, button: number, modifiers: ModifierKeys): void {
    // Erase mode (shift + left button)
    if (button === 0 && modifiers.shift) {
      this.paintHandler.resetLastPaintedCell();
      // Erase at this position
      const activeLayers = editorStateManager.getActiveLayers();
      this.canvasPainter.paint(
        position.gridX,
        position.gridY,
        this.viewport.getViewType(),
        activeLayers,
        null // null = erase
      );
      return;
    }

    // Paint mode
    if (button === 0) {
      const paintMode = editorStateManager.getPaintMode();

      // Clear hover preview
      this.previewManager.clearPointPreview();

      // Outline mode: start outline preview
      if (paintMode === 'outline') {
        const worldPos = this.viewport.gridToPosition(position.gridX, position.gridY);
        this.previewManager.startOutlineDrag(position.gridX, position.gridY);

        // Notify strategy
        const strategy = this.canvasPainter['strategy'];
        if (strategy && 'startDrag' in strategy) {
          (strategy as any).startDrag(worldPos);
        }
        return;
      }

      // Point/fill mode: paint immediately
      this.paintHandler.resetLastPaintedCell();
      const activeLayers = editorStateManager.getActiveLayers();
      const selectedBlock = editorStateManager.getSelectedBlock();
      if (selectedBlock) {
        this.canvasPainter.paint(
          position.gridX,
          position.gridY,
          this.viewport.getViewType(),
          activeLayers,
          selectedBlock
        );
      }
    }
  }

  /**
   * Handle drag move - domain logic
   */
  private handleDragMove(position: GridPosition, modifiers: ModifierKeys): void {
    const paintMode = editorStateManager.getPaintMode();

    // Outline mode: update preview
    if (paintMode === 'outline') {
      this.previewManager.updateOutlineDrag(position.gridX, position.gridY);
      this.render();
      return;
    }

    // Point/fill mode while dragging: paint
    if (!modifiers.shift) {
      const activeLayers = editorStateManager.getActiveLayers();
      const selectedBlock = editorStateManager.getSelectedBlock();
      if (selectedBlock) {
        this.canvasPainter.paint(
          position.gridX,
          position.gridY,
          this.viewport.getViewType(),
          activeLayers,
          selectedBlock
        );
      }
    }
  }

  /**
   * Handle drag end - domain logic
   */
  private handleDragEnd(position: GridPosition, _modifiers: ModifierKeys): void {
    const paintMode = editorStateManager.getPaintMode();

    // Outline mode: finalize
    if (paintMode === 'outline') {
      this.previewManager.endOutlineDrag();

      // Paint final outline
      const activeLayers = editorStateManager.getActiveLayers();
      const selectedBlock = editorStateManager.getSelectedBlock();
      if (selectedBlock) {
        this.canvasPainter.paint(
          position.gridX,
          position.gridY,
          this.viewport.getViewType(),
          activeLayers,
          selectedBlock
        );
      }

      // End drag in strategy
      const strategy = this.canvasPainter['strategy'];
      if (strategy && 'endDrag' in strategy) {
        (strategy as any).endDrag();
      }

      this.render();
    }

    this.paintHandler.resetLastPaintedCell();
  }

  /**
   * Handle mouse leave - domain logic
   */
  private handleMouseLeave(): void {
    this.previewManager.clearAll();
    this.paintHandler.resetLastPaintedCell();
    this.render();
  }

  /**
   * Handle zoom - domain logic
   */
  private handleZoom(delta: number, center: { pixelX: number; pixelY: number }): void {
    const changed = this.viewport.applyZoom(delta, center.pixelX, center.pixelY);
    if (changed) {
      this.render();
    }
  }

  /**
   * Handle pan start - domain logic
   */
  private handlePanStart(_position: { pixelX: number; pixelY: number }): void {
    this.cursorState = 'grabbing';
    this.updateCursor();
  }

  /**
   * Handle pan move - domain logic
   */
  private handlePanMove(delta: { deltaX: number; deltaY: number }): void {
    this.viewport.applyPan(delta.deltaX, delta.deltaY);
    this.render();
  }

  /**
   * Handle pan end - domain logic
   */
  private handlePanEnd(): void {
    const modifiers = this.interactionHandler.getModifiers();
    this.cursorState = modifiers.space ? 'grab' : this.getDefaultCursor();
    this.updateCursor();
  }

  /**
   * Handle modifier change - domain logic
   */
  private handleModifierChange(modifiers: ModifierKeys): void {
    // Update cursor based on modifiers
    if (modifiers.space) {
      this.cursorState = 'grab';
    } else if (modifiers.shift) {
      this.cursorState = 'not-allowed';
    } else {
      this.cursorState = this.getDefaultCursor();
    }
    this.updateCursor();

    // Alt key: activate preview ONLY if mouse is inside this canvas
    if (modifiers.alt && this.interactionHandler.isMouseInsideCanvas()) {
      this.previewManager.activatePreviewKey();
      this.render();
    } else if (!modifiers.alt) {
      this.previewManager.deactivatePreviewKey();
      this.render();
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Place meta block at grid position
   */
  private placeMetaBlock(position: GridPosition): void {
    const project = projectManager.getProject();
    if (!project) return;

    const worldPos = this.viewport.gridToPosition(position.gridX, position.gridY);

    // Validate position
    if (
      worldPos.x < 0 || worldPos.x >= project.dimensions.width ||
      worldPos.y < 0 || worldPos.y >= project.dimensions.height ||
      worldPos.z < 0 || worldPos.z >= project.dimensions.depth
    ) {
      return;
    }

    projectManager.setMetaBlock(worldPos);
  }

  /**
   * Get default cursor based on mode
   */
  private getDefaultCursor(): 'crosshair' | 'pointer' {
    return this.isPlacementMode ? 'pointer' : 'crosshair';
  }

  /**
   * Update cursor
   */
  private updateCursor(): void {
    this.canvas.style.cursor = this.cursorState;
  }

  /**
   * Handle paint mode change
   */
  private handlePaintModeChanged(mode: string): void {
    const strategy = this.createStrategyForMode(mode as any);
    this.paintHandler.updateStrategy(strategy);
  }

  /**
   * Handle paint behavior change
   */
  private handlePaintBehaviorChanged(behavior: string): void {
    const behaviorImpl = this.createBehaviorForType(behavior as any);
    this.paintHandler.updateBehavior(behaviorImpl);
  }

  /**
   * Create paint strategy based on mode
   */
  private createStrategyForMode(mode: string) {
    switch (mode) {
      case 'point':
        return new PointPaintStrategy();
      case 'fill':
        return new FillPaintStrategy();
      case 'outline':
        return new OutlinePaintStrategy();
      default:
        return new PointPaintStrategy();
    }
  }

  /**
   * Create paint behavior based on type
   */
  private createBehaviorForType(behavior: string) {
    switch (behavior) {
      case 'normal':
        return new NormalBehavior();
      case 'only-replace':
        return new OnlyReplaceBehavior();
      case 'selective-replace':
        return new SelectiveReplaceBehavior();
      default:
        return new NormalBehavior();
    }
  }

  /**
   * Confirm all meta block placements (static method for multi-controller coordination)
   */
  static confirmAllPlacements(): void {
    projectManager.confirmMetaBlock();
  }
}
