import { MultiClickTool } from "./MultiClickTool";
import type { UniversalPosition } from "./ToolBase";
import { PaintPipeline } from "./PaintPipeline";
import { CurvePaintStrategy } from "../painting/strategies/CurvePaintStrategy";
import { draftingService } from "../DraftingService";
import { editorState } from "../EditorState";
import { projectView } from "../../projections/ProjectView";
import type { PaintOperation } from "../painting/strategies/PaintStrategy";

/**
 * CurvePaintTool - Bezier curve painting via 4 clicks
 *
 * 1. Click start point
 * 2. Click end point
 * 3. Click control point 1 (curve bends toward it near start)
 * 4. Click control point 2 (curve bends toward it near end)
 *
 * Guide geometry (control points + guide lines + tangent hints) is
 * displayed during point placement. Preview updates live as cursor moves.
 */
export class CurvePaintTool extends MultiClickTool {
  protected readonly maxPoints = 4;
  private strategy = new CurvePaintStrategy();

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

    // Update cross-view preview if we have placed points
    if (placed.length > 0) {
      draftingService.set(finalOps.filter(hasBlockType));
    }

    // Update guide geometry for view-local rendering
    const guide = this.strategy.getGuideGeometry(model);
    this.previewData = {
      blocks: placed.length === 0 ? [{ position: cursor }] : [],
      guide: guide ?? undefined,
    };
    this.requestRender();
  }

  protected onPointPlaced(pos: UniversalPosition, count: number): void {
    this.strategy.addPoint(this.toModel(pos));

    // Start draft service on first placed point
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
