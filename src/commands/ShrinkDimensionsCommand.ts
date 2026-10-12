import { eventLog } from '../core/EventLog';
import { editorState } from '../core/EditorState';
import { modelProjection } from '../projections/ModelProjection';
import { blockProjection } from '../projections/BlockProjection';
import type { BlockData, Dimensions, Vector3D } from '../types';

type Direction = 'x+' | 'x-' | 'y+' | 'y-' | 'z+' | 'z-';

/**
 * ShrinkDimensionsCommand - Removes one layer from one side of the project
 *
 * Appends to: EventLog (one dimension-shrink action holding model:dimensionShrunk)
 * Queries: ModelProjection (current dimensions), BlockProjection (blocks in the removed layer)
 * Validates: every dimension stays at least 1, and no block sits in the removed layer
 * Shrinking a negative side shifts every block -1 along that axis.
 */
export class ShrinkDimensionsCommand {
  async execute(direction: Direction): Promise<void> {
    const currentDimensions = await modelProjection.getDimensions();

    const shrinkResult = this.calculateShrink(currentDimensions, direction);
    const { newDimensions } = shrinkResult;

    if (newDimensions.width < 1 || newDimensions.height < 1 || newDimensions.depth < 1) {
      throw new Error('Dimensions cannot be less than 1');
    }

    const blocks = await blockProjection.getBlocks();
    const orphanedBlocks: Vector3D[] = [];

    const recordIfOrphaned = (block: BlockData): void => {
      const shiftedPos = {
        x: block.position.x + shrinkResult.shift.x,
        y: block.position.y + shrinkResult.shift.y,
        z: block.position.z + shrinkResult.shift.z,
      };

      if (
        shiftedPos.x < 0 ||
        shiftedPos.x >= newDimensions.width ||
        shiftedPos.y < 0 ||
        shiftedPos.y >= newDimensions.height ||
        shiftedPos.z < 0 ||
        shiftedPos.z >= newDimensions.depth
      ) {
        orphanedBlocks.push(block.position);
      }
    };
    blocks.forEach(recordIfOrphaned);

    if (orphanedBlocks.length > 0) {
      throw new Error(
        `Cannot shrink: would orphan ${orphanedBlocks.length} block(s). ` +
          `Remove blocks in the shrink area first.`
      );
    }

    const projectId = editorState.getCurrentProjectId();
    if (!projectId) {
      throw new Error('No current project');
    }

    await eventLog.appendAction(projectId, {
      kind: 'dimension-shrink',
      events: [{ type: 'model:dimensionShrunk', data: shrinkResult }],
    });
  }

  private calculateShrink(
    current: Dimensions,
    direction: Direction
  ): {
    direction: Direction;
    previousDimensions: Dimensions;
    newDimensions: Dimensions;
    shift: Vector3D;
    removedBlocks: never[]; // execute rejects any shrink that would remove a block
  } {
    const newDimensions = { ...current };
    const shift: Vector3D = { x: 0, y: 0, z: 0 };

    switch (direction) {
      case 'x+':
        newDimensions.width--;
        break;
      case 'x-':
        newDimensions.width--;
        shift.x = -1;
        break;
      case 'y+':
        newDimensions.height--;
        break;
      case 'y-':
        newDimensions.height--;
        shift.y = -1;
        break;
      case 'z+':
        newDimensions.depth--;
        break;
      case 'z-':
        newDimensions.depth--;
        shift.z = -1;
        break;
    }

    return {
      direction,
      previousDimensions: current,
      newDimensions,
      shift,
      removedBlocks: [],
    };
  }
}

export const shrinkDimensionsCommand = new ShrinkDimensionsCommand();
