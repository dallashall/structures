import React from 'react';
import { editorState } from "../core/EditorState";
import type {
  LayoutMode,
  ViewType,
  LayerState,
  ToolType,
  PaintMode,
  PaintBehavior,
  ShapeFillMode,
  DepthConfig,
  BlockStateProperties,
} from "../types";
import { blockRegistry } from "../core/BlockRegistry";

/**
 * Props injected by withEditorState HOC
 */
export interface WithEditorStateProps {
  layoutMode: LayoutMode;
  activeView: ViewType;
  activeLayers: LayerState;
  selectedBlock: string | null;
  foregroundBlock: string | null;
  backgroundBlock: string | null;
  activeMaterialSlot: 'foreground' | 'background';
  activeTool: ToolType;
  paintMode: PaintMode;
  paintBehavior: PaintBehavior;
  shapeFillMode: ShapeFillMode;
  depthConfig: DepthConfig;
  isPlacementMode: boolean;
  isActionBarExpanded: boolean;
  quickSelectSlots: (string | null)[];
  sliceGuideVisibility: { x: boolean; y: boolean; z: boolean };
  activeBlockState: BlockStateProperties;
  hasBlockState: boolean;
}

/**
 * Higher-Order Component that subscribes to EditorStateManager events
 * and provides editor UI state to wrapped component.
 *
 * Subscribes to:
 * - layout:toggled
 * - view:switched
 * - layer:adjusted
 * - block:selected
 * - tool:selected
 * - paintmode:selected
 * - paintbehavior:selected
 * - quickselect:assigned
 *
 * Injects props:
 * - layoutMode: LayoutMode
 * - activeView: ViewType
 * - activeLayers: LayerState
 * - selectedBlock: string | null
 * - activeTool: ToolType
 * - paintMode: PaintMode
 * - paintBehavior: PaintBehavior
 * - quickSelectSlots: (string | null)[]
 *
 * @example
 * const EnhancedComponent = withEditorState(MyComponent);
 */
export function withEditorState<P extends object>(
  Component: React.ComponentType<P & WithEditorStateProps>,
) {
  return function WithEditorState(props: P) {
    const [layoutMode, setLayoutMode] = React.useState<LayoutMode>(
      editorState.getLayoutMode(),
    );
    const [activeView, setActiveView] = React.useState<ViewType>(
      editorState.getActiveView(),
    );
    const [activeLayers, setActiveLayers] = React.useState<LayerState>(
      editorState.getActiveLayers(),
    );
    const [selectedBlock, setSelectedBlock] = React.useState<string | null>(
      editorState.getSelectedBlock(),
    );
    const [foregroundBlock, setForegroundBlock] = React.useState<string | null>(
      editorState.getForegroundBlock(),
    );
    const [backgroundBlock, setBackgroundBlock] = React.useState<string | null>(
      editorState.getBackgroundBlock(),
    );
    const [activeMaterialSlot, setActiveMaterialSlot] = React.useState<'foreground' | 'background'>(
      editorState.getActiveMaterialSlot(),
    );
    const [activeTool, setActiveTool] = React.useState<ToolType>(
      editorState.getActiveTool(),
    );
    const [paintMode, setPaintMode] = React.useState<PaintMode>(
      editorState.getPaintMode(),
    );
    const [paintBehavior, setPaintBehavior] = React.useState<PaintBehavior>(
      editorState.getPaintBehavior(),
    );
    const [shapeFillMode, setShapeFillMode] = React.useState<ShapeFillMode>(
      editorState.getShapeFillMode(),
    );
    const [depthConfig, setDepthConfig] = React.useState<DepthConfig>(
      editorState.getDepthConfig(),
    );
    const [isPlacementMode, setIsPlacementMode] = React.useState<boolean>(
      editorState.getPlacementMode(),
    );
    const [isActionBarExpanded, setIsActionBarExpanded] =
      React.useState<boolean>(editorState.getActionBarExpanded());
    const [quickSelectSlots, setQuickSelectSlots] = React.useState<
      (string | null)[]
    >(editorState.getQuickSelectSlots());
    const [sliceGuideVisibility, setSliceGuideVisibility] = React.useState(
      editorState.getSliceGuideVisibility()
    );
    const [activeBlockState, setActiveBlockState] = React.useState<BlockStateProperties>(
      editorState.getActiveBlockState()
    );

    const deriveHasBlockState = (blockId: string | null): boolean => {
      if (!blockId) return false;
      const block = blockRegistry.getBlock(blockId);
      return block?.hasBlockState ?? false;
    };

    const [hasBlockState, setHasBlockState] = React.useState<boolean>(
      deriveHasBlockState(editorState.getSelectedBlock())
    );

    React.useEffect(() => {
      const handleLayoutChanged = (mode: LayoutMode) => {
        setLayoutMode(mode);
      };

      const handleViewChanged = (view: ViewType) => {
        setActiveView(view);
      };

      const handleLayerChanged = () => {
        setActiveLayers(editorState.getActiveLayers());
      };

      const handleBlockSelected = (blockId: string | null) => {
        setSelectedBlock(blockId);
        // Also update foreground/background based on active slot
        setForegroundBlock(editorState.getForegroundBlock());
        setBackgroundBlock(editorState.getBackgroundBlock());
        // Update hasBlockState based on new selected block
        setHasBlockState(deriveHasBlockState(blockId));
        setActiveBlockState(editorState.getActiveBlockState());
      };

      const handleMaterialSlotChanged = (slot: 'foreground' | 'background') => {
        setActiveMaterialSlot(slot);
        // Update selected block when slot changes
        setSelectedBlock(editorState.getSelectedBlock());
      };

      const handleToolChanged = (tool: ToolType) => {
        setActiveTool(tool);
      };

      const handlePaintModeChanged = (mode: PaintMode) => {
        setPaintMode(mode);
      };

      const handlePaintBehaviorChanged = (behavior: PaintBehavior) => {
        setPaintBehavior(behavior);
      };

      const handleShapeFillModeChanged = (mode: ShapeFillMode) => {
        setShapeFillMode(mode);
      };

      const handleDepthConfigChanged = (config: DepthConfig) => {
        setDepthConfig(config);
      };

      const handlePlacementModeChanged = (isPlacement: boolean) => {
        setIsPlacementMode(isPlacement);
      };

      const handleActionBarChanged = (isExpanded: boolean) => {
        setIsActionBarExpanded(isExpanded);
      };

      const handleQuickSelectChanged = (slots: (string | null)[]) => {
        setQuickSelectSlots(slots);
      };

      const handleSliceGuideToggled = () => {
        setSliceGuideVisibility(editorState.getSliceGuideVisibility());
      };

      const handleBlockStateApplied = (state: BlockStateProperties) => {
        setActiveBlockState(state);
      };

      // Subscribe to events
      editorState.on("layout:toggled", handleLayoutChanged);
      editorState.on("view:switched", handleViewChanged);
      editorState.on("layer:adjusted", handleLayerChanged);
      editorState.on("block:selected", handleBlockSelected);
      editorState.on("materialslot:toggled", handleMaterialSlotChanged);
      editorState.on("tool:selected", handleToolChanged);
      editorState.on("paintmode:selected", handlePaintModeChanged);
      editorState.on(
        "paintbehavior:selected",
        handlePaintBehaviorChanged,
      );
      editorState.on(
        "shapefillmode:selected",
        handleShapeFillModeChanged,
      );
      editorState.on("depthconfig:updated", handleDepthConfigChanged);
      editorState.on(
        "placementmode:toggled",
        handlePlacementModeChanged,
      );
      editorState.on("actionbar:toggled", handleActionBarChanged);
      editorState.on("quickselect:assigned", handleQuickSelectChanged);
      editorState.on("sliceguide:axis:toggled", handleSliceGuideToggled);
      editorState.on("blockstate:applied", handleBlockStateApplied);

      // Cleanup
      return () => {
        editorState.off("layout:toggled", handleLayoutChanged);
        editorState.off("view:switched", handleViewChanged);
        editorState.off("layer:adjusted", handleLayerChanged);
        editorState.off("block:selected", handleBlockSelected);
        editorState.off("materialslot:toggled", handleMaterialSlotChanged);
        editorState.off("tool:selected", handleToolChanged);
        editorState.off("paintmode:selected", handlePaintModeChanged);
        editorState.off(
          "paintbehavior:selected",
          handlePaintBehaviorChanged,
        );
        editorState.off(
          "shapefillmode:selected",
          handleShapeFillModeChanged,
        );
        editorState.off("depthconfig:updated", handleDepthConfigChanged);
        editorState.off(
          "placementmode:toggled",
          handlePlacementModeChanged,
        );
        editorState.off("actionbar:toggled", handleActionBarChanged);
        editorState.off("quickselect:assigned", handleQuickSelectChanged);
        editorState.off("sliceguide:axis:toggled", handleSliceGuideToggled);
        editorState.off("blockstate:applied", handleBlockStateApplied);
      };
    }, []);

    return (
      <Component
        {...props}
        layoutMode={layoutMode}
        activeView={activeView}
        activeLayers={activeLayers}
        selectedBlock={selectedBlock}
        foregroundBlock={foregroundBlock}
        backgroundBlock={backgroundBlock}
        activeMaterialSlot={activeMaterialSlot}
        activeTool={activeTool}
        paintMode={paintMode}
        paintBehavior={paintBehavior}
        shapeFillMode={shapeFillMode}
        depthConfig={depthConfig}
        isPlacementMode={isPlacementMode}
        isActionBarExpanded={isActionBarExpanded}
        quickSelectSlots={quickSelectSlots}
        sliceGuideVisibility={sliceGuideVisibility}
        activeBlockState={activeBlockState}
        hasBlockState={hasBlockState}
      />
    );
  };
}
