/**
 * DirectionMapping - Single source of truth for MC ↔ app direction translation
 *
 * This is the ONLY file in app code that knows about Minecraft's
 * "north"/"south"/"east"/"west" cardinal directions. All other code
 * uses the app's universal axis-based coordinate system: x+/x-/y+/y-/z+/z-.
 *
 * Coordinate mapping (app axis → Minecraft):
 *   y- = north = -Y direction
 *   y+ = south = +Y direction
 *   x+ = east  = +X direction
 *   x- = west  = -X direction
 *   z+ = up    = +Z direction
 *   z- = down  = -Z direction
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

/**
 * Legacy app direction names → axis directions.
 * Used to normalize old persisted events that used front/back/left/right.
 */
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

/**
 * Convert a Minecraft block state to app block state.
 * Translates facing and connection properties from MC directions to axis directions.
 */
export function convertBlockStateFromMc(
  mcState: Record<string, unknown>,
): BlockStateProperties {
  const appState: BlockStateProperties = {};

  for (const [key, value] of Object.entries(mcState)) {
    switch (key) {
      case 'facing':
        appState.facing = mcFacingToApp(value as string);
        break;
      // MC connection properties → axis-based connections record
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
          // Pass through non-boolean values (e.g., wall height strings)
          (appState as Record<string, unknown>)[key] = value;
        }
        break;
      }
      default:
        // Pass through all other properties unchanged
        (appState as Record<string, unknown>)[key] = value;
        break;
    }
  }

  return appState;
}

/**
 * Normalize legacy direction values in block state.
 * Converts old app direction strings (front/back/left/right) to axis directions.
 * Used when replaying persisted events that predate the axis-based system.
 */
export function normalizeLegacyDirections(
  state: BlockStateProperties,
): BlockStateProperties {
  if (!state) return state;

  const result = { ...state };

  // Normalize facing
  if (result.facing && LEGACY_TO_AXIS[result.facing as string]) {
    result.facing = LEGACY_TO_AXIS[result.facing as string];
  }

  // Normalize legacy connection booleans to connections record
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
