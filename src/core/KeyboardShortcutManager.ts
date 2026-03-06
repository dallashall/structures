import { EventEmitter } from './EventEmitter';
import { editorStateManager } from './EditorStateManager';
import { projectManager } from './ProjectManager';
import type { Dimensions } from '../types';

/**
 * KeyboardShortcutManager - Global keyboard shortcut handling
 *
 * Singleton that manages all application keyboard shortcuts.
 * Decouples keyboard input from React components.
 */
class KeyboardShortcutManager extends EventEmitter {
  private static instance: KeyboardShortcutManager;
  private isListening = false;
  private currentProject: { dimensions: Dimensions } | null = null;
  private isPlacementMode = false;

  private constructor() {
    super();
    this.initializeShortcuts();
  }

  static getInstance(): KeyboardShortcutManager {
    if (!KeyboardShortcutManager.instance) {
      KeyboardShortcutManager.instance = new KeyboardShortcutManager();
    }
    return KeyboardShortcutManager.instance;
  }

  private initializeShortcuts(): void {
    // Subscribe to project changes to get current dimensions
    projectManager.on('project:changed', (project) => {
      this.currentProject = project;
    });

    // Subscribe to placement mode changes
    editorStateManager.on('placement:changed', (isActive: boolean) => {
      this.isPlacementMode = isActive;
    });
  }

  startListening(): void {
    if (this.isListening) return;
    window.addEventListener('keydown', this.handleKeyDown);
    this.isListening = true;
  }

  stopListening(): void {
    if (!this.isListening) return;
    window.removeEventListener('keydown', this.handleKeyDown);
    this.isListening = false;
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    const { shiftKey } = event;

    // Confirm meta block placement with Enter
    if (this.isPlacementMode && key === 'enter') {
      event.preventDefault();
      this.emit('confirmMetaBlockPlacement');
      return;
    }

    // Material selection shortcuts (1-9)
    const numberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    if (numberKeys.includes(key)) {
      event.preventDefault();
      const slotIndex = parseInt(key, 10) - 1;

      // Always select the slot (even if empty)
      editorStateManager.setSelectedQuickSelectSlot(slotIndex);

      // If the slot has a material, also select that material
      const blockId = editorStateManager.getQuickSelectSlot(slotIndex);
      if (blockId) {
        editorStateManager.setSelectedBlock(blockId);
      }
      return;
    }

    // Toggle material browser (E key)
    if (key === 'e') {
      event.preventDefault();
      const isOpen = editorStateManager.getMaterialBrowserOpen();
      editorStateManager.setMaterialBrowserOpen(!isOpen);
      return;
    }

    // Close material browser (Escape key)
    if (key === 'escape') {
      const isOpen = editorStateManager.getMaterialBrowserOpen();
      if (isOpen) {
        event.preventDefault();
        editorStateManager.setMaterialBrowserOpen(false);
        return;
      }
    }

    // Layer navigation shortcuts
    if (!this.currentProject) return;

    if (key === 'x') {
      event.preventDefault();
      if (shiftKey) {
        editorStateManager.decrementLayer('x');
      } else {
        editorStateManager.incrementLayer('x', this.currentProject.dimensions.width);
      }
    } else if (key === 'y') {
      event.preventDefault();
      if (shiftKey) {
        editorStateManager.decrementLayer('y');
      } else {
        editorStateManager.incrementLayer('y', this.currentProject.dimensions.height);
      }
    } else if (key === 'z') {
      event.preventDefault();
      if (shiftKey) {
        editorStateManager.decrementLayer('z');
      } else {
        editorStateManager.incrementLayer('z', this.currentProject.dimensions.depth);
      }
    }
  };
}

export const keyboardShortcutManager = KeyboardShortcutManager.getInstance();
