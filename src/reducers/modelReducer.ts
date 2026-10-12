/**
 * Model reducer - applies model:* rows to a Model.
 *
 * ModelProjection (open project) and Storage (project list) share it, so both show the same dimensions and blocks.
 * It mutates the model in place, because copying a BlockIndex per event costs too much.
 */

import { BlockIndex } from '../core/BlockIndex';
import { normalizeLegacyDirections } from '../core/DirectionMapping';
import { ACTION_STARTED, type Event } from '../core/EventLog';
import { foldHistory, isActionStart } from './historyReducer';
import type { BlockData, BlockStateProperties, Dimensions, HorizontalDirection, Vector3D, MetaBlock } from '../types';

interface PlacedBlock {
  position: Vector3D;
  blockType: string;
  blockState?: BlockStateProperties;
}

export interface Model {
  dimensions: Dimensions;
  blocks: BlockIndex;
  metaBlock: MetaBlock;
}

const MODEL_EVENT_TYPES = [
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

// Everything replayModel reads: model events plus the action markers that decide which are undone
export const REPLAY_EVENT_TYPES = [...MODEL_EVENT_TYPES, ACTION_STARTED];

export function createEmptyModel(): Model {
  return {
    dimensions: { width: 16, height: 16, depth: 16 },
    blocks: new BlockIndex(),
    metaBlock: {
      position: { x: 0, y: 0, z: 0 },
      direction: 'y-',
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

// Stored block states may carry front/back/left/right directions, which read as axes from here on
const toBlockData = ({ position, blockType, blockState }: PlacedBlock): BlockData => ({
  position,
  blockType,
  blockState: blockState ? normalizeLegacyDirections(blockState) : blockState,
});

const shiftBlocks = (blocks: BlockIndex, shift: Vector3D, dimensions?: Dimensions): BlockIndex => {
  const shifted = new BlockIndex();
  const moveBlock = (block: BlockData): void => {
    const position = shiftPosition(block.position, shift);
    if (!dimensions || isInside(position, dimensions)) {
      shifted.set(position, { ...block, position });
    }
  };
  blocks.forEach(moveBlock);
  return shifted;
};

const isInside = (position: Vector3D, dimensions: Dimensions): boolean =>
  position.x >= 0 &&
  position.x < dimensions.width &&
  position.y >= 0 &&
  position.y < dimensions.height &&
  position.z >= 0 &&
  position.z < dimensions.depth;

// False for any row that is not a model event
export function applyModelEvent(model: Model, event: Event): boolean {
  switch (event.type) {
    case 'model:initialized': {
      const data = event.data as { dimensions: Dimensions };
      model.dimensions = data.dimensions;
      return true;
    }

    case 'model:blockPlaced': {
      const data = event.data as PlacedBlock;
      model.blocks.set(data.position, toBlockData(data));
      return true;
    }

    case 'model:blockRemoved': {
      const data = event.data as { position: Vector3D };
      model.blocks.delete(data.position);
      return true;
    }

    case 'model:blocksPlaced': {
      const data = event.data as { blocks: PlacedBlock[] };
      for (const block of data.blocks) {
        model.blocks.set(block.position, toBlockData(block));
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
        model.blocks = shiftBlocks(model.blocks, data.shift);
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
      model.blocks = shiftBlocks(model.blocks, data.shift, data.newDimensions);

      if (hasShift(data.shift)) {
        model.metaBlock = {
          ...model.metaBlock,
          position: shiftPosition(model.metaBlock.position, data.shift),
        };
      }
      return true;
    }

    case 'model:metaBlockPlaced': {
      const data = event.data as { position: Vector3D; direction?: HorizontalDirection };
      model.metaBlock = { position: data.position, direction: data.direction ?? model.metaBlock.direction };
      return true;
    }

    // Stored logs may hold confirm rows from a placement step the editor no longer has
    case 'model:metaBlockConfirmed':
      return false;

    default:
      return false;
  }
}

/**
 * Replay one project's events in ID order into a fresh model.
 * Events of undone actions are skipped. The markers in the same list decide which actions are undone.
 */
export function replayModel(events: Event[]): Model {
  const { undone } = foldHistory(events.filter(isActionStart));
  const model = createEmptyModel();
  for (const event of events) {
    if (!event.actionId || !undone.has(event.actionId)) {
      applyModelEvent(model, event);
    }
  }
  return model;
}
