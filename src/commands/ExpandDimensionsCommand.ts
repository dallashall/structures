import { eventLog } from '../core/EventLog';
import { editorState } from '../core/EditorState';
import { modelProjection } from '../projections/ModelProjection';
import type { Dimensions, Vector3D } from '../types';

type Direction = 'x+' | 'x-' | 'y+' | 'y-' | 'z+' | 'z-';

/**
 * ExpandDimensionsCommand - Expands project dimensions
 *
 * Appends to: EventLog (one dimension-expand action holding model:dimensionExpanded)
 * Queries: ModelProjection (current dimensions)
 * Validates: dimensions don't exceed max limits
 *
 * Side effect: ModelProjection and BlockProjection handle dimension expansion
 */
export class ExpandDimensionsCommand {
  private readonly MAX_DIMENSION = 256;

  async execute(direction: Direction): Promise<void> {
    // Query current dimensions
    const currentDimensions = await modelProjection.getDimensions();

    // Calculate new dimensions and shift
    const expansionResult = this.calculateExpansion(currentDimensions, direction);
    const { newDimensions } = expansionResult;

    // Validate max limits
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
        // Expand east (positive X) - no shift needed
        newDimensions.width++;
        break;
      case 'x-':
        // Expand west (negative X) - shift all blocks +1 in X
        newDimensions.width++;
        shift.x = 1;
        break;
      case 'y+':
        // Expand north (positive Y) - no shift needed
        newDimensions.height++;
        break;
      case 'y-':
        // Expand south (negative Y) - shift all blocks +1 in Y
        newDimensions.height++;
        shift.y = 1;
        break;
      case 'z+':
        // Expand up (positive Z) - no shift needed
        newDimensions.depth++;
        break;
      case 'z-':
        // Expand down (negative Z) - shift all blocks +1 in Z
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
