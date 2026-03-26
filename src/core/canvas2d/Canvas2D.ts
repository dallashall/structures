import type { ViewType } from "../../types";
import { blockProjection } from "../../projections/BlockProjection";
import { modelProjection } from "../../projections/ModelProjection";
import { draftingService } from "../DraftingService";
import { editorState } from "../EditorState";
import { renderLoop } from "../RenderLoop";
import { confirmMetaBlockCommand } from "../../commands/ConfirmMetaBlockCommand";

import { ViewState } from "./ViewState";
import { Canvas2DRenderer } from "./Canvas2DRenderer";
import { toolRegistry } from "../tools/ToolRegistry";
import type { ToolBase } from "../tools/ToolBase";

/**
 * Canvas2D - Thin orchestrator for a 2D canvas panel
 *
 * Wires together:
 * - ViewState (zoom, pan, coordinate math)
 * - Canvas2DRenderer (pure rendering)
 * - ToolBase subclass (interaction + preview)
 * - RenderLoop (shared tick)
 * - Singleton events (external state changes → re-render)
 */
export class Canvas2D {
  private viewState: ViewState;
  private renderer: Canvas2DRenderer;
  private activeTool: ToolBase | null = null;
  private needsRender = true;

  // Bound handlers for subscribe/unsubscribe symmetry
  private handleRender = (): void => {
    if (!this.needsRender) return;
    this.needsRender = false;
    this.renderer.render(
      this.viewState,
      this.activeTool?.previewData ?? null,
    );
  };

  private handleRequestRender = (): void => {
    this.needsRender = true;
  };

  private handleToolChange = (mode: string): void => {
    this.setTool(mode);
  };

  constructor(
    private canvas: HTMLCanvasElement,
    viewType: ViewType,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");

    this.viewState = new ViewState(viewType, canvas.width, canvas.height);
    this.renderer = new Canvas2DRenderer(ctx, canvas);

    this.subscribeToEvents();
    this.setTool(editorState.getPaintMode());
  }

  // ============================================================================
  // Public API
  // ============================================================================

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.viewState.setCanvasSize(width, height);
    this.needsRender = true;
  }

  setViewType(viewType: ViewType): void {
    this.viewState.setViewType(viewType);
    this.needsRender = true;
  }

  destroy(): void {
    this.activeTool?.deactivate();
    this.activeTool = null;
    this.unsubscribeFromEvents();
  }

  /**
   * Confirm all meta block placements (static, for multi-panel coordination)
   */
  static confirmAllPlacements(): void {
    confirmMetaBlockCommand.execute();
  }

  // ============================================================================
  // Tool management
  // ============================================================================

  private setTool(name: string): void {
    this.activeTool?.deactivate();
    this.activeTool = toolRegistry.createTool(
      name,
      this.canvas,
      this.viewState,
      this.handleRequestRender,
    );
    this.activeTool.activate();
    this.needsRender = true;
  }

  // ============================================================================
  // Event subscriptions
  // ============================================================================

  private subscribeToEvents(): void {
    renderLoop.register();
    renderLoop.on("tick", this.handleRender);

    blockProjection.on("blocks:rebuilt", this.handleRequestRender);
    modelProjection.on("model:rebuilt", this.handleRequestRender);
    draftingService.on("draft:updated", this.handleRequestRender);
    draftingService.on("draft:finalized", this.handleRequestRender);
    draftingService.on("draft:cancelled", this.handleRequestRender);
    editorState.on("preview:rendered", this.handleRequestRender);
    editorState.on("layer:adjusted", this.handleRequestRender);
    editorState.on("block:selected", this.handleRequestRender);
    editorState.on("paintbehavior:selected", this.handleRequestRender);
    editorState.on("deletemode:changed", this.handleRequestRender);

    editorState.on("paintmode:selected", this.handleToolChange);
  }

  private unsubscribeFromEvents(): void {
    renderLoop.off("tick", this.handleRender);
    renderLoop.unregister();

    blockProjection.off("blocks:rebuilt", this.handleRequestRender);
    modelProjection.off("model:rebuilt", this.handleRequestRender);
    draftingService.off("draft:updated", this.handleRequestRender);
    draftingService.off("draft:finalized", this.handleRequestRender);
    draftingService.off("draft:cancelled", this.handleRequestRender);
    editorState.off("preview:rendered", this.handleRequestRender);
    editorState.off("layer:adjusted", this.handleRequestRender);
    editorState.off("block:selected", this.handleRequestRender);
    editorState.off("paintbehavior:selected", this.handleRequestRender);
    editorState.off("deletemode:changed", this.handleRequestRender);

    editorState.off("paintmode:selected", this.handleToolChange);
  }
}
