import { MultiClickTool } from "./MultiClickTool";
import type { UniversalPosition } from "./ToolBase";
import { PaintPipeline } from "./PaintPipeline";
import { ArchPaintStrategy } from "../painting/strategies/ArchPaintStrategy";
import { draftingService } from "../DraftingService";
import { editorState } from "../EditorState";
import { eventLog } from "../EventLog";
import { projectView } from "../../projections/ProjectView";
import type { PaintOperation } from "../painting/strategies/PaintStrategy";

/**
 * ArchPaintTool - Arch painting via 3 clicks
 *
 * 1. Click base start (left foot)
 * 2. Click base end (right foot)
 * 3. Click apex (defines height/curvature)
 *
 * Guide geometry (control points + guide lines) is displayed during
 * point placement. Preview updates live as the cursor moves.
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

    await this.persistOps(finalOps);
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

  private async persistOps(
    ops: PaintOperation[],
  ): Promise<void> {
    if (ops.length === 0) return;

    const projectId = editorState.getCurrentProjectId();
    if (!projectId) return;

    const deleteMode = editorState.getDeleteMode();

    if (deleteMode) {
      const positions = ops.map(extractPosition);
      await eventLog.append("model:blocksRemoved", { positions }, projectId);
    } else {
      const blocks = ops.filter(hasBlockType).map(toPlacedBlock);
      if (blocks.length > 0) {
        await eventLog.append("model:blocksPlaced", { blocks }, projectId);
      }
    }
  }
}

const hasBlockType = (op: PaintOperation): op is PaintOperation & { blockType: string } =>
  op.blockType !== null;

const extractPosition = (op: PaintOperation) => op.position;

const toPlacedBlock = (op: PaintOperation) => ({
  position: op.position,
  blockType: op.blockType!,
  blockState: op.blockState,
});
