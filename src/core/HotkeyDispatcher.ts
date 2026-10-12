import { editorState } from './EditorState';
import { modelProjection } from '../projections/ModelProjection';
import { toolRegistry } from './tools/ToolRegistry';
import { SHORTCUTS, hasPrimaryModifier, matchesShortcut } from './Shortcuts';
import { editHistory } from './EditHistory';
import { isModalOpen, isTypingTarget } from '../utils/keyboardFocus';
import { blockRegistry } from './BlockRegistry';
import type { PaintMode } from '../types';

/**
 * HotkeyDispatcher - The window-level keydown handler for app shortcuts. Keys live in Shortcuts.ts,
 * and tool keys come from ToolRegistry. Canvas tools handle Shift, Alt, Space, and Escape themselves.
 *
 * Keys typed into a field never reach it. Any other key held with Ctrl or Cmd passes through to the browser.
 * While a modal dialog is open, only E (to close the material browser) acts.
 * Layer keys wrap from the last layer to the first and back.
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

  initialize(): void {
    if (this.isInitialized) {
      console.warn('HotkeyDispatcher already initialized');
      return;
    }

    window.addEventListener('keydown', this.handleKeyDown);
    this.isInitialized = true;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.isInitialized = false;
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (isTypingTarget(event.target)) return;

    // A modal dialog owns the keyboard. E still closes the material browser, as it opened it.
    if (isModalOpen()) {
      if (editorState.getMaterialBrowserOpen() && matchesShortcut(event, SHORTCUTS.materialBrowser)) {
        event.preventDefault();
        editorState.toggleMaterialBrowser();
      }
      return;
    }

    if (hasPrimaryModifier(event)) {
      if (matchesShortcut(event, SHORTCUTS.undo)) {
        event.preventDefault();
        void (event.shiftKey ? editHistory.redo() : editHistory.undo());
      }
      return;
    }

    if (matchesShortcut(event, SHORTCUTS.materialBrowser)) {
      event.preventDefault();
      editorState.toggleMaterialBrowser();
      return;
    }

    const toolName = toolRegistry.getByHotkey(event.key.toLowerCase());
    if (toolName) {
      event.preventDefault();
      editorState.setPaintMode(toolName as PaintMode);
      return;
    }

    if (event.key >= '1' && event.key <= '9') {
      event.preventDefault();
      const slotIndex = parseInt(event.key, 10) - 1;

      // Points the active material slot at this quick-select slot. The slot's contents stay as they are.
      const activeMaterialSlot = editorState.getActiveMaterialSlot();
      if (activeMaterialSlot === 'foreground') {
        editorState.setForegroundSlotIndex(slotIndex);
      } else {
        editorState.setBackgroundSlotIndex(slotIndex);
      }
    }

    if (matchesShortcut(event, SHORTCUTS.swapMaterialSlot)) {
      event.preventDefault();
      editorState.toggleMaterialSlot();
    }

    if (matchesShortcut(event, SHORTCUTS.rotateFacing)) {
      const selectedBlockId = editorState.getSelectedBlock();
      const selectedBlock = selectedBlockId ? blockRegistry.getBlock(selectedBlockId) : null;
      if (selectedBlock?.hasBlockState) {
        event.preventDefault();
        editorState.rotateFacing();
      }
    }

    if (matchesShortcut(event, SHORTCUTS.flipHalf)) {
      const selectedBlockId = editorState.getSelectedBlock();
      const selectedBlock = selectedBlockId ? blockRegistry.getBlock(selectedBlockId) : null;
      if (selectedBlock?.hasBlockState) {
        event.preventDefault();
        editorState.flipHalf();
      }
    }

    const model = modelProjection.getCached();
    const activeLayers = editorState.getActiveLayers();

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
