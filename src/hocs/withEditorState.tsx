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
} from "../types";

/**
 * Props injected by withEditorState HOC
 */
export interface WithEditorStateProps {
  layoutMode: LayoutMode;
  activeView: ViewType;
  activeLayers: LayerState;
  selectedBlock: string | null;
  activeTool: ToolType;
  paintMode: PaintMode;
  paintBehavior: PaintBehavior;
  shapeFillMode: ShapeFillMode;
  depthConfig: DepthConfig;
  isPlacementMode: boolean;
  isActionBarExpanded: boolean;
  quickSelectSlots: (string | null)[];
  selectedQuickSelectSlot: number;
  activeDragBlock: string | null;
}

/**
 * Higher-Order Component that subscribes to EditorStateManager events
 * and provides editor UI state to wrapped component.
 *
 * Subscribes to:
 * - layout:changed
 * - view:changed
 * - layer:changed
 * - block:selected
 * - tool:changed
 * - paintmode:changed
 * - paintbehavior:changed
 * - quickselect:changed
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
    const [activeDragBlock, setActiveDragBlock] = React.useState<string | null>(
      editorState.getActiveDragBlock(),
    );
    const [selectedQuickSelectSlot, setSelectedQuickSelectSlot] =
      React.useState<number>(editorState.getSelectedQuickSelectSlot());

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

      const handleDragChanged = (blockId: string | null) => {
        setActiveDragBlock(blockId);
      };

      const handleQuickSelectSlotChanged = (index: number) => {
        setSelectedQuickSelectSlot(index);
      };

      // Subscribe to events
      editorState.on("layout:changed", handleLayoutChanged);
      editorState.on("view:changed", handleViewChanged);
      editorState.on("layer:changed", handleLayerChanged);
      editorState.on("block:selected", handleBlockSelected);
      editorState.on("tool:changed", handleToolChanged);
      editorState.on("paintmode:changed", handlePaintModeChanged);
      editorState.on(
        "paintbehavior:changed",
        handlePaintBehaviorChanged,
      );
      editorState.on(
        "shapefillmode:changed",
        handleShapeFillModeChanged,
      );
      editorState.on("depthconfig:changed", handleDepthConfigChanged);
      editorState.on(
        "placementmode:changed",
        handlePlacementModeChanged,
      );
      editorState.on("actionbar:changed", handleActionBarChanged);
      editorState.on("quickselect:changed", handleQuickSelectChanged);
      editorState.on(
        "quickselect:slot:changed",
        handleQuickSelectSlotChanged,
      );
      editorState.on("drag:changed", handleDragChanged);

      // Cleanup
      return () => {
        editorState.off("layout:changed", handleLayoutChanged);
        editorState.off("view:changed", handleViewChanged);
        editorState.off("layer:changed", handleLayerChanged);
        editorState.off("block:selected", handleBlockSelected);
        editorState.off("tool:changed", handleToolChanged);
        editorState.off("paintmode:changed", handlePaintModeChanged);
        editorState.off(
          "paintbehavior:changed",
          handlePaintBehaviorChanged,
        );
        editorState.off(
          "shapefillmode:changed",
          handleShapeFillModeChanged,
        );
        editorState.off("depthconfig:changed", handleDepthConfigChanged);
        editorState.off(
          "placementmode:changed",
          handlePlacementModeChanged,
        );
        editorState.off("actionbar:changed", handleActionBarChanged);
        editorState.off("quickselect:changed", handleQuickSelectChanged);
        editorState.off(
          "quickselect:slot:changed",
          handleQuickSelectSlotChanged,
        );
        editorState.off("drag:changed", handleDragChanged);
      };
    }, []);

    return (
      <Component
        {...props}
        layoutMode={layoutMode}
        activeView={activeView}
        activeLayers={activeLayers}
        selectedBlock={selectedBlock}
        activeTool={activeTool}
        paintMode={paintMode}
        paintBehavior={paintBehavior}
        shapeFillMode={shapeFillMode}
        depthConfig={depthConfig}
        isPlacementMode={isPlacementMode}
        isActionBarExpanded={isActionBarExpanded}
        quickSelectSlots={quickSelectSlots}
        selectedQuickSelectSlot={selectedQuickSelectSlot}
        activeDragBlock={activeDragBlock}
      />
    );
  };
}
