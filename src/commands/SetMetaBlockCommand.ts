import { eventLog } from '../core/EventLog';
import { editorState } from '../core/EditorState';
import { modelProjection } from '../projections/ModelProjection';
import type { HorizontalDirection, Vector3D } from '../types';
import { rotateLeft, rotateRight } from '../core/DirectionMath';

/**
 * SetMetaBlockCommand - Moves or turns the meta block
 *
 * Appends to: EventLog (one undoable metablock-place action holding model:metaBlockPlaced)
 * Appends nothing when the position is outside the build volume or nothing changes.
 */
class SetMetaBlockCommand {
  private static instance: SetMetaBlockCommand;

  private constructor() {}

  static getInstance(): SetMetaBlockCommand {
    if (!SetMetaBlockCommand.instance) {
      SetMetaBlockCommand.instance = new SetMetaBlockCommand();
    }
    return SetMetaBlockCommand.instance;
  }

  async execute(position: Vector3D, direction: HorizontalDirection): Promise<void> {
    const projectId = editorState.getCurrentProjectId();
    if (!projectId) return;

    const { dimensions, metaBlock } = await modelProjection.getModel();
    const isInside =
      position.x >= 0 && position.x < dimensions.width &&
      position.y >= 0 && position.y < dimensions.height &&
      position.z >= 0 && position.z < dimensions.depth;
    if (!isInside) return;

    const isSamePosition =
      position.x === metaBlock.position.x &&
      position.y === metaBlock.position.y &&
      position.z === metaBlock.position.z;
    if (isSamePosition && direction === metaBlock.direction) return;

    await eventLog.appendAction(projectId, {
      kind: 'metablock-place',
      events: [{ type: 'model:metaBlockPlaced', data: { position, direction } }],
    });
  }

  async turn(side: 'left' | 'right'): Promise<void> {
    const { position, direction } = await modelProjection.getMetaBlock();
    await this.execute(position, side === 'left' ? rotateLeft(direction) : rotateRight(direction));
  }
}

export const setMetaBlockCommand = SetMetaBlockCommand.getInstance();
