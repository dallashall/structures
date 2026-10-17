import type { ViewType, BlockData } from "../../types";
import type { ColorScheme } from "../../config/colorSchemes";
import { blockProjection } from "../../projections/BlockProjection";
import { modelProjection } from "../../projections/ModelProjection";
import { projectView } from "../../projections/ProjectView";
import { draftingService } from "../DraftingService";
import { editorState } from "../EditorState";
import { renderLoop } from "../RenderLoop";
import { themePreference } from "../ThemePreference";
import { shapeCatalog } from "../shapes/ShapeCatalog";

import { ViewState } from "./ViewState";
import { Canvas2DRenderer } from "./Canvas2DRenderer";
import { resolveBlocksToGrid, resolvePreviewToGrid } from "./GridBlock";
import type { GridBlock } from "./GridBlock";
import { toolRegistry } from "../tools/ToolRegistry";
import type { ToolBase } from "../tools/ToolBase";

/**
 * Canvas2D - Orchestrator for one 2D canvas panel
 *
 * This class is the single point where model→grid conversion happens for rendering.
 * Data is resolved when it changes (event handlers), not each frame. The renderer receives only GridBlock[] data.
 */
export class Canvas2D {
  private viewState: ViewState;
  private renderer: Canvas2DRenderer;
  private activeTool: ToolBase | null = null;
  private resizeObserver: ResizeObserver;
  private needsRender = true;

  private resolvedPersistentBlocks: GridBlock[] = [];
  private resolvedDraftBlocks: GridBlock[] = [];
  private resolvedEditorPreview: GridBlock[] = [];

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

  private handleResizeObserved = (entries: ResizeObserverEntry[]): void => {
    const box = entries[0]?.contentRect;
    if (!box) return;
    const width = Math.round(box.width);
    const height = Math.round(box.height);
    if (width !== this.canvas.width || height !== this.canvas.height) {
      this.resize(width, height);
    }
  };

  private handleRequestRender = (): void => {
    this.needsRender = true;
  };

  private handleColorSchemeSwitched = (scheme: ColorScheme): void => {
    this.renderer.setColorScheme(scheme);
    this.needsRender = true;
  };

  private handleToolChange = (mode: string): void => {
    this.setTool(mode);
  };

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
        // Stair shape and connections derive from neighbors, so they resolve here rather than in the stored row
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

  constructor(
    private canvas: HTMLCanvasElement,
    viewType: ViewType,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");

    this.viewState = new ViewState(viewType, canvas.width, canvas.height);
    this.renderer = new Canvas2DRenderer(ctx, canvas, themePreference.getScheme());

    // The canvas fills its container with CSS. Its drawing buffer follows that size 1:1.
    this.resizeObserver = new ResizeObserver(this.handleResizeObserved);
    this.resizeObserver.observe(canvas);

    this.subscribeToEvents();
    this.resolvePersistentBlocks();
    this.setTool(editorState.getPaintMode());
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.viewState.setCanvasSize(width, height);
    this.needsRender = true;
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.activeTool?.deactivate();
    this.activeTool = null;
    this.unsubscribeFromEvents();
  }

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

  private subscribeToEvents(): void {
    renderLoop.register();
    renderLoop.on("tick", this.handleRender);

    blockProjection.on("blocks:rebuilt", this.resolvePersistentBlocks);
    modelProjection.on("model:rebuilt", this.handleModelRebuilt);
    editorState.on("layer:adjusted", this.resolvePersistentBlocks);

    draftingService.on("draft:updated", this.resolveDraftBlocks);
    draftingService.on("draft:finalized", this.resolveDraftBlocks);
    draftingService.on("draft:cancelled", this.resolveDraftBlocks);

    editorState.on("preview:rendered", this.resolveEditorPreview);

    editorState.on("block:selected", this.handleRequestRender);
    editorState.on("paintbehavior:selected", this.handleRequestRender);

    editorState.on("paintmode:selected", this.handleToolChange);

    themePreference.on("colorscheme:switched", this.handleColorSchemeSwitched);
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

    themePreference.off("colorscheme:switched", this.handleColorSchemeSwitched);
  }
}
