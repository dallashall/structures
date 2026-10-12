import { ClickDragReleaseTool } from "./ClickDragReleaseTool";
import type { UniversalPosition } from "./ToolBase";
import { PaintPipeline } from "./PaintPipeline";
import { CirclePaintStrategy } from "../painting/strategies/CirclePaintStrategy";
import { draftingService } from "../DraftingService";
import { editorState } from "../EditorState";
import { projectView } from "../../projections/ProjectView";
import type { PaintOperation } from "../painting/strategies/PaintStrategy";

/**
 * CirclePaintTool - Drag draws an ellipse or circle (see CirclePaintStrategy). Release commits one undoable action.
 */
export class CirclePaintTool extends ClickDragReleaseTool {
  private strategy = new CirclePaintStrategy();
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
    await draftingService.finalize(this.draftOps);
    this.draftOps = [];
  }
}

const hasBlockType = (op: PaintOperation): op is PaintOperation & { blockType: string } =>
  op.blockType !== null;
