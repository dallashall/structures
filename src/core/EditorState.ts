import { EventEmitter } from './EventEmitter';
import { quickSelectStore } from './QuickSelectStore';
import { renderSettingsStore } from './RenderSettingsStore';
import { blockRegistry } from './BlockRegistry';
import { DEFAULT_RENDER_SETTINGS } from '../types';
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
  HeldModifiers,
  RenderSettings,
  BlockStateProperties,
  HorizontalDirection,
} from '../types';
import { rotateRight } from './DirectionMath';

export interface PreviewBlock {
  position: Vector3D;
  blockType: string | null; // null = erase
  blockState?: BlockStateProperties;
}

/**
 * EditorState - Editor UI state that is not part of the model, so it never enters the EventLog.
 * Quick-select slots and render settings persist per project in their own IndexedDB stores.
 *
 * Events:
 * - layout:toggled - When layout mode is toggled
 * - view:switched - When active view is switched
 * - layer:adjusted - When any layer is adjusted (passes dimension and new layer)
 * - block:selected - When selected block changes
 * - blockstate:applied - When the active block state changes (passes BlockStateProperties)
 * - materialslot:toggled - When active material slot is toggled (foreground/background)
 * - tool:selected - When active tool is selected
 * - paintmode:selected - When paint mode is selected
 * - paintbehavior:selected - When paint behavior is selected
 * - shapefillmode:selected - When shape fill mode is selected
 * - depthconfig:applied - When depth config is updated
 * - modifiers:held - When Shift or Alt goes down or up over a canvas tool (passes HeldModifiers)
 * - materialbrowser:toggled - When material browser is toggled open/closed
 * - materialbrowser:search:entered - When material browser search query is updated
 * - materialbrowser:tab:switched - When material browser tab is switched
 * - drag:started - When a block drag operation starts
 * - drag:cleared - When a block drag operation is cleared
 * - quickselect:assigned - When quick-select slots are assigned
 * - quickselect:foreground:selected - When the foreground slot index changes
 * - quickselect:background:selected - When the background slot index changes
 * - preview:rendered - When preview blocks are rendered (for ghost rendering)
 * - project:switched - When current project is switched
 * - sliceguide:axis:toggled - When a slice guide axis visibility is toggled (passes axis and visible)
 * - rendersettings:applied - When render settings are changed (passes RenderSettings)
 * - rendersettingsmodal:toggled - When render settings modal is toggled open/closed
 */
class EditorState extends EventEmitter {
  private static instance: EditorState;

  private layoutMode: LayoutMode = 'quad';
  private activeView: ViewType = 'front';
  private activeLayers: LayerState = { x: 0, y: 0, z: 0 };
  private activeMaterialSlot: 'foreground' | 'background' = 'foreground';
  private activeTool: ToolType = 'paint';
  private paintMode: PaintMode = 'point';
  private paintBehavior: PaintBehavior = 'normal';
  private shapeFillMode: ShapeFillMode = 'outline';
  private depthConfig: DepthConfig = {
    enabled: true,
    thickness: 1,
    mode: 'through',
  };
  private heldModifiers: HeldModifiers = { shift: false, alt: false };
  private quickSelectSlots: (string | null)[] = [null, null, null, null, null, null, null, null, null];
  private foregroundSlotIndex = 0;
  private backgroundSlotIndex = 1;
  private previewBlocks: PreviewBlock[] = [];
  private isMaterialBrowserOpen = false;
  private materialBrowserSearchQuery = '';
  private materialBrowserSelectedTab = 0;
  private activeDragBlockId: string | null = null;
  private currentProjectId: string | null = null;
  private sliceGuideVisibility: { x: boolean; y: boolean; z: boolean } = { x: false, y: false, z: false };
  private renderSettings: RenderSettings = { ...DEFAULT_RENDER_SETTINGS };
  private isRenderSettingsModalOpen = false;
  private activeBlockState: BlockStateProperties = {};

  private constructor() {
    super();
    this.on('block:selected', this.handleBlockSelected);
  }

  // A newly selected block starts from its own default state
  private handleBlockSelected = (blockId: string | null): void => {
    if (!blockId) {
      this.activeBlockState = {};
      return;
    }
    const block = blockRegistry.getBlock(blockId);
    if (block?.hasBlockState && block.defaultState) {
      this.activeBlockState = { ...block.defaultState };
    } else {
      this.activeBlockState = {};
    }
    this.emit('blockstate:applied', { ...this.activeBlockState });
  }

  static getInstance(): EditorState {
    if (!EditorState.instance) {
      EditorState.instance = new EditorState();
    }
    return EditorState.instance;
  }

  setLayoutMode = (mode: LayoutMode): void => {
    if (this.layoutMode !== mode) {
      this.layoutMode = mode;
      this.emit('layout:toggled', mode);
    }
  }

  getLayoutMode(): LayoutMode {
    return this.layoutMode;
  }

  setActiveView = (view: ViewType): void => {
    if (this.activeView !== view) {
      this.activeView = view;
      this.emit('view:switched', view);
    }
  }

  getActiveView(): ViewType {
    return this.activeView;
  }

  setActiveLayer = (dimension: 'x' | 'y' | 'z', layer: number): void => {
    if (this.activeLayers[dimension] !== layer) {
      this.activeLayers[dimension] = layer;
      this.emit('layer:adjusted', dimension, layer);
    }
  }

  getActiveLayers(): LayerState {
    return { ...this.activeLayers };
  }

  getActiveLayer(dimension: 'x' | 'y' | 'z'): number {
    return this.activeLayers[dimension];
  }

  /**
   * Puts the block in the quick-select slot the active material slot points at.
   * The selected block is always derived from the slots, never stored on its own.
   */
  setSelectedBlock = (blockId: string | null): void => {
    const previousBlock = this.getSelectedBlock();
    if (previousBlock !== blockId) {
      const slotIndex = this.activeMaterialSlot === 'foreground'
        ? this.foregroundSlotIndex
        : this.backgroundSlotIndex;

      // Filling the active slot announces the selection itself
      if (blockId) this.setQuickSelectSlot(slotIndex, blockId);
      else this.emit('block:selected', null);
    }
  }

  /**
   * Emits block:selected when a slot change moved the selected block, so the block state resets to the new
   * block's defaults and its state controls show
   */
  private announceSelectionMove(previousBlock: string | null): void {
    const selectedBlock = this.getSelectedBlock();
    if (selectedBlock !== previousBlock) this.emit('block:selected', selectedBlock);
  }

  getSelectedBlock(): string | null {
    return this.activeMaterialSlot === 'foreground'
      ? this.getForegroundBlock()
      : this.getBackgroundBlock();
  }

  getForegroundBlock(): string | null {
    return this.quickSelectSlots[this.foregroundSlotIndex] || null;
  }

  getBackgroundBlock(): string | null {
    return this.quickSelectSlots[this.backgroundSlotIndex] || null;
  }

  setActiveMaterialSlot = (slot: 'foreground' | 'background'): void => {
    if (this.activeMaterialSlot !== slot) {
      const previousBlock = this.getSelectedBlock();
      this.activeMaterialSlot = slot;
      this.emit('materialslot:toggled', slot);
      this.announceSelectionMove(previousBlock);

      const projectId = this.currentProjectId;
      if (projectId) {
        void quickSelectStore.setMode(projectId, slot);
      }
    }
  }

  getActiveMaterialSlot(): 'foreground' | 'background' {
    return this.activeMaterialSlot;
  }

  toggleMaterialSlot = (): void => {
    const newSlot = this.activeMaterialSlot === 'foreground' ? 'background' : 'foreground';
    this.setActiveMaterialSlot(newSlot);
  }

  setActiveTool = (tool: ToolType): void => {
    if (this.activeTool !== tool) {
      this.activeTool = tool;
      this.emit('tool:selected', tool);
    }
  }

  getActiveTool(): ToolType {
    return this.activeTool;
  }

  setPaintMode = (mode: PaintMode): void => {
    if (this.paintMode !== mode) {
      this.paintMode = mode;
      this.emit('paintmode:selected', mode);
    }
  }

  getPaintMode(): PaintMode {
    return this.paintMode;
  }

  setPaintBehavior = (behavior: PaintBehavior): void => {
    if (this.paintBehavior !== behavior) {
      this.paintBehavior = behavior;
      this.emit('paintbehavior:selected', behavior);
    }
  }

  getPaintBehavior(): PaintBehavior {
    return this.paintBehavior;
  }

  setShapeFillMode = (mode: ShapeFillMode): void => {
    if (this.shapeFillMode !== mode) {
      this.shapeFillMode = mode;
      this.emit('shapefillmode:selected', mode);
    }
  }

  getShapeFillMode(): ShapeFillMode {
    return this.shapeFillMode;
  }

  setDepthConfig = (config: Partial<DepthConfig>): void => {
    this.depthConfig = { ...this.depthConfig, ...config };
    this.emit('depthconfig:applied', this.depthConfig);
  }

  getDepthConfig(): DepthConfig {
    return { ...this.depthConfig };
  }

  getDeleteMode(): boolean {
    return this.paintBehavior === 'delete';
  }

  /**
   * Record which drawing modifier keys are down. The canvas tools write this on every key and pointer event.
   */
  setHeldModifiers = (modifiers: HeldModifiers): void => {
    if (this.heldModifiers.shift === modifiers.shift && this.heldModifiers.alt === modifiers.alt) return;
    this.heldModifiers = { ...modifiers };
    this.emit('modifiers:held', this.heldModifiers);
  }

  getHeldModifiers(): HeldModifiers {
    return this.heldModifiers;
  }

  setMaterialBrowserOpen = (isOpen: boolean): void => {
    if (this.isMaterialBrowserOpen !== isOpen) {
      this.isMaterialBrowserOpen = isOpen;
      if (isOpen) {
        this.materialBrowserSearchQuery = '';
        this.materialBrowserSelectedTab = 0;
      }
      this.emit('materialbrowser:toggled', isOpen);
    }
  }

  getMaterialBrowserOpen(): boolean {
    return this.isMaterialBrowserOpen;
  }

  setMaterialBrowserSearchQuery = (query: string): void => {
    this.materialBrowserSearchQuery = query;
    this.emit('materialbrowser:search:entered', query);
  }

  getMaterialBrowserSearchQuery(): string {
    return this.materialBrowserSearchQuery;
  }

  setMaterialBrowserSelectedTab = (tab: number): void => {
    this.materialBrowserSelectedTab = tab;
    this.emit('materialbrowser:tab:switched', tab);
  }

  getMaterialBrowserSelectedTab(): number {
    return this.materialBrowserSelectedTab;
  }

  toggleMaterialBrowser = (): void => {
    this.setMaterialBrowserOpen(!this.isMaterialBrowserOpen);
  }

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

  getActiveDragBlock(): string | null {
    return this.activeDragBlockId;
  }

  setQuickSelectSlot = (index: number, blockId: string | null): void => {
    if (index < 0 || index >= 9) {
      console.warn(`Invalid quick-select slot index: ${index}`);
      return;
    }

    if (this.quickSelectSlots[index] !== blockId) {
      const previousBlock = this.getSelectedBlock();
      this.quickSelectSlots[index] = blockId;
      this.emit('quickselect:assigned', [...this.quickSelectSlots]);
      this.announceSelectionMove(previousBlock);

      const projectId = this.currentProjectId;
      if (projectId && blockId) {
        void quickSelectStore.setSlot(projectId, index, blockId);
      }
    }
  }

  getQuickSelectSlots(): (string | null)[] {
    return [...this.quickSelectSlots];
  }

  getQuickSelectSlot(index: number): string | null {
    if (index < 0 || index >= 9) {
      return null;
    }
    return this.quickSelectSlots[index];
  }

  setForegroundSlotIndex = (index: number): void => {
    if (index < 0 || index >= 9) {
      console.warn(`Invalid foreground slot index: ${index}`);
      return;
    }

    if (this.foregroundSlotIndex !== index) {
      this.foregroundSlotIndex = index;
      this.emit('quickselect:foreground:selected', index);

      // The selected block follows the active slot's index
      if (this.activeMaterialSlot === 'foreground') {
        this.emit('block:selected', this.getSelectedBlock());
      }

      const projectId = this.currentProjectId;
      if (projectId) {
        void quickSelectStore.setForeground(projectId, index);
      }
    }
  }

  setBackgroundSlotIndex = (index: number): void => {
    if (index < 0 || index >= 9) {
      console.warn(`Invalid background slot index: ${index}`);
      return;
    }

    if (this.backgroundSlotIndex !== index) {
      this.backgroundSlotIndex = index;
      this.emit('quickselect:background:selected', index);

      if (this.activeMaterialSlot === 'background') {
        this.emit('block:selected', this.getSelectedBlock());
      }

      const projectId = this.currentProjectId;
      if (projectId) {
        void quickSelectStore.setBackground(projectId, index);
      }
    }
  }

  assignToActiveSlot = (blockId: string): void => {
    const index = this.activeMaterialSlot === 'foreground' ? this.foregroundSlotIndex : this.backgroundSlotIndex;
    this.setQuickSelectSlot(index, blockId);
  }

  getForegroundSlotIndex(): number {
    return this.foregroundSlotIndex;
  }

  getBackgroundSlotIndex(): number {
    return this.backgroundSlotIndex;
  }

  incrementLayer = (dimension: 'x' | 'y' | 'z', maxValue: number): void => {
    const current = this.activeLayers[dimension];
    if (current < maxValue - 1) {
      this.setActiveLayer(dimension, current + 1);
    }
  }

  decrementLayer = (dimension: 'x' | 'y' | 'z'): void => {
    const current = this.activeLayers[dimension];
    if (current > 0) {
      this.setActiveLayer(dimension, current - 1);
    }
  }

  setPreviewBlocks = (blocks: PreviewBlock[]): void => {
    this.previewBlocks = blocks;
    this.emit('preview:rendered', blocks);
  }

  getPreviewBlocks(): PreviewBlock[] {
    return [...this.previewBlocks];
  }

  clearPreview = (): void => {
    if (this.previewBlocks.length > 0) {
      this.previewBlocks = [];
      this.emit('preview:rendered', []);
    }
  }

  setCurrentProjectId = (projectId: string | null): void => {
    if (this.currentProjectId !== projectId) {
      this.currentProjectId = projectId;
      this.emit('project:switched', projectId);

      if (projectId) {
        void this.loadQuickSelectState(projectId);
        void this.loadRenderSettings(projectId);
      }
    }
  }

  private async loadQuickSelectState(projectId: string): Promise<void> {
    try {
      const state = await quickSelectStore.getState(projectId);
      this.quickSelectSlots = state.blocks;
      this.foregroundSlotIndex = state.foregroundIndex;
      this.backgroundSlotIndex = state.backgroundIndex;
      this.activeMaterialSlot = state.activeMode;

      this.emit('quickselect:assigned', [...this.quickSelectSlots]);
      this.emit('quickselect:foreground:selected', state.foregroundIndex);
      this.emit('quickselect:background:selected', state.backgroundIndex);
      this.emit('materialslot:toggled', state.activeMode);
      this.emit('block:selected', this.getSelectedBlock());
    } catch (error) {
      console.error('Failed to load quick-select state:', error);
    }
  }

  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }

  toggleSliceGuide(axis: 'x' | 'y' | 'z'): void {
    this.setSliceGuideVisible(axis, !this.sliceGuideVisibility[axis]);
  }

  setSliceGuideVisible(axis: 'x' | 'y' | 'z', visible: boolean): void {
    if (this.sliceGuideVisibility[axis] === visible) return;
    this.sliceGuideVisibility[axis] = visible;
    this.emit('sliceguide:axis:toggled', axis, visible);
  }

  getSliceGuideVisibility(): { x: boolean; y: boolean; z: boolean } {
    return { ...this.sliceGuideVisibility };
  }

  isSliceGuideVisible(axis: 'x' | 'y' | 'z'): boolean {
    return this.sliceGuideVisibility[axis];
  }

  setActiveBlockState = (state: BlockStateProperties): void => {
    this.activeBlockState = { ...state };
    this.emit('blockstate:applied', { ...this.activeBlockState });
  }

  getActiveBlockState(): BlockStateProperties {
    return { ...this.activeBlockState };
  }

  /**
   * Rotate facing clockwise (character's right): x+ → y+ → x- → y- → x+
   */
  rotateFacing = (): void => {
    const current = this.activeBlockState.facing;
    const next = current ? rotateRight(current as HorizontalDirection) : 'x+';
    this.activeBlockState = { ...this.activeBlockState, facing: next };
    this.emit('blockstate:applied', { ...this.activeBlockState });
  }

  // Slabs carry their half in 'type', stairs in 'half'. Door halves come from the paint pipeline.
  flipHalf = (): void => {
    if (this.activeBlockState.type !== undefined) {
      // A double slab flips to bottom
      const next = this.activeBlockState.type === 'bottom' ? 'top' : 'bottom';
      this.activeBlockState = { ...this.activeBlockState, type: next };
    } else if (this.activeBlockState.half === 'bottom' || this.activeBlockState.half === 'top') {
      const next = this.activeBlockState.half === 'bottom' ? 'top' : 'bottom';
      this.activeBlockState = { ...this.activeBlockState, half: next };
    }
    this.emit('blockstate:applied', { ...this.activeBlockState });
  }

  // Doors only. The hinge side the neighbors pick is swapped on blocks placed while this is set.
  flipHinge = (): void => {
    if (this.activeBlockState.hingeFlipped === undefined) return;
    this.activeBlockState = { ...this.activeBlockState, hingeFlipped: !this.activeBlockState.hingeFlipped };
    this.emit('blockstate:applied', { ...this.activeBlockState });
  }

  resetBlockState = (): void => {
    this.activeBlockState = {};
    this.emit('blockstate:applied', {});
  }

  getRenderSettings(): RenderSettings {
    return { ...this.renderSettings };
  }

  setRenderSettings = (settings: RenderSettings): void => {
    this.renderSettings = { ...settings };
    this.emit('rendersettings:applied', this.renderSettings);

    const projectId = this.currentProjectId;
    if (projectId) {
      void renderSettingsStore.saveSettings(projectId, this.renderSettings);
    }
  }

  resetRenderSettings = (): void => {
    this.setRenderSettings({ ...DEFAULT_RENDER_SETTINGS });
  }

  getRenderSettingsModalOpen(): boolean {
    return this.isRenderSettingsModalOpen;
  }

  setRenderSettingsModalOpen = (isOpen: boolean): void => {
    if (this.isRenderSettingsModalOpen !== isOpen) {
      this.isRenderSettingsModalOpen = isOpen;
      this.emit('rendersettingsmodal:toggled', isOpen);
    }
  }

  private async loadRenderSettings(projectId: string): Promise<void> {
    try {
      const settings = await renderSettingsStore.getSettings(projectId);
      this.renderSettings = settings;
      this.emit('rendersettings:applied', this.renderSettings);
    } catch (error) {
      console.error('Failed to load render settings:', error);
    }
  }
}

export const editorState = EditorState.getInstance();
