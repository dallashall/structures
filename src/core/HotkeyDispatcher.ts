import { editorState } from './EditorState';
import { modelProjection } from '../projections/ModelProjection';
import { toolRegistry } from './tools/ToolRegistry';
import { SHORTCUTS, matchesShortcut } from './Shortcuts';
import { blockRegistry } from './BlockRegistry';
import type { PaintMode } from '../types';

/**
 * HotkeyDispatcher - Handles global keyboard shortcuts
 *
 * Singleton that manages all application-level keyboard shortcuts.
 * Follows architecture: business logic in singletons, not components.
 *
 * Shortcuts:
 * - 1-9: Select block from quick-select slot and apply to active material slot
 * - F: Toggle foreground/background material slot
 * - T: Rotate facing direction (when stateful block selected)
 * - Y: Flip slab half (when stateful block selected)
 * - W/S: Increment/decrement Z layer (height - up/down)
 * - A/D: Decrement/increment X layer (width - left/right)
 * - X/C: Decrement/increment Y layer (depth - forward/back)
 */
class HotkeyDispatcher {
  private static instance: HotkeyDispatcher;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): HotkeyDispatcher {
    if (!HotkeyDispatcher.instance) {
      HotkeyDispatcher.instance = new HotkeyDispatcher();
    }
    return HotkeyDispatcher.instance;
  }

  /**
   * Initialize keyboard event listeners
   * Call once at app startup
   */
  initialize(): void {
    if (this.isInitialized) {
      console.warn('HotkeyDispatcher already initialized');
      return;
    }

    window.addEventListener('keydown', this.handleKeyDown);
    this.isInitialized = true;
  }

  /**
   * Cleanup (for testing/teardown)
   */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.isInitialized = false;
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    // Ignore if user is typing in an input field
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    // Tool hotkeys (B, R, C, A, V)
    const toolName = toolRegistry.getByHotkey(event.key.toLowerCase());
    if (toolName) {
      event.preventDefault();
      editorState.setPaintMode(toolName as PaintMode);
      return;
    }

    // Number keys 1-9: Select block from quick-select slot
    if (event.key >= '1' && event.key <= '9') {
      event.preventDefault();
      const slotIndex = parseInt(event.key, 10) - 1;

      // Set this slot index as the active foreground/background
      // This does NOT modify the slot contents - it just makes this slot active
      const activeMaterialSlot = editorState.getActiveMaterialSlot();
      if (activeMaterialSlot === 'foreground') {
        editorState.setForegroundSlotIndex(slotIndex);
      } else {
        editorState.setBackgroundSlotIndex(slotIndex);
      }
    }

    // F key: Toggle between foreground and background
    if (matchesShortcut(event, SHORTCUTS.swapMaterialSlot)) {
      event.preventDefault();
      editorState.toggleMaterialSlot();
    }

    // T key: Rotate facing direction (when stateful block selected)
    if (matchesShortcut(event, SHORTCUTS.rotateFacing)) {
      const selectedBlockId = editorState.getSelectedBlock();
      const selectedBlock = selectedBlockId ? blockRegistry.getBlock(selectedBlockId) : null;
      if (selectedBlock?.hasBlockState) {
        event.preventDefault();
        editorState.rotateFacing();
      }
    }

    // Y key: Flip slab half (when stateful block selected)
    if (matchesShortcut(event, SHORTCUTS.flipHalf)) {
      const selectedBlockId = editorState.getSelectedBlock();
      const selectedBlock = selectedBlockId ? blockRegistry.getBlock(selectedBlockId) : null;
      if (selectedBlock?.hasBlockState) {
        event.preventDefault();
        editorState.flipHalf();
      }
    }

    // Layer navigation shortcuts
    const model = modelProjection.getCached();
    const activeLayers = editorState.getActiveLayers();

    // W/S keys: Z layer (height - up/down)
    if (matchesShortcut(event, SHORTCUTS.layerZUp)) {
      event.preventDefault();
      const nextLayer = (activeLayers.z + 1) % model.dimensions.depth;
      editorState.setActiveLayer('z', nextLayer);
    }

    if (matchesShortcut(event, SHORTCUTS.layerZDown)) {
      event.preventDefault();
      const nextLayer = activeLayers.z === 0
        ? model.dimensions.depth - 1
        : activeLayers.z - 1;
      editorState.setActiveLayer('z', nextLayer);
    }

    // A/D keys: X layer (width - left/right)
    if (matchesShortcut(event, SHORTCUTS.layerXDown)) {
      event.preventDefault();
      const nextLayer = activeLayers.x === 0
        ? model.dimensions.width - 1
        : activeLayers.x - 1;
      editorState.setActiveLayer('x', nextLayer);
    }

    if (matchesShortcut(event, SHORTCUTS.layerXUp)) {
      event.preventDefault();
      const nextLayer = (activeLayers.x + 1) % model.dimensions.width;
      editorState.setActiveLayer('x', nextLayer);
    }

    // X/C keys: Y layer (depth - forward/back)
    if (matchesShortcut(event, SHORTCUTS.layerYDown)) {
      event.preventDefault();
      const nextLayer = activeLayers.y === 0
        ? model.dimensions.height - 1
        : activeLayers.y - 1;
      editorState.setActiveLayer('y', nextLayer);
    }

    if (matchesShortcut(event, SHORTCUTS.layerYUp)) {
      event.preventDefault();
      const nextLayer = (activeLayers.y + 1) % model.dimensions.height;
      editorState.setActiveLayer('y', nextLayer);
    }
  };
}

export const hotkeyDispatcher = HotkeyDispatcher.getInstance();
