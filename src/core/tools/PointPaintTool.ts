import { ClickDragReleaseTool } from "./ClickDragReleaseTool";
import type { UniversalPosition } from "./ToolBase";
import { PaintPipeline } from "./PaintPipeline";
import { PointPaintStrategy } from "../painting/strategies/PointPaintStrategy";
import { draftingService } from "../DraftingService";
import { editorState } from "../EditorState";
import { eventLog } from "../EventLog";
import { projectView } from "../../projections/ProjectView";
import type { PaintOperation } from "../painting/strategies/PaintStrategy";

/**
 * PointPaintTool - Single-cell painting via click-drag
 *
 * Hover: shows single-block preview at cursor.
 * Drag: paints cells along the drag path (with duplicate prevention).
 * Release: persists all painted cells as a single compound event.
 */
export class PointPaintTool extends ClickDragReleaseTool {
  private strategy = new PointPaintStrategy();
  private lastPaintedCell: string | null = null;
  private draftPositions = new Map<string, PaintOperation>();

  protected onHover(pos: UniversalPosition): void {
    this.previewData = { blocks: [{ position: pos }] };
    this.requestRender();
  }

  protected onDragStart(pos: UniversalPosition): void {
    this.lastPaintedCell = null;
    this.draftPositions.clear();
    draftingService.start();
    this.paintAt(pos);
  }

  protected onDrag(_start: UniversalPosition, current: UniversalPosition): void {
    this.paintAt(current);
  }

  protected async onDragEnd(_start: UniversalPosition, _end: UniversalPosition): Promise<void> {
    await this.finalizeDraft();
    this.previewData = { blocks: [] };
    this.requestRender();
  }

  protected onDragCancel(): void {
    draftingService.cancel();
    this.lastPaintedCell = null;
    this.draftPositions.clear();
    this.previewData = { blocks: [] };
    this.requestRender();
  }

  protected onLeave(): void {
    this.previewData = { blocks: [] };
    this.requestRender();
  }

  private paintAt(pos: UniversalPosition): void {
    const cellKey = `${pos.gridX},${pos.gridY}`;
    if (this.lastPaintedCell === cellKey) return;
    this.lastPaintedCell = cellKey;

    const project = projectView.getCached();
    if (!project) return;
    const selectedBlock = editorState.getSelectedBlock();
    if (!selectedBlock) return;

    const model = this.toModel(pos);
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
    if (baseOps instanceof Promise) return; // PointPaintStrategy is always sync

    const finalOps = PaintPipeline.process(
      baseOps,
      this.viewState.getViewType(),
      project.dimensions,
    );

    for (const op of finalOps) {
      const key = `${op.position.x},${op.position.y},${op.position.z}`;
      if (!this.draftPositions.has(key)) {
        this.draftPositions.set(key, op);
      }
    }

    const preview = Array.from(this.draftPositions.values());
    draftingService.set(preview.filter(hasBlockType));
    this.requestRender();
  }

  private async finalizeDraft(): Promise<void> {
    const ops = Array.from(this.draftPositions.values());
    if (ops.length === 0) {
      draftingService.cancel();
      return;
    }

    const projectId = editorState.getCurrentProjectId();
    if (!projectId) {
      draftingService.cancel();
      return;
    }

    const deleteMode = editorState.getDeleteMode();
    const deleteOps = ops.filter(isDeleteOp(deleteMode));
    const placeOps = ops.filter(isPlaceOp(deleteMode));

    if (deleteOps.length > 0) {
      await eventLog.append(
        "model:blocksRemoved",
        { positions: deleteOps.map(extractPosition) },
        projectId,
      );
    }

    if (placeOps.length > 0) {
      await eventLog.append(
        "model:blocksPlaced",
        {
          blocks: placeOps.map(toPlacedBlock),
        },
        projectId,
      );
    }

    draftingService.cancel();
    this.draftPositions.clear();
    this.lastPaintedCell = null;
  }
}

// Helpers
const hasBlockType = (op: PaintOperation): op is PaintOperation & { blockType: string } =>
  op.blockType !== null;

const isDeleteOp = (deleteMode: boolean) => (op: PaintOperation): boolean =>
  deleteMode || op.blockType === null;

const isPlaceOp = (deleteMode: boolean) => (op: PaintOperation): boolean =>
  !deleteMode && op.blockType !== null;

const extractPosition = (op: PaintOperation) => op.position;

const toPlacedBlock = (op: PaintOperation) => ({
  position: op.position,
  blockType: op.blockType!,
  blockState: op.blockState,
});
