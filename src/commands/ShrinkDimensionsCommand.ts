import { eventLog } from '../core/EventLog';
import { modelProjection } from '../projections/ModelProjection';
import { blockProjection } from '../projections/BlockProjection';
import type { Dimensions, Vector3D } from '../types';

type Direction = 'x+' | 'x-' | 'y+' | 'y-' | 'z+' | 'z-';

/**
 * ShrinkDimensionsCommand - Shrinks project dimensions
 *
 * Appends to: EventLog (model:dimensionShrunk)
 * Queries: ModelProjection (current dimensions) + BlockProjection (to prevent orphaning)
 * Validates: no blocks would be orphaned (outside new dimensions)
 *
 * This is a key example of cross-projection validation - the command
 * must query BOTH projections to enforce business rules.
 */
export class ShrinkDimensionsCommand {
  async execute(direction: Direction): Promise<void> {
    // Query current dimensions from ModelProjection
    const currentDimensions = await modelProjection.getDimensions();

    // Calculate new dimensions and shift
    const shrinkResult = this.calculateShrink(currentDimensions, direction);
    const { newDimensions } = shrinkResult;

    // Validate: can't shrink below 1
    if (newDimensions.width < 1 || newDimensions.height < 1 || newDimensions.depth < 1) {
      throw new Error('Dimensions cannot be less than 1');
    }

    // Query blocks from BlockProjection to check for orphans
    const blocks = await blockProjection.getBlocks();
    const orphanedBlocks: Vector3D[] = [];

    blocks.forEach((block) => {
      const shiftedPos = {
        x: block.position.x + shrinkResult.shift.x,
        y: block.position.y + shrinkResult.shift.y,
        z: block.position.z + shrinkResult.shift.z,
      };

      // Check if shifted position would be outside new dimensions
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
    });

    // Reject if blocks would be orphaned
    if (orphanedBlocks.length > 0) {
      throw new Error(
        `Cannot shrink: would orphan ${orphanedBlocks.length} block(s). ` +
          `Remove blocks in the shrink area first.`
      );
    }

    // Append to EventLog
    await eventLog.append('model:dimensionShrunk', shrinkResult);
  }

  private calculateShrink(
    current: Dimensions,
    direction: Direction
  ): {
    direction: Direction;
    previousDimensions: Dimensions;
    newDimensions: Dimensions;
    shift: Vector3D;
    removedBlocks: never[]; // Empty because we validate no blocks are orphaned
  } {
    const newDimensions = { ...current };
    const shift: Vector3D = { x: 0, y: 0, z: 0 };

    switch (direction) {
      case 'x+':
        // Shrink from east (remove positive X side) - no shift needed
        newDimensions.width--;
        break;
      case 'x-':
        // Shrink from west (remove negative X side) - shift blocks -1 in X
        newDimensions.width--;
        shift.x = -1;
        break;
      case 'y+':
        // Shrink from north (remove positive Y side) - no shift needed
        newDimensions.height--;
        break;
      case 'y-':
        // Shrink from south (remove negative Y side) - shift blocks -1 in Y
        newDimensions.height--;
        shift.y = -1;
        break;
      case 'z+':
        // Shrink from top (remove positive Z side) - no shift needed
        newDimensions.depth--;
        break;
      case 'z-':
        // Shrink from bottom (remove negative Z side) - shift blocks -1 in Z
        newDimensions.depth--;
        shift.z = -1;
        break;
    }

    return {
      direction,
      previousDimensions: current,
      newDimensions,
      shift,
      removedBlocks: [], // Always empty because we reject shrink if blocks would be orphaned
    };
  }
}

export const shrinkDimensionsCommand = new ShrinkDimensionsCommand();
