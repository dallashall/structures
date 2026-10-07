/**
 * Shortcuts - Keys bound by KeyboardManager and CameraGestures
 *
 * Tooltips read the same values, so a hint cannot name a key that is not bound.
 * Tool keys live in ToolRegistry, next to each tool's registration.
 */

import { toolRegistry } from './tools/ToolRegistry';

export const SHORTCUTS = {
  swapMaterialSlot: 'F',
  rotateFacing: 'T',
  flipHalf: 'Y',
  layerZUp: 'W',
  layerZDown: 'S',
  layerXUp: 'D',
  layerXDown: 'A',
  layerYUp: 'C',
  layerYDown: 'X',
  frameStructure: 'Home',
} as const;

// Keys 1-9 select the first nine quick-select slots
const QUICK_SELECT_KEY_COUNT = 9;

export function quickSelectShortcut(slotIndex: number): string | null {
  return slotIndex < QUICK_SELECT_KEY_COUNT ? String(slotIndex + 1) : null;
}

export function toolShortcut(toolName: string): string | null {
  const hotkey = toolRegistry.getRegistration(toolName)?.hotkey;
  return hotkey ? hotkey.toUpperCase() : null;
}

export function matchesShortcut(event: KeyboardEvent, key: string): boolean {
  return event.key.toLowerCase() === key.toLowerCase();
}
