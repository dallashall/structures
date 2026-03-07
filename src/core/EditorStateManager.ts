import { EventEmitter } from './EventEmitter';
import type {
  LayoutMode,
  ViewType,
  LayerState,
  ToolType,
  PaintMode,
  PaintBehavior,
  Vector3D,
  ShapeFillMode,
  DepthConfig,
  CircleDrawMode,
  CurveControlState,
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
 * - shapefillmode:changed - When shape fill mode changes
 * - depthconfig:changed - When depth config changes
 * - curvecontrol:changed - When curve control state changes
 * - placementmode:changed - When placement mode changes
 * - actionbar:changed - When action bar expanded state changes
 * - quickselect:changed - When quick-select slots change
 * - preview:changed - When preview blocks change (for ghost rendering)
 */
class EditorStateManager extends EventEmitter {
  private static instance: EditorStateManager;

  private layoutMode: LayoutMode = 'quad';
  private activeView: ViewType = 'front';
  private activeLayers: LayerState = { x: 0, y: 0, z: 0 };
  private selectedBlockId: string | null = null;
  private activeTool: ToolType = 'paint';
  private paintMode: PaintMode = 'point';
  private paintBehavior: PaintBehavior = 'normal';
  private shapeFillMode: ShapeFillMode = 'outline';
  private depthConfig: DepthConfig = {
    enabled: false,
    thickness: 1,
    mode: 'through',
  };
  private deleteMode = false; // Toggle for delete mode (erases blocks instead of placing)
  private circleDrawMode: CircleDrawMode = 'center-radius';
  private curveControlState: CurveControlState | null = null;
  private isPlacementMode = false;
  private isActionBarExpanded = true;
  private quickSelectSlots: (string | null)[] = [null, null, null, null, null, null, null, null, null];
  private selectedQuickSelectSlotIndex: number = -1; // -1 means no slot selected
  private previewBlocks: PreviewBlock[] = [];
  private isMaterialBrowserOpen = false;
  private materialBrowserSearchQuery = '';
  private materialBrowserSelectedTab = 0;
  private activeDragBlockId: string | null = null;

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
  setLayoutMode = (mode: LayoutMode): void => {
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
  setActiveView = (view: ViewType): void => {
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
  setActiveLayer = (dimension: 'x' | 'y' | 'z', layer: number): void => {
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
  setSelectedBlock = (blockId: string | null): void => {
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
  setActiveTool = (tool: ToolType): void => {
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
  setPaintMode = (mode: PaintMode): void => {
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
  setPaintBehavior = (behavior: PaintBehavior): void => {
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
   * Set the shape fill mode
   */
  setShapeFillMode = (mode: ShapeFillMode): void => {
    if (this.shapeFillMode !== mode) {
      this.shapeFillMode = mode;
      this.emit('shapefillmode:changed', mode);
    }
  }

  /**
   * Get the current shape fill mode
   */
  getShapeFillMode(): ShapeFillMode {
    return this.shapeFillMode;
  }

  /**
   * Set the depth configuration
   */
  setDepthConfig = (config: Partial<DepthConfig>): void => {
    this.depthConfig = { ...this.depthConfig, ...config };
    this.emit('depthconfig:changed', this.depthConfig);
  }

  /**
   * Get the current depth configuration
   */
  getDepthConfig(): DepthConfig {
    return { ...this.depthConfig };
  }

  /**
   * Toggle delete mode (erases blocks instead of placing)
   */
  setDeleteMode = (enabled: boolean): void => {
    this.deleteMode = enabled;
    this.emit('deletemode:changed', enabled);
  }

  /**
   * Get the current delete mode state
   */
  getDeleteMode(): boolean {
    return this.deleteMode;
  }

  /**
   * Set the circle draw mode
   */
  setCircleDrawMode = (mode: CircleDrawMode): void => {
    this.circleDrawMode = mode;
    // No event needed - used during interaction only
  }

  /**
   * Get the current circle draw mode
   */
  getCircleDrawMode(): CircleDrawMode {
    return this.circleDrawMode;
  }

  /**
   * Set the curve control state
   */
  setCurveControlState = (state: CurveControlState | null): void => {
    this.curveControlState = state;
    this.emit('curvecontrol:changed', state);
  }

  /**
   * Get the current curve control state
   */
  getCurveControlState(): CurveControlState | null {
    return this.curveControlState;
  }

  /**
   * Set placement mode (for meta block placement)
   */
  setPlacementMode = (isPlacementMode: boolean): void => {
    if (this.isPlacementMode !== isPlacementMode) {
      this.isPlacementMode = isPlacementMode;
      this.emit('placementmode:changed', isPlacementMode);
    }
  }

  /**
   * Get the current placement mode
   */
  getPlacementMode(): boolean {
    return this.isPlacementMode;
  }

  /**
   * Set action bar expanded state
   */
  setActionBarExpanded = (isExpanded: boolean): void => {
    if (this.isActionBarExpanded !== isExpanded) {
      this.isActionBarExpanded = isExpanded;
      this.emit('actionbar:changed', isExpanded);
    }
  }

  /**
   * Get the action bar expanded state
   */
  getActionBarExpanded(): boolean {
    return this.isActionBarExpanded;
  }

  /**
   * Set material browser open state
   */
  setMaterialBrowserOpen = (isOpen: boolean): void => {
    if (this.isMaterialBrowserOpen !== isOpen) {
      this.isMaterialBrowserOpen = isOpen;
      // Reset search and tab when opening
      if (isOpen) {
        this.materialBrowserSearchQuery = '';
        this.materialBrowserSelectedTab = 0;
      }
      this.emit('materialbrowser:changed', isOpen);
    }
  }

  /**
   * Get material browser open state
   */
  getMaterialBrowserOpen(): boolean {
    return this.isMaterialBrowserOpen;
  }

  /**
   * Set material browser search query
   */
  setMaterialBrowserSearchQuery = (query: string): void => {
    this.materialBrowserSearchQuery = query;
    this.emit('materialbrowser:search:changed', query);
  }

  /**
   * Get material browser search query
   */
  getMaterialBrowserSearchQuery(): string {
    return this.materialBrowserSearchQuery;
  }

  /**
   * Set material browser selected tab
   */
  setMaterialBrowserSelectedTab = (tab: number): void => {
    this.materialBrowserSelectedTab = tab;
    this.emit('materialbrowser:tab:changed', tab);
  }

  /**
   * Get material browser selected tab
   */
  getMaterialBrowserSelectedTab(): number {
    return this.materialBrowserSelectedTab;
  }

  /**
   * Set the active drag block (for drag-and-drop overlay)
   */
  setActiveDragBlock = (blockId: string | null): void => {
    if (this.activeDragBlockId !== blockId) {
      this.activeDragBlockId = blockId;
      this.emit('drag:changed', blockId);
    }
  }

  /**
   * Get the active drag block
   */
  getActiveDragBlock(): string | null {
    return this.activeDragBlockId;
  }

  /**
   * Set a block ID in a quick-select slot
   */
  setQuickSelectSlot = (index: number, blockId: string | null): void => {
    if (index < 0 || index >= 9) {
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
    if (index < 0 || index >= 9) {
      return null;
    }
    return this.quickSelectSlots[index];
  }

  /**
   * Set the selected quick-select slot index
   */
  setSelectedQuickSelectSlot = (index: number): void => {
    if (index !== this.selectedQuickSelectSlotIndex) {
      this.selectedQuickSelectSlotIndex = index;
      this.emit('quickselect:slot:changed', index);
    }
  }

  /**
   * Get the selected quick-select slot index
   */
  getSelectedQuickSelectSlot(): number {
    return this.selectedQuickSelectSlotIndex;
  }

  /**
   * Increment layer in a dimension (with bounds checking)
   */
  incrementLayer = (dimension: 'x' | 'y' | 'z', maxValue: number): void => {
    const current = this.activeLayers[dimension];
    if (current < maxValue - 1) {
      this.setActiveLayer(dimension, current + 1);
    }
  }

  /**
   * Decrement layer in a dimension (with bounds checking)
   */
  decrementLayer = (dimension: 'x' | 'y' | 'z'): void => {
    const current = this.activeLayers[dimension];
    if (current > 0) {
      this.setActiveLayer(dimension, current - 1);
    }
  }

  /**
   * Set preview blocks for ghost rendering
   * Used when dragging in outline/fill modes to show what will be placed
   */
  setPreviewBlocks = (blocks: PreviewBlock[]): void => {
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
  clearPreview = (): void => {
    if (this.previewBlocks.length > 0) {
      this.previewBlocks = [];
      this.emit('preview:changed', []);
    }
  }
}

// Export singleton instance
export const editorStateManager = EditorStateManager.getInstance();
