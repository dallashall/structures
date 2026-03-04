import { EventEmitter } from './EventEmitter';
import type {
  LayoutMode,
  ViewType,
  LayerState,
  ToolType,
  PaintMode,
  PaintBehavior,
  Vector3D,
} from '../types';

/**
 * PreviewBlock - Represents a ghost/preview block to be rendered
 */
export interface PreviewBlock {
  position: Vector3D;
  blockType: string | null; // null = erase
}

/**
 * EditorStateManager - Manages UI state for the editor
 *
 * Singleton class that handles:
 * - Layout mode (tabbed vs quad-layout)
 * - Active view and perspective
 * - Layer state for all three dimensions (X, Y, Z)
 * - Tool selection
 * - Paint mode and behavior
 * - Quick-select palette slots
 *
 * Events:
 * - layout:changed - When layout mode changes
 * - view:changed - When active view changes
 * - layer:changed - When any layer changes (passes dimension and new layer)
 * - block:selected - When selected block changes
 * - tool:changed - When active tool changes
 * - paintmode:changed - When paint mode changes
 * - paintbehavior:changed - When paint behavior changes
 * - quickselect:changed - When quick-select slots change
 * - preview:changed - When preview blocks change (for ghost rendering)
 */
class EditorStateManager extends EventEmitter {
  private static instance: EditorStateManager;

  private layoutMode: LayoutMode = 'tabbed';
  private activeView: ViewType = 'front';
  private activeLayers: LayerState = { x: 0, y: 0, z: 0 };
  private selectedBlockId: string | null = null;
  private activeTool: ToolType = 'paint';
  private paintMode: PaintMode = 'point';
  private paintBehavior: PaintBehavior = 'normal';
  private quickSelectSlots: (string | null)[] = [null, null, null, null, null];
  private previewBlocks: PreviewBlock[] = [];

  private constructor() {
    super();
  }

  static getInstance(): EditorStateManager {
    if (!EditorStateManager.instance) {
      EditorStateManager.instance = new EditorStateManager();
    }
    return EditorStateManager.instance;
  }

  /**
   * Set the layout mode (tabbed or quad-layout)
   */
  setLayoutMode(mode: LayoutMode): void {
    if (this.layoutMode !== mode) {
      this.layoutMode = mode;
      this.emit('layout:changed', mode);
    }
  }

  /**
   * Get the current layout mode
   */
  getLayoutMode(): LayoutMode {
    return this.layoutMode;
  }

  /**
   * Set the active view
   */
  setActiveView(view: ViewType): void {
    if (this.activeView !== view) {
      this.activeView = view;
      this.emit('view:changed', view);
    }
  }

  /**
   * Get the current active view
   */
  getActiveView(): ViewType {
    return this.activeView;
  }

  /**
   * Set the active layer for a specific dimension
   */
  setActiveLayer(dimension: 'x' | 'y' | 'z', layer: number): void {
    if (this.activeLayers[dimension] !== layer) {
      this.activeLayers[dimension] = layer;
      this.emit('layer:changed', dimension, layer);
    }
  }

  /**
   * Get all active layers
   */
  getActiveLayers(): LayerState {
    return { ...this.activeLayers };
  }

  /**
   * Get active layer for a specific dimension
   */
  getActiveLayer(dimension: 'x' | 'y' | 'z'): number {
    return this.activeLayers[dimension];
  }

  /**
   * Set the selected block ID
   */
  setSelectedBlock(blockId: string | null): void {
    if (this.selectedBlockId !== blockId) {
      this.selectedBlockId = blockId;
      this.emit('block:selected', blockId);
    }
  }

  /**
   * Get the selected block ID
   */
  getSelectedBlock(): string | null {
    return this.selectedBlockId;
  }

  /**
   * Set the active tool
   */
  setActiveTool(tool: ToolType): void {
    if (this.activeTool !== tool) {
      this.activeTool = tool;
      this.emit('tool:changed', tool);
    }
  }

  /**
   * Get the active tool
   */
  getActiveTool(): ToolType {
    return this.activeTool;
  }

  /**
   * Set the paint mode
   */
  setPaintMode(mode: PaintMode): void {
    if (this.paintMode !== mode) {
      this.paintMode = mode;
      this.emit('paintmode:changed', mode);
    }
  }

  /**
   * Get the current paint mode
   */
  getPaintMode(): PaintMode {
    return this.paintMode;
  }

  /**
   * Set the paint behavior
   */
  setPaintBehavior(behavior: PaintBehavior): void {
    if (this.paintBehavior !== behavior) {
      this.paintBehavior = behavior;
      this.emit('paintbehavior:changed', behavior);
    }
  }

  /**
   * Get the current paint behavior
   */
  getPaintBehavior(): PaintBehavior {
    return this.paintBehavior;
  }

  /**
   * Set a block ID in a quick-select slot
   */
  setQuickSelectSlot(index: number, blockId: string | null): void {
    if (index < 0 || index >= 5) {
      console.warn(`Invalid quick-select slot index: ${index}`);
      return;
    }

    if (this.quickSelectSlots[index] !== blockId) {
      this.quickSelectSlots[index] = blockId;
      this.emit('quickselect:changed', [...this.quickSelectSlots]);
    }
  }

  /**
   * Get all quick-select slots
   */
  getQuickSelectSlots(): (string | null)[] {
    return [...this.quickSelectSlots];
  }

  /**
   * Get a specific quick-select slot
   */
  getQuickSelectSlot(index: number): string | null {
    if (index < 0 || index >= 5) {
      return null;
    }
    return this.quickSelectSlots[index];
  }

  /**
   * Increment layer in a dimension (with bounds checking)
   */
  incrementLayer(dimension: 'x' | 'y' | 'z', maxValue: number): void {
    const current = this.activeLayers[dimension];
    if (current < maxValue - 1) {
      this.setActiveLayer(dimension, current + 1);
    }
  }

  /**
   * Decrement layer in a dimension (with bounds checking)
   */
  decrementLayer(dimension: 'x' | 'y' | 'z'): void {
    const current = this.activeLayers[dimension];
    if (current > 0) {
      this.setActiveLayer(dimension, current - 1);
    }
  }

  /**
   * Set preview blocks for ghost rendering
   * Used when dragging in outline/fill modes to show what will be placed
   */
  setPreviewBlocks(blocks: PreviewBlock[]): void {
    this.previewBlocks = blocks;
    this.emit('preview:changed', blocks);
  }

  /**
   * Get current preview blocks
   */
  getPreviewBlocks(): PreviewBlock[] {
    return [...this.previewBlocks];
  }

  /**
   * Clear preview blocks
   */
  clearPreview(): void {
    if (this.previewBlocks.length > 0) {
      this.previewBlocks = [];
      this.emit('preview:changed', []);
    }
  }
}

// Export singleton instance
export const editorStateManager = EditorStateManager.getInstance();
