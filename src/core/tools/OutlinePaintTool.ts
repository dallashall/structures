import { ClickDragReleaseTool } from "./ClickDragReleaseTool";
import type { UniversalPosition } from "./ToolBase";
import { PaintPipeline } from "./PaintPipeline";
import { OutlinePaintStrategy } from "../painting/strategies/OutlinePaintStrategy";
import { draftingService } from "../DraftingService";
import { editorState } from "../EditorState";
import { eventLog } from "../EventLog";
import { projectView } from "../../projections/ProjectView";
import type { PaintOperation } from "../painting/strategies/PaintStrategy";

/**
 * OutlinePaintTool - Rectangle outline/filled via click-drag
 *
 * Hover: shows single-block preview at cursor.
 * Drag: shows rectangle preview from start to current (replaces on each move).
 * Release: persists the rectangle as a single compound event.
 */
export class OutlinePaintTool extends ClickDragReleaseTool {
  private strategy = new OutlinePaintStrategy();
  private draftOps: PaintOperation[] = [];

  protected onHover(pos: UniversalPosition): void {
    this.previewData = { blocks: [{ position: pos }] };
    this.requestRender();
  }

  protected onDragStart(pos: UniversalPosition): void {
    this.strategy.startDrag(this.toModel(pos));
    draftingService.start();
    this.draftOps = [];
  }

  protected onDrag(_start: UniversalPosition, current: UniversalPosition): void {
    const project = projectView.getCached();
    if (!project) return;
    const selectedBlock = editorState.getSelectedBlock();
    if (!selectedBlock) return;

    const model = this.toModel(current);
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

    this.draftOps = PaintPipeline.process(
      baseOps,
      this.viewState.getViewType(),
      project.dimensions,
    );

    draftingService.set(this.draftOps.filter(hasBlockType));
    this.requestRender();
  }

  protected async onDragEnd(
    _start: UniversalPosition,
    _end: UniversalPosition,
  ): Promise<void> {
    this.strategy.endDrag();
    await this.finalizeDraft();
    this.previewData = { blocks: [] };
    this.requestRender();
  }

  protected onDragCancel(): void {
    this.strategy.endDrag();
    draftingService.cancel();
    this.draftOps = [];
    this.previewData = { blocks: [] };
    this.requestRender();
  }

  protected onLeave(): void {
    this.previewData = { blocks: [] };
    this.requestRender();
  }

  private async finalizeDraft(): Promise<void> {
    if (this.draftOps.length === 0) {
      draftingService.cancel();
      return;
    }

    const projectId = editorState.getCurrentProjectId();
    if (!projectId) {
      draftingService.cancel();
      return;
    }

    const deleteMode = editorState.getDeleteMode();
    const deleteOps = this.draftOps.filter(isDeleteOp(deleteMode));
    const placeOps = this.draftOps.filter(isPlaceOp(deleteMode));

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
        { blocks: placeOps.map(toPlacedBlock) },
        projectId,
      );
    }

    draftingService.cancel();
    this.draftOps = [];
  }
}

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
