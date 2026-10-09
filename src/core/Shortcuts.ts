/**
 * Shortcuts - Keys bound by HotkeyDispatcher and CameraGestures
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
  // Pressed with Ctrl or Cmd. Redo adds Shift.
  undo: 'Z',
} as const;

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

// Key cap text for tooltips, e.g. "Ctrl+Z" or "⌘Z"
export const UNDO_SHORTCUT_LABEL = IS_MAC ? '⌘Z' : 'Ctrl+Z';
export const REDO_SHORTCUT_LABEL = IS_MAC ? '⇧⌘Z' : 'Ctrl+Shift+Z';

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

/**
 * True when Ctrl or Cmd is held. Both count on every platform.
 */
export function hasPrimaryModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey;
}
