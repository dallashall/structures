import type { ViewType } from '../../types';
import { projectView } from '../../projections/ProjectView';
import { editorState } from '../EditorState';
import { renderLoop } from '../RenderLoop';
import { setMetaBlockCommand } from '../../commands/SetMetaBlockCommand';
import { confirmMetaBlockCommand } from '../../commands/ConfirmMetaBlockCommand';
import { CanvasPainter } from '../painting/CanvasPainter';
import { PointPaintStrategy } from '../painting/strategies/PointPaintStrategy';
import { FillPaintStrategy } from '../painting/strategies/FillPaintStrategy';
import { OutlinePaintStrategy } from '../painting/strategies/OutlinePaintStrategy';
import { CirclePaintStrategy } from '../painting/strategies/CirclePaintStrategy';
import { ArchPaintStrategy } from '../painting/strategies/ArchPaintStrategy';
import { CurvePaintStrategy } from '../painting/strategies/CurvePaintStrategy';
import { NormalBehavior } from '../painting/behaviors/NormalBehavior';
import { OnlyReplaceBehavior } from '../painting/behaviors/OnlyReplaceBehavior';
import { SelectiveReplaceBehavior } from '../painting/behaviors/SelectiveReplaceBehavior';

import { Canvas2DViewport } from './Canvas2DViewport';
import { Canvas2DRenderer } from './Canvas2DRenderer';
import { Canvas2DPreviewManager } from './Canvas2DPreviewManager';
import { Canvas2DPaintHandler } from './Canvas2DPaintHandler';
import { Canvas2DInteractionHandler } from './Canvas2DInteractionHandler';
import type { GridPosition, ModifierKeys } from './Canvas2DInteractionEvents';
import { isGuideGeometryProvider } from '../painting/strategies/GuideGeometryProvider';
import type { GuideGeometry } from '../painting/strategies/GuideGeometry';

// Mode categorization helpers
const DRAG_SHAPE_MODES: ReadonlySet<string> = new Set(['outline', 'circle']);
const isDragShapeMode = (mode: string): boolean => DRAG_SHAPE_MODES.has(mode);

const MULTI_CLICK_MODES: ReadonlySet<string> = new Set(['arch', 'curve']);
const isMultiClickMode = (mode: string): boolean => MULTI_CLICK_MODES.has(mode);

/**
 * Canvas2D - Orchestrates 2D canvas with proper separation of concerns
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
export class Canvas2D {
  private viewport: Canvas2DViewport;
  private renderer: Canvas2DRenderer;
  private previewManager: Canvas2DPreviewManager;
  private paintHandler: Canvas2DPaintHandler;
  private interactionHandler: Canvas2DInteractionHandler;
  private canvasPainter: CanvasPainter;

  // Domain state
  private isPlacementMode = false;
  private multiClickActive = false;
  private lastCursorWorldPosition: { x: number; y: number; z: number } | null = null;
  private cursorState: 'default' | 'crosshair' | 'grab' | 'grabbing' | 'pointer' | 'not-allowed' = 'crosshair';

  // Bound event handlers (for cleanup)
  private boundHandlers = {
    tick: this.render.bind(this),
    paintModeChanged: this.handlePaintModeChanged.bind(this),
    paintBehaviorChanged: this.handlePaintBehaviorChanged.bind(this),
    deleteModeChanged: this.handleDeleteModeChanged.bind(this),
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
    const initialStrategy = this.createStrategyForMode(editorState.getPaintMode());
    const initialBehavior = this.createBehaviorForType(editorState.getPaintBehavior());
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
        onEscape: this.handleEscape.bind(this),
      }
    );

    // Subscribe to singleton events
    this.subscribeToEvents();

    // Initial render
    void this.render();
    this.updateCursor();
  }

  /**
   * Subscribe to singleton events
   */
  private subscribeToEvents(): void {
    // Subscribe to shared render loop (all views render together)
    renderLoop.register();
    renderLoop.on('tick', this.boundHandlers.tick);

    // Editor state changes (for mode-specific behavior)
    editorState.on('paintmode:selected', this.boundHandlers.paintModeChanged);
    editorState.on('paintbehavior:selected', this.boundHandlers.paintBehaviorChanged);
    editorState.on('deletemode:changed', this.boundHandlers.deleteModeChanged);
  }

  /**
   * Unsubscribe from singleton events
   */
  private unsubscribeFromEvents(): void {
    // Unsubscribe from shared render loop
    renderLoop.off('tick', this.boundHandlers.tick);
    renderLoop.unregister();

    // Editor state changes
    editorState.off('paintmode:selected', this.boundHandlers.paintModeChanged);
    editorState.off('paintbehavior:selected', this.boundHandlers.paintBehaviorChanged);
    editorState.off('deletemode:changed', this.boundHandlers.deleteModeChanged);
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
    void this.render();
  }

  /**
   * Set placement mode (domain state)
   */
  setPlacementMode(isPlacementMode: boolean): void {
    this.isPlacementMode = isPlacementMode;
    this.updateCursor();
    void this.render();
  }

  /**
   * Resize canvas
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.viewport.setCanvasSize(width, height);
    void this.render();
  }

  /**
   * Render the canvas (called on every tick)
   * Uses cached projection state (ensureFresh called by RenderLoop)
   */
  private render(): void {
    this.renderer.render(this.viewport, this.previewManager, this.computeGuideGeometry());
  }

  /**
   * Compute guide geometry from the current strategy if in multi-click mode
   */
  private computeGuideGeometry(): GuideGeometry | null {
    if (!this.multiClickActive || !this.lastCursorWorldPosition) {
      return null;
    }
    const strategy = this.canvasPainter.getStrategy();
    if (!isGuideGeometryProvider(strategy)) {
      return null;
    }
    return strategy.getGuideGeometry(this.lastCursorWorldPosition);
  }

  // ============================================================================
  // Interaction Event Handlers (Domain Logic)
  // ============================================================================

  /**
   * Handle hover - domain logic decides what to do based on mode
   */
  private handleHover(position: GridPosition, modifiers: ModifierKeys): void {
    // Track cursor world position for guide geometry rendering
    this.lastCursorWorldPosition = this.viewport.gridToPositionSync(position.gridX, position.gridY);

    // Multi-click mode: show live preview of shape with cursor as next point
    if (this.multiClickActive) {
      this.canvasPainter.clearDraftPreview();
      const activeLayers = editorState.getActiveLayers();
      const selectedBlock = editorState.getSelectedBlock();
      if (selectedBlock) {
        this.canvasPainter.paint(
          position.gridX,
          position.gridY,
          this.viewport.getViewType(),
          activeLayers,
          selectedBlock
        );
      }
      void this.render();
      return;
    }

    const paintMode = editorState.getPaintMode();

    // Point mode: show preview (both paint and delete modes)
    if (paintMode === 'point' && !modifiers.alt) {
      this.previewManager.updatePointPreview(position.gridX, position.gridY);
      void this.render();
    }

    // Update last grid position for preview key
    this.previewManager.updateLastGridPosition(position.gridX, position.gridY);
  }

  /**
   * Handle click - domain logic
   */
  private async handleClick(position: GridPosition, button: number, _modifiers: ModifierKeys): Promise<void> {
    // Placement mode: place meta block
    if (this.isPlacementMode && button === 0) {
      await this.placeMetaBlock(position);
      return;
    }

    // Normal painting handled in drag events
  }

  /**
   * Handle drag start - domain logic
   */
  private handleDragStart(position: GridPosition, button: number, _modifiers: ModifierKeys): void {
    // Paint mode (delete modifier will handle erase if needed)
    if (button === 0) {
      const paintMode = editorState.getPaintMode();

      // Multi-click mode (arch, curve): begin draft on first click only
      if (isMultiClickMode(paintMode)) {
        if (!this.multiClickActive) {
          this.paintHandler.beginDraft();
          this.multiClickActive = true;
        }
        return;
      }

      // BEGIN DRAFT MODE - collect all paint operations into single CompoundEvent
      this.paintHandler.beginDraft();

      // Clear hover preview
      this.previewManager.clearPointPreview();

      // Drag shape mode (outline, circle): start drag preview
      if (isDragShapeMode(paintMode)) {
        const worldPos = this.viewport.gridToPositionSync(position.gridX, position.gridY);
        this.previewManager.startOutlineDrag(position.gridX, position.gridY);

        // Notify strategy
        const strategy = this.canvasPainter.getStrategy();
        if ('startDrag' in strategy) {
          (strategy as any).startDrag(worldPos);
        }
        return;
      }

      // Point/fill mode: paint immediately
      this.paintHandler.resetLastPaintedCell();
      const activeLayers = editorState.getActiveLayers();
      const selectedBlock = editorState.getSelectedBlock();
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
  private handleDragMove(position: GridPosition, _modifiers: ModifierKeys): void {
    // Multi-click mode: ignore drag moves (interaction is click-based)
    if (this.multiClickActive) return;

    const paintMode = editorState.getPaintMode();

    // Drag shape mode: clear preview before repainting (replace, not accumulate)
    if (isDragShapeMode(paintMode)) {
      this.canvasPainter.clearDraftPreview();
    }

    // All paint modes (point, fill, outline) use the same paint pipeline
    // This ensures depth modifier, delete modifier, and DraftingService preview work consistently
    const activeLayers = editorState.getActiveLayers();
    const selectedBlock = editorState.getSelectedBlock();
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

  /**
   * Handle drag end - domain logic
   */
  private async handleDragEnd(position: GridPosition, _modifiers: ModifierKeys): Promise<void> {
    // Multi-click mode: place a point on each click release
    if (this.multiClickActive) {
      const strategy = this.canvasPainter.getStrategy();
      if ('addPoint' in strategy) {
        const worldPos = this.viewport.gridToPositionSync(position.gridX, position.gridY);
        (strategy as any).addPoint(worldPos);

        // Recalculate shape with all placed points
        this.canvasPainter.clearDraftPreview();
        const activeLayers = editorState.getActiveLayers();
        const selectedBlock = editorState.getSelectedBlock();
        if (selectedBlock) {
          this.canvasPainter.paint(
            position.gridX,
            position.gridY,
            this.viewport.getViewType(),
            activeLayers,
            selectedBlock
          );
        }

        // Check if all points have been placed
        if ((strategy as any).isComplete()) {
          await this.paintHandler.finalizeDraft();
          this.multiClickActive = false;
          (strategy as any).reset();
          this.previewManager.clearAll();
          void this.render();
        }
      }
      return;
    }

    const paintMode = editorState.getPaintMode();

    // Drag shape mode: end drag in strategy (clears dragStart state)
    if (isDragShapeMode(paintMode)) {
      const strategy = this.canvasPainter.getStrategy();
      if ('endDrag' in strategy) {
        (strategy as any).endDrag();
      }
    }

    // FINALIZE DRAFT MODE - create single CompoundEvent from all operations
    // IMPORTANT: Await to ensure preview is cleared before rendering
    await this.paintHandler.finalizeDraft();
    this.paintHandler.resetLastPaintedCell();

    // Clear preview manager state
    this.previewManager.clearAll();

    void this.render();
  }

  /**
   * Handle mouse leave - domain logic
   */
  private handleMouseLeave(): void {
    // Cancel in-progress multi-click when cursor leaves canvas
    if (this.multiClickActive) {
      this.cancelMultiClick();
      this.paintHandler.cancelDraft();
    }

    this.lastCursorWorldPosition = null;
    this.previewManager.clearAll();
    this.paintHandler.resetLastPaintedCell();
    void this.render();
  }

  /**
   * Handle zoom - domain logic
   */
  private handleZoom(delta: number, center: { pixelX: number; pixelY: number }): void {
    const changed = this.viewport.applyZoom(delta, center.pixelX, center.pixelY);
    if (changed) {
      void this.render();
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
    void this.render();
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
    const deleteMode = editorState.getDeleteMode();

    // Update cursor based on modifiers and delete mode
    if (modifiers.space) {
      this.cursorState = 'grab';
    } else if (deleteMode) {
      this.cursorState = 'not-allowed'; // Erase cursor
    } else {
      this.cursorState = this.getDefaultCursor();
    }
    this.updateCursor();

    // Alt key: activate preview ONLY if mouse is inside this canvas
    if (modifiers.alt && this.interactionHandler.isMouseInsideCanvas()) {
      this.previewManager.activatePreviewKey();
      void this.render();
    } else if (!modifiers.alt) {
      this.previewManager.deactivatePreviewKey();
      void this.render();
    }
  }

  /**
   * Handle escape key - cancel current operation
   */
  private handleEscape(): void {
    // Cancel in-progress multi-click
    if (this.multiClickActive) {
      this.cancelMultiClick();
    }

    // Cancel draft mode (discard collected paint operations and draft event)
    this.paintHandler.cancelDraft();

    // Clear all previews
    this.previewManager.clearAll();

    // Reset paint state
    this.paintHandler.resetLastPaintedCell();

    // Re-render to remove previews
    void this.render();
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Place meta block at grid position
   */
  private async placeMetaBlock(position: GridPosition): Promise<void> {
    const project = await projectView.getProject();
    if (!project) return;

    const worldPos = await this.viewport.gridToPosition(position.gridX, position.gridY);

    // Validate position
    if (
      worldPos.x < 0 || worldPos.x >= project.dimensions.width ||
      worldPos.y < 0 || worldPos.y >= project.dimensions.height ||
      worldPos.z < 0 || worldPos.z >= project.dimensions.depth
    ) {
      return;
    }

    setMetaBlockCommand.execute(worldPos);
  }

  /**
   * Cancel an in-progress multi-click operation
   */
  private cancelMultiClick(): void {
    const strategy = this.canvasPainter.getStrategy();
    if ('reset' in strategy) {
      (strategy as any).reset();
    }
    this.multiClickActive = false;
    this.lastCursorWorldPosition = null;
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
    // Cancel in-progress multi-click if switching modes
    if (this.multiClickActive) {
      this.cancelMultiClick();
      this.paintHandler.cancelDraft();
      this.previewManager.clearAll();
    }

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
   * Handle delete mode change
   * Updates cursor when delete mode is toggled
   */
  private handleDeleteModeChanged(): void {
    // Update cursor to reflect delete mode
    const modifiers = this.interactionHandler.getModifiers();
    this.handleModifierChange(modifiers);

    // Re-render to update any affected visuals
    void this.render();
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
      case 'circle':
        return new CirclePaintStrategy();
      case 'arch':
        return new ArchPaintStrategy();
      case 'curve':
        return new CurvePaintStrategy();
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
    confirmMetaBlockCommand.execute();
  }
}
