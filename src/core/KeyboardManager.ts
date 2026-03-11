import { editorState } from './EditorState';

/**
 * KeyboardManager - Handles global keyboard shortcuts
 *
 * Singleton that manages all application-level keyboard shortcuts.
 * Follows architecture: business logic in singletons, not components.
 *
 * Shortcuts:
 * - 1-9: Select block from quick-select slot and apply to active material slot
 * - F: Toggle foreground/background material slot
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

      // Get block from quick-select slot
      const blockId = editorState.getQuickSelectSlot(slotIndex);

      // Apply to currently active material slot (foreground or background)
      if (blockId) {
        editorState.setSelectedBlock(blockId);
      }
    }

    // F key: Toggle between foreground and background
    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      editorState.toggleMaterialSlot();
    }
  };
}

export const keyboardManager = KeyboardManager.getInstance();
