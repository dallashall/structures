/**
 * Model reducer - applies model:* events from the EventLog to a Model.
 *
 * Shared by ModelProjection (current project) and Storage (project list),
 * so both replay the same events to the same dimensions and blocks.
 * Mutates the model in place: BlockIndex is too large to copy per event.
 */

import { BlockIndex } from '../core/BlockIndex';
import type { Event } from '../core/EventLog';
import type { Dimensions, Vector3D, MetaBlock } from '../types';

export interface Model {
  dimensions: Dimensions;
  blocks: BlockIndex;
  metaBlock: MetaBlock;
}

export const MODEL_EVENT_TYPES = [
  'model:initialized',
  'model:blockPlaced',
  'model:blockRemoved',
  'model:blocksPlaced',
  'model:blocksRemoved',
  'model:dimensionExpanded',
  'model:dimensionShrunk',
  'model:metaBlockPlaced',
  'model:metaBlockConfirmed',
];

export function createEmptyModel(): Model {
  return {
    dimensions: { width: 16, height: 16, depth: 16 },
    blocks: new BlockIndex(),
    metaBlock: {
      position: { x: 0, y: 0, z: 0 },
      direction: 'y-',
      isConfirmed: false,
    },
  };
}

const shiftPosition = (position: Vector3D, shift: Vector3D): Vector3D => ({
  x: position.x + shift.x,
  y: position.y + shift.y,
  z: position.z + shift.z,
});

const hasShift = (shift: Vector3D): boolean =>
  shift.x !== 0 || shift.y !== 0 || shift.z !== 0;

const isInside = (position: Vector3D, dimensions: Dimensions): boolean =>
  position.x >= 0 &&
  position.x < dimensions.width &&
  position.y >= 0 &&
  position.y < dimensions.height &&
  position.z >= 0 &&
  position.z < dimensions.depth;

/**
 * Returns true when the event type is a model event and was applied.
 */
export function applyModelEvent(model: Model, event: Event): boolean {
  switch (event.type) {
    case 'model:initialized': {
      const data = event.data as { dimensions: Dimensions };
      model.dimensions = data.dimensions;
      return true;
    }

    case 'model:blockPlaced': {
      const data = event.data as { position: Vector3D; blockType: string };
      model.blocks.set(data.position, {
        position: data.position,
        blockType: data.blockType,
      });
      return true;
    }

    case 'model:blockRemoved': {
      const data = event.data as { position: Vector3D };
      model.blocks.delete(data.position);
      return true;
    }

    case 'model:blocksPlaced': {
      const data = event.data as { blocks: Array<{ position: Vector3D; blockType: string }> };
      for (const block of data.blocks) {
        model.blocks.set(block.position, {
          position: block.position,
          blockType: block.blockType,
        });
      }
      return true;
    }

    case 'model:blocksRemoved': {
      const data = event.data as { positions: Vector3D[] };
      for (const position of data.positions) {
        model.blocks.delete(position);
      }
      return true;
    }

    case 'model:dimensionExpanded': {
      const data = event.data as { newDimensions: Dimensions; shift: Vector3D };
      model.dimensions = data.newDimensions;

      if (hasShift(data.shift)) {
        const newBlocks = new BlockIndex();
        model.blocks.forEach((block) => {
          const newPos = shiftPosition(block.position, data.shift);
          newBlocks.set(newPos, { ...block, position: newPos });
        });
        model.blocks = newBlocks;
        model.metaBlock = {
          ...model.metaBlock,
          position: shiftPosition(model.metaBlock.position, data.shift),
        };
      }
      return true;
    }

    case 'model:dimensionShrunk': {
      const data = event.data as { newDimensions: Dimensions; shift: Vector3D };
      model.dimensions = data.newDimensions;

      // Blocks shifted outside the new bounds are dropped
      const newBlocks = new BlockIndex();
      model.blocks.forEach((block) => {
        const newPos = shiftPosition(block.position, data.shift);
        if (isInside(newPos, data.newDimensions)) {
          newBlocks.set(newPos, { ...block, position: newPos });
        }
      });
      model.blocks = newBlocks;

      if (hasShift(data.shift)) {
        model.metaBlock = {
          ...model.metaBlock,
          position: shiftPosition(model.metaBlock.position, data.shift),
        };
      }
      return true;
    }

    case 'model:metaBlockPlaced': {
      const data = event.data as { position: Vector3D };
      model.metaBlock = { ...model.metaBlock, position: data.position };
      return true;
    }

    case 'model:metaBlockConfirmed': {
      model.metaBlock = { ...model.metaBlock, isConfirmed: true };
      return true;
    }

    default:
      return false;
  }
}
