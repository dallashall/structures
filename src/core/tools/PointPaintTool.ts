import { ClickDragReleaseTool } from "./ClickDragReleaseTool";
import type { UniversalPosition } from "./ToolBase";
import { PaintPipeline } from "./PaintPipeline";
import { PointPaintStrategy } from "../painting/strategies/PointPaintStrategy";
import { draftingService } from "../DraftingService";
import { editorState } from "../EditorState";
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
    await draftingService.finalize(Array.from(this.draftPositions.values()));
    this.draftPositions.clear();
    this.lastPaintedCell = null;
  }
}

// Helpers
const hasBlockType = (op: PaintOperation): op is PaintOperation & { blockType: string } =>
  op.blockType !== null;
