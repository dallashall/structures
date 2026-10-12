import { ClickDragReleaseTool } from "./ClickDragReleaseTool";
import type { UniversalPosition } from "./ToolBase";
import { PaintPipeline } from "./PaintPipeline";
import { PointPaintStrategy } from "../painting/strategies/PointPaintStrategy";
import { ShapeUtils } from "../painting/strategies/ShapeUtils";
import { lineCells } from "../painting/strategies/DragShape";
import { draftingService } from "../DraftingService";
import { editorState } from "../EditorState";
import { projectView } from "../../projections/ProjectView";
import type { PaintOperation } from "../painting/strategies/PaintStrategy";
import type { Vector3D } from "../../types";

/**
 * PointPaintTool - Paints every cell the drag crosses, and the whole stroke commits as one undoable action
 *
 * Holding Shift turns the stroke into a straight line from the press cell to the cursor, whatever path the pointer takes.
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

  protected onDrag(start: UniversalPosition, current: UniversalPosition): void {
    if (this.modifiers.shift) {
      this.paintLine(start, current);
      return;
    }
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

  // The line replaces the whole draft, so cells from the freehand path or an earlier cursor position drop out
  private paintLine(start: UniversalPosition, current: UniversalPosition): void {
    const { axis } = PaintPipeline.getConstrainedAxis(this.viewState.getViewType(), editorState.getActiveLayers());
    const plane = ShapeUtils.planeFromConstrainAxis(axis);
    const end = this.toModel(current);
    const toPosition = (cell: { u: number; v: number }): Vector3D => ShapeUtils.from2D(cell, plane, end);

    this.draftPositions.clear();
    this.lastPaintedCell = `${current.gridX},${current.gridY}`;
    this.paintModels(lineCells(ShapeUtils.to2D(this.toModel(start), plane), ShapeUtils.to2D(end, plane)).map(toPosition));
  }

  private paintAt(pos: UniversalPosition): void {
    const cellKey = `${pos.gridX},${pos.gridY}`;
    if (this.lastPaintedCell === cellKey) return;
    this.lastPaintedCell = cellKey;
    this.paintModels([this.toModel(pos)]);
  }

  private paintModels(models: Vector3D[]): void {
    const project = projectView.getCached();
    if (!project) return;
    const selectedBlock = editorState.getSelectedBlock();
    if (!selectedBlock) return;

    const constrainAxis = PaintPipeline.getConstrainedAxis(
      this.viewState.getViewType(),
      editorState.getActiveLayers(),
    );
    const toBaseOps = (model: Vector3D): PaintOperation[] =>
      this.strategy.calculateOperations(model, selectedBlock, project.dimensions, constrainAxis);

    const finalOps = PaintPipeline.process(
      models.flatMap(toBaseOps),
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

const hasBlockType = (op: PaintOperation): op is PaintOperation & { blockType: string } =>
  op.blockType !== null;
