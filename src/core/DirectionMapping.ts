/**
 * DirectionMapping - The only app code that knows Minecraft's cardinal names. Everything else uses
 * axis directions (x+, x-, y+, y-, z+, z-): north is y-, south y+, east x+, west x-, up z+, down z-.
 */

import type { BlockStateProperties, AxisDirection } from '../types';

const MC_TO_APP: Record<string, AxisDirection> = {
  north: 'y-',
  south: 'y+',
  east: 'x+',
  west: 'x-',
  up: 'z+',
  down: 'z-',
};

// Stored events may still carry front/back/left/right facings and connections
const LEGACY_TO_AXIS: Record<string, AxisDirection> = {
  front: 'y-',
  back: 'y+',
  right: 'x+',
  left: 'x-',
  up: 'z+',
  down: 'z-',
};

function mcFacingToApp(facing: string): AxisDirection {
  return MC_TO_APP[facing] ?? (facing as AxisDirection);
}

export function convertBlockStateFromMc(
  mcState: Record<string, unknown>,
): BlockStateProperties {
  const appState: BlockStateProperties = {};

  for (const [key, value] of Object.entries(mcState)) {
    switch (key) {
      case 'facing':
        appState.facing = mcFacingToApp(value as string);
        break;
      case 'north':
      case 'south':
      case 'east':
      case 'west':
      case 'up':
      case 'down': {
        if (typeof value === 'boolean') {
          if (!appState.connections) appState.connections = {};
          appState.connections[MC_TO_APP[key]] = value;
        } else {
          // Wall sides carry height strings, not booleans
          (appState as Record<string, unknown>)[key] = value;
        }
        break;
      }
      default:
        (appState as Record<string, unknown>)[key] = value;
        break;
    }
  }

  return appState;
}

// Replay runs every stored block state through this, so front/back/left/right values read as axes
export function normalizeLegacyDirections(
  state: BlockStateProperties,
): BlockStateProperties {
  if (!state) return state;

  const result = { ...state };

  if (result.facing && LEGACY_TO_AXIS[result.facing as string]) {
    result.facing = LEGACY_TO_AXIS[result.facing as string];
  }

  const legacyConnectionKeys = ['front', 'back', 'left', 'right', 'up', 'down'] as const;
  let hasLegacyConnections = false;
  for (const key of legacyConnectionKeys) {
    if ((state as Record<string, unknown>)[key] !== undefined) {
      hasLegacyConnections = true;
      break;
    }
  }

  if (hasLegacyConnections) {
    const connections: Partial<Record<AxisDirection, boolean>> = { ...result.connections };
    for (const key of legacyConnectionKeys) {
      const val = (state as Record<string, unknown>)[key];
      if (typeof val === 'boolean') {
        connections[LEGACY_TO_AXIS[key]] = val;
        delete (result as Record<string, unknown>)[key];
      }
    }
    result.connections = connections;
  }

  return result;
}
