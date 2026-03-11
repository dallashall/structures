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
 * EditorState - Manages UI state for the editor
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
 * - layout:toggled - When layout mode is toggled
 * - view:switched - When active view is switched
 * - layer:adjusted - When any layer is adjusted (passes dimension and new layer)
 * - block:selected - When selected block changes
 * - materialslot:toggled - When active material slot is toggled (foreground/background)
 * - tool:selected - When active tool is selected
 * - paintmode:selected - When paint mode is selected
 * - paintbehavior:selected - When paint behavior is selected
 * - shapefillmode:selected - When shape fill mode is selected
 * - depthconfig:updated - When depth config is updated
 * - curvecontrol:updated - When curve control state is updated
 * - placementmode:toggled - When placement mode is toggled
 * - actionbar:toggled - When action bar expanded state is toggled
 * - materialbrowser:toggled - When material browser is toggled open/closed
 * - materialbrowser:search:updated - When material browser search query is updated
 * - materialbrowser:tab:switched - When material browser tab is switched
 * - drag:started - When a block drag operation starts
 * - drag:cleared - When a block drag operation is cleared
 * - quickselect:assigned - When quick-select slots are assigned
 * - preview:rendered - When preview blocks are rendered (for ghost rendering)
 * - project:switched - When current project is switched
 */
class EditorState extends EventEmitter {
  private static instance: EditorState;

  private layoutMode: LayoutMode = 'quad';
  private activeView: ViewType = 'front';
  private activeLayers: LayerState = { x: 0, y: 0, z: 0 };
  private foregroundBlockId: string | null = null;
  private backgroundBlockId: string | null = null;
  private activeMaterialSlot: 'foreground' | 'background' = 'foreground'; // Like Minecraft's hands or Photoshop's FG/BG
  private activeTool: ToolType = 'paint';
  private paintMode: PaintMode = 'point';
  private paintBehavior: PaintBehavior = 'normal';
  private shapeFillMode: ShapeFillMode = 'outline';
  private depthConfig: DepthConfig = {
    enabled: true,
    thickness: 1,
    mode: 'through',
  };
  private circleDrawMode: CircleDrawMode = 'center-radius';
  private curveControlState: CurveControlState | null = null;
  private isPlacementMode = false;
  private isActionBarExpanded = true;
  private quickSelectSlots: (string | null)[] = [null, null, null, null, null, null, null, null, null];
  private previewBlocks: PreviewBlock[] = [];
  private isMaterialBrowserOpen = false;
  private materialBrowserSearchQuery = '';
  private materialBrowserSelectedTab = 0;
  private activeDragBlockId: string | null = null;
  private currentProjectId: string | null = null;

  private constructor() {
    super();
  }

  static getInstance(): EditorState {
    if (!EditorState.instance) {
      EditorState.instance = new EditorState();
    }
    return EditorState.instance;
  }

  /**
   * Set the layout mode (tabbed or quad-layout)
   */
  setLayoutMode = (mode: LayoutMode): void => {
    if (this.layoutMode !== mode) {
      this.layoutMode = mode;
      this.emit('layout:toggled', mode);
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
      this.emit('view:switched', view);
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
      this.emit('layer:adjusted', dimension, layer);
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
   * Set the selected block ID for the currently active material slot
   */
  setSelectedBlock = (blockId: string | null): void => {
    if (this.activeMaterialSlot === 'foreground') {
      if (this.foregroundBlockId !== blockId) {
        this.foregroundBlockId = blockId;
        this.emit('block:selected', blockId);
      }
    } else {
      if (this.backgroundBlockId !== blockId) {
        this.backgroundBlockId = blockId;
        this.emit('block:selected', blockId);
      }
    }
  }

  /**
   * Get the selected block ID for the currently active material slot
   */
  getSelectedBlock(): string | null {
    return this.activeMaterialSlot === 'foreground'
      ? this.foregroundBlockId
      : this.backgroundBlockId;
  }

  /**
   * Get the foreground block ID
   */
  getForegroundBlock(): string | null {
    return this.foregroundBlockId;
  }

  /**
   * Get the background block ID
   */
  getBackgroundBlock(): string | null {
    return this.backgroundBlockId;
  }

  /**
   * Set the active material slot (foreground or background)
   * Similar to Minecraft's hand selection or Photoshop's FG/BG
   */
  setActiveMaterialSlot = (slot: 'foreground' | 'background'): void => {
    if (this.activeMaterialSlot !== slot) {
      this.activeMaterialSlot = slot;
      this.emit('materialslot:toggled', slot);
    }
  }

  /**
   * Get the active material slot
   */
  getActiveMaterialSlot(): 'foreground' | 'background' {
    return this.activeMaterialSlot;
  }

  /**
   * Toggle between foreground and background slots
   * Like pressing 'F' in Minecraft to swap hands
   */
  toggleMaterialSlot = (): void => {
    const newSlot = this.activeMaterialSlot === 'foreground' ? 'background' : 'foreground';
    this.setActiveMaterialSlot(newSlot);
  }

  /**
   * Set the active tool
   */
  setActiveTool = (tool: ToolType): void => {
    if (this.activeTool !== tool) {
      this.activeTool = tool;
      this.emit('tool:selected', tool);
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
      this.emit('paintmode:selected', mode);
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
      this.emit('paintbehavior:selected', behavior);
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
      this.emit('shapefillmode:selected', mode);
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
    this.emit('depthconfig:updated', this.depthConfig);
  }

  /**
   * Get the current depth configuration
   */
  getDepthConfig(): DepthConfig {
    return { ...this.depthConfig };
  }

  /**
   * Get the current delete mode state
   * Delete mode is now part of paint behavior
   */
  getDeleteMode(): boolean {
    return this.paintBehavior === 'delete';
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
    this.emit('curvecontrol:updated', state);
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
      this.emit('placementmode:toggled', isPlacementMode);
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
      this.emit('actionbar:toggled', isExpanded);
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
      this.emit('materialbrowser:toggled', isOpen);
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
    this.emit('materialbrowser:search:updated', query);
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
    this.emit('materialbrowser:tab:switched', tab);
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
      if (blockId === null) {
        this.emit('drag:cleared');
      } else {
        this.emit('drag:started', blockId);
      }
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
      this.emit('quickselect:assigned', [...this.quickSelectSlots]);
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
    this.emit('preview:rendered', blocks);
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
      this.emit('preview:rendered', []);
    }
  }

  /**
   * Set the current project ID
   * Used for scoping data to specific projects
   */
  setCurrentProjectId = (projectId: string | null): void => {
    if (this.currentProjectId !== projectId) {
      this.currentProjectId = projectId;
      this.emit('project:switched', projectId);
    }
  }

  /**
   * Get the current project ID
   */
  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }
}

// Export singleton instance
export const editorState = EditorState.getInstance();
