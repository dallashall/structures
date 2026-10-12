import { eventLog } from '../core/EventLog';
import { editorState } from '../core/EditorState';
import { modelProjection } from '../projections/ModelProjection';
import type { Dimensions, Vector3D } from '../types';

type Direction = 'x+' | 'x-' | 'y+' | 'y-' | 'z+' | 'z-';

/**
 * ExpandDimensionsCommand - Grows the project by one layer on one side
 *
 * Appends to: EventLog (one dimension-expand action holding model:dimensionExpanded)
 * Queries: ModelProjection (current dimensions)
 * Validates: no dimension exceeds MAX_DIMENSION
 * Growing a negative side shifts every block +1 along that axis, so blocks keep their place in the world.
 */
export class ExpandDimensionsCommand {
  private readonly MAX_DIMENSION = 256;

  async execute(direction: Direction): Promise<void> {
    const currentDimensions = await modelProjection.getDimensions();

    const expansionResult = this.calculateExpansion(currentDimensions, direction);
    const { newDimensions } = expansionResult;

    if (
      newDimensions.width > this.MAX_DIMENSION ||
      newDimensions.height > this.MAX_DIMENSION ||
      newDimensions.depth > this.MAX_DIMENSION
    ) {
      throw new Error(`Dimensions cannot exceed ${this.MAX_DIMENSION}`);
    }

    const projectId = editorState.getCurrentProjectId();
    if (!projectId) {
      throw new Error('No current project');
    }

    await eventLog.appendAction(projectId, {
      kind: 'dimension-expand',
      events: [{ type: 'model:dimensionExpanded', data: expansionResult }],
    });
  }

  private calculateExpansion(
    current: Dimensions,
    direction: Direction
  ): {
    direction: Direction;
    previousDimensions: Dimensions;
    newDimensions: Dimensions;
    shift: Vector3D;
  } {
    const newDimensions = { ...current };
    const shift: Vector3D = { x: 0, y: 0, z: 0 };

    switch (direction) {
      case 'x+':
        newDimensions.width++;
        break;
      case 'x-':
        newDimensions.width++;
        shift.x = 1;
        break;
      case 'y+':
        newDimensions.height++;
        break;
      case 'y-':
        newDimensions.height++;
        shift.y = 1;
        break;
      case 'z+':
        newDimensions.depth++;
        break;
      case 'z-':
        newDimensions.depth++;
        shift.z = 1;
        break;
    }

    return {
      direction,
      previousDimensions: current,
      newDimensions,
      shift,
    };
  }
}

export const expandDimensionsCommand = new ExpandDimensionsCommand();
