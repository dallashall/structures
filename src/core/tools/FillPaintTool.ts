import { ClickDragReleaseTool } from "./ClickDragReleaseTool";
import type { UniversalPosition } from "./ToolBase";
import { PaintPipeline } from "./PaintPipeline";
import { FillPaintStrategy } from "../painting/strategies/FillPaintStrategy";
import { draftingService } from "../DraftingService";
import { editorState } from "../EditorState";
import { projectView } from "../../projections/ProjectView";

/**
 * FillPaintTool - Flood fills when press and release land on the same cell. A drag does nothing.
 */
export class FillPaintTool extends ClickDragReleaseTool {
  private strategy = new FillPaintStrategy();

  protected onHover(pos: UniversalPosition): void {
    this.previewData = { blocks: [{ position: pos }] };
    this.requestRender();
  }

  protected onDragStart(_pos: UniversalPosition): void {}

  protected onDrag(
    _start: UniversalPosition,
    _current: UniversalPosition,
  ): void {}

  protected async onDragEnd(
    start: UniversalPosition,
    end: UniversalPosition,
  ): Promise<void> {
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

    // The fill reads the model across an await, so undo and redo wait until it commits
    draftingService.start();

    let baseOps: Awaited<ReturnType<typeof this.strategy.calculateOperations>>;
    try {
      baseOps = await this.strategy.calculateOperations(
        model,
        selectedBlock,
        project.dimensions,
        constrainAxis,
      );
    } catch (error) {
      draftingService.cancel();
      throw error;
    }

    const finalOps = PaintPipeline.process(
      baseOps,
      this.viewState.getViewType(),
      project.dimensions,
    );

    if (finalOps.length === 0) {
      draftingService.cancel();
      return;
    }

    await draftingService.finalize(finalOps);

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
