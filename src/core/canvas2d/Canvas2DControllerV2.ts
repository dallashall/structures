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
import { Canvas2DInteractionHandler } from './Canvas2DInteractionHandler';

/**
 * Canvas2DController - Orchestrates 2D canvas modules
 *
 * This is a thin orchestrator that composes focused modules:
 * - Canvas2DViewport (coordinates & view state)
 * - Canvas2DRenderer (pure rendering)
 * - Canvas2DPreviewManager (preview logic)
 * - Canvas2DPaintHandler (paint operations)
 * - Canvas2DInteractionHandler (input events)
 *
 * Responsibilities:
 * - Create and wire up modules
 * - Coordinate singleton event subscriptions
 * - Provide public API for React component
 * - Trigger renders when state changes
 *
 * This class delegates almost everything to specialized modules.
 */
export class Canvas2DController {
  private viewport: Canvas2DViewport;
  private renderer: Canvas2DRenderer;
  private previewManager: Canvas2DPreviewManager;
  private paintHandler: Canvas2DPaintHandler;
  private interactionHandler: Canvas2DInteractionHandler;
  private canvasPainter: CanvasPainter;

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

    this.interactionHandler = new Canvas2DInteractionHandler(
      canvas,
      this.viewport,
      this.previewManager,
      this.paintHandler,
      () => this.render()
    );

    // Subscribe to singleton events
    this.subscribeToEvents();

    // Initial render
    this.render();
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
   * Set placement mode
   */
  setPlacementMode(isPlacementMode: boolean): void {
    this.interactionHandler.setPlacementMode(isPlacementMode);
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
