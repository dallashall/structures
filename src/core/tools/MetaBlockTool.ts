import { ClickDragReleaseTool } from "./ClickDragReleaseTool";
import type { UniversalPosition } from "./ToolBase";
import { setMetaBlockCommand } from "../../commands/SetMetaBlockCommand";
import { modelProjection } from "../../projections/ModelProjection";

/**
 * MetaBlockTool - A click moves the meta block to the clicked cell on the active layer. It keeps its facing.
 */
export class MetaBlockTool extends ClickDragReleaseTool {
  protected onHover(_pos: UniversalPosition): void {}

  protected onDragStart(pos: UniversalPosition): void {
    const { direction } = modelProjection.getCached().metaBlock;
    void setMetaBlockCommand.execute(this.toModel(pos), direction);
  }
}
