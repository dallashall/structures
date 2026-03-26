import { ClickDragReleaseTool } from "./ClickDragReleaseTool";
import type { UniversalPosition } from "./ToolBase";
import { PaintPipeline } from "./PaintPipeline";
import { FillPaintStrategy } from "../painting/strategies/FillPaintStrategy";
import { editorState } from "../EditorState";
import { eventLog } from "../EventLog";
import { projectView } from "../../projections/ProjectView";

/**
 * FillPaintTool - Flood fill on click release
 *
 * Hover: shows single-block preview at cursor.
 * Click-release (same cell): performs flood fill from that cell.
 * Drag: no-op (fill only fires on click, not drag).
 */
export class FillPaintTool extends ClickDragReleaseTool {
  private strategy = new FillPaintStrategy();

  protected onHover(pos: UniversalPosition): void {
    this.previewData = { blocks: [{ position: pos }] };
    this.requestRender();
  }

  protected onDragStart(_pos: UniversalPosition): void {
    // No-op: fill happens on release
  }

  protected onDrag(
    _start: UniversalPosition,
    _current: UniversalPosition,
  ): void {
    // No-op: fill doesn't drag-paint
  }

  protected async onDragEnd(
    start: UniversalPosition,
    end: UniversalPosition,
  ): Promise<void> {
    // Only fill if released on the same cell (click, not drag)
    if (start.gridX !== end.gridX || start.gridY !== end.gridY) return;

    const project = projectView.getCached();
    if (!project) return;
    const selectedBlock = editorState.getSelectedBlock();
    if (!selectedBlock) return;

    const model = this.toModel(end);
    const activeLayers = editorState.getActiveLayers();
    const constrainAxis = PaintPipeline.getConstrainedAxis(
      this.viewState.getViewType(),
      activeLayers,
    );

    // FillPaintStrategy is async (uses blockProjection.getBlock)
    const baseOps = await this.strategy.calculateOperations(
      model,
      selectedBlock,
      project.dimensions,
      constrainAxis,
    );

    const finalOps = PaintPipeline.process(
      baseOps,
      this.viewState.getViewType(),
      project.dimensions,
    );

    if (finalOps.length === 0) return;

    // Persist immediately (fill is a single atomic action)
    const projectId = editorState.getCurrentProjectId();
    if (!projectId) return;

    const deleteMode = editorState.getDeleteMode();

    if (deleteMode) {
      const positions = finalOps.map(extractPosition);
      await eventLog.append("model:blocksRemoved", { positions }, projectId);
    } else {
      const blocks = finalOps
        .filter(hasBlockType)
        .map(toPlacedBlock);
      if (blocks.length > 0) {
        await eventLog.append("model:blocksPlaced", { blocks }, projectId);
      }
    }

    this.previewData = { blocks: [] };
    this.requestRender();
  }

  protected onDragCancel(): void {
    this.previewData = { blocks: [] };
    this.requestRender();
  }

  protected onLeave(): void {
    this.previewData = { blocks: [] };
    this.requestRender();
  }
}

const extractPosition = (op: { position: { x: number; y: number; z: number } }) => op.position;

const hasBlockType = (op: { blockType: string | null }): op is { position: { x: number; y: number; z: number }; blockType: string } =>
  op.blockType !== null;

const toPlacedBlock = (op: { position: { x: number; y: number; z: number }; blockType: string | null }) => ({
  position: op.position,
  blockType: op.blockType!,
});
