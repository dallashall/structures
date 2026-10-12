import { MultiClickTool } from "./MultiClickTool";
import type { UniversalPosition } from "./ToolBase";
import { PaintPipeline } from "./PaintPipeline";
import { ArchPaintStrategy } from "../painting/strategies/ArchPaintStrategy";
import { draftingService } from "../DraftingService";
import { editorState } from "../EditorState";
import { projectView } from "../../projections/ProjectView";
import type { PaintOperation } from "../painting/strategies/PaintStrategy";

/**
 * ArchPaintTool - Arch from three clicks (see ArchPaintStrategy). The third click commits one undoable action.
 */
export class ArchPaintTool extends MultiClickTool {
  protected readonly maxPoints = 3;
  private strategy = new ArchPaintStrategy();

  protected onHoverWithPoints(cursor: UniversalPosition, placed: UniversalPosition[]): void {
    const project = projectView.getCached();
    if (!project) return;
    const selectedBlock = editorState.getSelectedBlock();
    if (!selectedBlock) return;

    const model = this.toModel(cursor);
    const activeLayers = editorState.getActiveLayers();
    const constrainAxis = PaintPipeline.getConstrainedAxis(
      this.viewState.getViewType(),
      activeLayers,
    );

    const baseOps = this.strategy.calculateOperations(
      model,
      selectedBlock,
      project.dimensions,
      constrainAxis,
    );
    if (baseOps instanceof Promise) return;

    const finalOps = PaintPipeline.process(
      baseOps,
      this.viewState.getViewType(),
      project.dimensions,
    );

    // DraftingService shares the preview with the other views and the 3D view
    if (placed.length > 0) {
      draftingService.set(finalOps.filter(hasBlockType));
    }

    // Guides draw only in the view being clicked
    const guide = this.strategy.getGuideGeometry(model);
    this.previewData = {
      blocks: placed.length === 0 ? [{ position: cursor }] : [],
      guide: guide ?? undefined,
    };
    this.requestRender();
  }

  protected onPointPlaced(pos: UniversalPosition, count: number): void {
    this.strategy.addPoint(this.toModel(pos));

    if (count === 1) {
      draftingService.start();
    }
  }

  protected async onComplete(points: UniversalPosition[]): Promise<void> {
    const project = projectView.getCached();
    if (!project) {
      this.cleanup();
      return;
    }

    const selectedBlock = editorState.getSelectedBlock();
    if (!selectedBlock) {
      this.cleanup();
      return;
    }

    const lastPoint = points[points.length - 1];
    const model = this.toModel(lastPoint);
    const activeLayers = editorState.getActiveLayers();
    const constrainAxis = PaintPipeline.getConstrainedAxis(
      this.viewState.getViewType(),
      activeLayers,
    );

    const baseOps = this.strategy.calculateOperations(
      model,
      selectedBlock,
      project.dimensions,
      constrainAxis,
    );
    if (baseOps instanceof Promise) {
      this.cleanup();
      return;
    }

    const finalOps = PaintPipeline.process(
      baseOps,
      this.viewState.getViewType(),
      project.dimensions,
    );

    await draftingService.finalize(finalOps);
    this.cleanup();
  }

  protected onMultiClickCancel(): void {
    this.cleanup();
  }

  protected onLeave(): void {
    this.previewData = { blocks: [] };
    this.requestRender();
  }

  private cleanup(): void {
    this.strategy.reset();
    draftingService.cancel();
    this.previewData = { blocks: [] };
    this.requestRender();
  }

}

const hasBlockType = (op: PaintOperation): op is PaintOperation & { blockType: string } =>
  op.blockType !== null;
