import type { ViewType, BlockData } from "../../types";
import { blockProjection } from "../../projections/BlockProjection";
import { modelProjection } from "../../projections/ModelProjection";
import { projectView } from "../../projections/ProjectView";
import { draftingService } from "../DraftingService";
import { editorState } from "../EditorState";
import { renderLoop } from "../RenderLoop";
import { confirmMetaBlockCommand } from "../../commands/ConfirmMetaBlockCommand";
import { shapeCatalog } from "../shapes/ShapeCatalog";

import { ViewState } from "./ViewState";
import { Canvas2DRenderer } from "./Canvas2DRenderer";
import { resolveBlocksToGrid, resolvePreviewToGrid } from "./GridBlock";
import type { GridBlock } from "./GridBlock";
import { toolRegistry } from "../tools/ToolRegistry";
import type { ToolBase } from "../tools/ToolBase";

/**
 * Canvas2D - Orchestrator for a 2D canvas panel
 *
 * Wires together:
 * - ViewState (zoom, pan, coordinate math)
 * - Canvas2DRenderer (pure rendering)
 * - ToolBase subclass (interaction + preview)
 * - RenderLoop (shared tick)
 * - Singleton events (external state changes → re-resolve → re-render)
 *
 * **Coordinate resolution**: This class is the single point where model→grid
 * conversion happens for rendering. Data is resolved at change time (event
 * handlers), not at render time. The renderer receives only GridBlock[] data.
 */
export class Canvas2D {
  private viewState: ViewState;
  private renderer: Canvas2DRenderer;
  private activeTool: ToolBase | null = null;
  private needsRender = true;

  // Pre-resolved grid data — converted once at data-change time
  private resolvedPersistentBlocks: GridBlock[] = [];
  private resolvedDraftBlocks: GridBlock[] = [];
  private resolvedEditorPreview: GridBlock[] = [];

  // ============================================================================
  // Bound handlers
  // ============================================================================

  private handleRender = (): void => {
    if (!this.needsRender) return;
    this.needsRender = false;
    this.renderer.render(
      this.viewState,
      this.activeTool?.previewData ?? null,
      this.resolvedPersistentBlocks,
      this.resolvedDraftBlocks,
      this.resolvedEditorPreview,
    );
  };

  private handleModelRebuilt = (): void => {
    this.viewState.fitIfUnadjusted();
    this.resolvePersistentBlocks();
  };

  private handleRequestRender = (): void => {
    this.needsRender = true;
  };

  private handleToolChange = (mode: string): void => {
    this.setTool(mode);
  };

  // ============================================================================
  // Resolution handlers — convert model→grid at data-change time
  // ============================================================================

  private resolvePersistentBlocks = (): void => {
    const project = projectView.getCached();
    if (!project) {
      this.resolvedPersistentBlocks = [];
      this.needsRender = true;
      return;
    }

    const activeLayers = editorState.getActiveLayers();
    const axes = this.viewState.getAxesForView();
    const depthAxis = axes.depth.toLowerCase() as "x" | "y" | "z";
    const activeLayer =
      depthAxis === "x"
        ? activeLayers.x
        : depthAxis === "y"
          ? activeLayers.y
          : activeLayers.z;

    const minLayer = Math.max(0, activeLayer - 2);
    const maxLayer = activeLayer + 2;
    const blockIndex = blockProjection.getCached();

    const blocks: BlockData[] = [];

    for (let layer = minLayer; layer <= maxLayer; layer++) {
      const blocksAtLayer = blockIndex.getBlocksAtLayer(depthAxis, layer);
      for (const blockData of blocksAtLayer) {
        // Resolve derived state (stair shape, connections) reactively
        const resolved = shapeCatalog.resolveBlockState(blockData.position, blockIndex);
        blocks.push(resolved ?? blockData);
      }
    }

    this.resolvedPersistentBlocks = resolveBlocksToGrid(
      blocks,
      this.viewState,
      project.dimensions,
      activeLayers,
    );
    this.needsRender = true;
  };

  private resolveDraftBlocks = (): void => {
    const project = projectView.getCached();
    if (!project) {
      this.resolvedDraftBlocks = [];
      this.needsRender = true;
      return;
    }

    const draftPreview = draftingService.getResolvedPreview();
    this.resolvedDraftBlocks = resolvePreviewToGrid(
      draftPreview,
      this.viewState,
      project.dimensions,
    );
    this.needsRender = true;
  };

  private resolveEditorPreview = (): void => {
    const project = projectView.getCached();
    if (!project) {
      this.resolvedEditorPreview = [];
      this.needsRender = true;
      return;
    }

    const editorPreview = editorState.getPreviewBlocks();
    this.resolvedEditorPreview = resolvePreviewToGrid(
      editorPreview,
      this.viewState,
      project.dimensions,
    );
    this.needsRender = true;
  };

  // ============================================================================
  // Constructor
  // ============================================================================

  constructor(
    private canvas: HTMLCanvasElement,
    viewType: ViewType,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");

    this.viewState = new ViewState(viewType, canvas.width, canvas.height);
    this.renderer = new Canvas2DRenderer(ctx, canvas);

    this.subscribeToEvents();
    this.resolvePersistentBlocks();
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
    this.resolvePersistentBlocks();
    this.resolveDraftBlocks();
    this.resolveEditorPreview();
  }

  destroy(): void {
    this.activeTool?.deactivate();
    this.activeTool = null;
    this.unsubscribeFromEvents();
  }

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

    // Persistent block resolution
    blockProjection.on("blocks:rebuilt", this.resolvePersistentBlocks);
    modelProjection.on("model:rebuilt", this.handleModelRebuilt);
    editorState.on("layer:adjusted", this.resolvePersistentBlocks);

    // Draft block resolution
    draftingService.on("draft:updated", this.resolveDraftBlocks);
    draftingService.on("draft:finalized", this.resolveDraftBlocks);
    draftingService.on("draft:cancelled", this.resolveDraftBlocks);

    // Editor preview resolution
    editorState.on("preview:rendered", this.resolveEditorPreview);

    // Render-only events (no data resolution needed)
    editorState.on("block:selected", this.handleRequestRender);
    editorState.on("paintbehavior:selected", this.handleRequestRender);

    // Tool switching
    editorState.on("paintmode:selected", this.handleToolChange);
  }

  private unsubscribeFromEvents(): void {
    renderLoop.off("tick", this.handleRender);
    renderLoop.unregister();

    blockProjection.off("blocks:rebuilt", this.resolvePersistentBlocks);
    modelProjection.off("model:rebuilt", this.handleModelRebuilt);
    editorState.off("layer:adjusted", this.resolvePersistentBlocks);

    draftingService.off("draft:updated", this.resolveDraftBlocks);
    draftingService.off("draft:finalized", this.resolveDraftBlocks);
    draftingService.off("draft:cancelled", this.resolveDraftBlocks);

    editorState.off("preview:rendered", this.resolveEditorPreview);

    editorState.off("block:selected", this.handleRequestRender);
    editorState.off("paintbehavior:selected", this.handleRequestRender);

    editorState.off("paintmode:selected", this.handleToolChange);
  }
}
