import { editorState } from './EditorState';
import { modelProjection } from '../projections/ModelProjection';

/**
 * KeyboardManager - Handles global keyboard shortcuts
 *
 * Singleton that manages all application-level keyboard shortcuts.
 * Follows architecture: business logic in singletons, not components.
 *
 * Shortcuts:
 * - 1-9: Select block from quick-select slot and apply to active material slot
 * - F: Toggle foreground/background material slot
 * - W/S: Increment/decrement Z layer (height - up/down)
 * - A/D: Decrement/increment X layer (width - left/right)
 * - X/C: Decrement/increment Y layer (depth - forward/back)
 */
class KeyboardManager {
  private static instance: KeyboardManager;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): KeyboardManager {
    if (!KeyboardManager.instance) {
      KeyboardManager.instance = new KeyboardManager();
    }
    return KeyboardManager.instance;
  }

  /**
   * Initialize keyboard event listeners
   * Call once at app startup
   */
  initialize(): void {
    if (this.isInitialized) {
      console.warn('KeyboardManager already initialized');
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
    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      editorState.toggleMaterialSlot();
    }

    // Layer navigation shortcuts
    const model = modelProjection.getCached();
    const activeLayers = editorState.getActiveLayers();

    // W/S keys: Z layer (height - up/down)
    if (event.key === 'w' || event.key === 'W') {
      event.preventDefault();
      const nextLayer = (activeLayers.z + 1) % model.dimensions.depth;
      editorState.setActiveLayer('z', nextLayer);
    }

    if (event.key === 's' || event.key === 'S') {
      event.preventDefault();
      const nextLayer = activeLayers.z === 0
        ? model.dimensions.depth - 1
        : activeLayers.z - 1;
      editorState.setActiveLayer('z', nextLayer);
    }

    // A/D keys: X layer (width - left/right)
    if (event.key === 'a' || event.key === 'A') {
      event.preventDefault();
      const nextLayer = activeLayers.x === 0
        ? model.dimensions.width - 1
        : activeLayers.x - 1;
      editorState.setActiveLayer('x', nextLayer);
    }

    if (event.key === 'd' || event.key === 'D') {
      event.preventDefault();
      const nextLayer = (activeLayers.x + 1) % model.dimensions.width;
      editorState.setActiveLayer('x', nextLayer);
    }

    // X/C keys: Y layer (depth - forward/back)
    if (event.key === 'x' || event.key === 'X') {
      event.preventDefault();
      const nextLayer = activeLayers.y === 0
        ? model.dimensions.height - 1
        : activeLayers.y - 1;
      editorState.setActiveLayer('y', nextLayer);
    }

    if (event.key === 'c' || event.key === 'C') {
      event.preventDefault();
      const nextLayer = (activeLayers.y + 1) % model.dimensions.height;
      editorState.setActiveLayer('y', nextLayer);
    }
  };
}

export const keyboardManager = KeyboardManager.getInstance();
