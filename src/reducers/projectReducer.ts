/**
 * Project reducer - pure function that applies events to produce new state
 *
 * This reducer is the heart of the event-sourced architecture.
 * It takes current state and an event, and returns the new state.
 */

import type { Project, Vector3D } from '../types';
import { BlockIndex } from '../core/BlockIndex';
import type {
  ProjectDataEvent,
  DimensionExpandedEvent,
  DimensionShrunkEvent,
} from '../events/types';

/**
 * Apply dimension expansion to state
 */
function applyDimensionExpansion(
  state: Project,
  event: DimensionExpandedEvent
): Project {
  const { newDimensions, shift } = event.payload;

  // If no shift needed, just update dimensions
  if (shift.x === 0 && shift.y === 0 && shift.z === 0) {
    return {
      ...state,
      dimensions: newDimensions,
      modified: new Date(event.timestamp),
    };
  }

  // Shift all blocks
  const newBlocks = new BlockIndex();

  state.blocks.forEach((block) => {
    const newPos: Vector3D = {
      x: block.position.x + shift.x,
      y: block.position.y + shift.y,
      z: block.position.z + shift.z,
    };
    newBlocks.set(newPos, {
      ...block,
      position: newPos,
    });
  });

  // Shift meta block
  const newMetaBlockPosition: Vector3D = {
    x: state.metaBlock.position.x + shift.x,
    y: state.metaBlock.position.y + shift.y,
    z: state.metaBlock.position.z + shift.z,
  };

  return {
    ...state,
    dimensions: newDimensions,
    blocks: newBlocks,
    metaBlock: {
      ...state.metaBlock,
      position: newMetaBlockPosition,
    },
    modified: new Date(event.timestamp),
  };
}

/**
 * Apply dimension shrinking to state
 */
function applyDimensionShrink(
  state: Project,
  event: DimensionShrunkEvent
): Project {
  const { newDimensions, shift } = event.payload;

  // Filter and shift blocks
  const newBlocks = new BlockIndex();

  state.blocks.forEach((block) => {
    const newPos: Vector3D = {
      x: block.position.x + shift.x,
      y: block.position.y + shift.y,
      z: block.position.z + shift.z,
    };

    // Only keep blocks within new dimensions
    if (
      newPos.x >= 0 &&
      newPos.x < newDimensions.width &&
      newPos.y >= 0 &&
      newPos.y < newDimensions.height &&
      newPos.z >= 0 &&
      newPos.z < newDimensions.depth
    ) {
      newBlocks.set(newPos, {
        ...block,
        position: newPos,
      });
    }
  });

  // Shift meta block if needed
  let newMetaBlockPosition = state.metaBlock.position;
  if (shift.x !== 0 || shift.y !== 0 || shift.z !== 0) {
    newMetaBlockPosition = {
      x: state.metaBlock.position.x + shift.x,
      y: state.metaBlock.position.y + shift.y,
      z: state.metaBlock.position.z + shift.z,
    };
  }

  return {
    ...state,
    dimensions: newDimensions,
    blocks: newBlocks,
    metaBlock: {
      ...state.metaBlock,
      position: newMetaBlockPosition,
    },
    modified: new Date(event.timestamp),
  };
}

/**
 * Project reducer - applies events to state
 */
export function projectReducer(
  state: Project | null,
  event: ProjectDataEvent
): Project | null {
  switch (event.type) {
    case 'project:created':
      return {
        id: event.projectId,
        name: event.payload.name,
        dimensions: event.payload.dimensions,
        metaBlock: {
          position: { x: 0, y: 0, z: 0 },
          direction: 'north',
          isConfirmed: false,
        },
        blocks: new BlockIndex(),
        created: new Date(event.timestamp),
        modified: new Date(event.timestamp),
      };

    case 'block:placed': {
      if (!state) return null;

      // Clone BlockIndex by creating new one and copying all blocks
      const newBlocks = new BlockIndex();
      state.blocks.forEach((block) => {
        newBlocks.set(block.position, block);
      });

      // Add new block
      newBlocks.set(event.payload.position, {
        position: event.payload.position,
        blockType: event.payload.blockType,
      });

      return {
        ...state,
        blocks: newBlocks,
        modified: new Date(event.timestamp),
      };
    }

    case 'block:removed': {
      if (!state) return null;

      // Clone BlockIndex by creating new one and copying all blocks except the removed one
      const newBlocks = new BlockIndex();
      state.blocks.forEach((block) => {
        newBlocks.set(block.position, block);
      });

      // Remove block
      newBlocks.delete(event.payload.position);

      return {
        ...state,
        blocks: newBlocks,
        modified: new Date(event.timestamp),
      };
    }

    case 'metablock:placed': {
      if (!state) return null;

      return {
        ...state,
        metaBlock: {
          ...state.metaBlock,
          position: event.payload.position,
        },
        modified: new Date(event.timestamp),
      };
    }

    case 'metablock:confirmed': {
      if (!state) return null;

      return {
        ...state,
        metaBlock: {
          ...state.metaBlock,
          isConfirmed: true,
        },
        modified: new Date(event.timestamp),
      };
    }

    case 'dimension:expanded': {
      if (!state) return null;
      return applyDimensionExpansion(state, event);
    }

    case 'dimension:shrunk': {
      if (!state) return null;
      return applyDimensionShrink(state, event);
    }

    case 'project:renamed': {
      if (!state) return null;

      return {
        ...state,
        name: event.payload.newName,
        modified: new Date(event.timestamp),
      };
    }

    case 'compound': {
      // Reduce compound events by folding child events
      return event.events.reduce(projectReducer, state);
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = event;
      console.warn('Unknown event type:', _exhaustive);
      return state;
    }
  }
}
