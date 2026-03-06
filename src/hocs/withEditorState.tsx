import React from 'react';
import { editorStateManager } from '../core/EditorStateManager';
import type {
  LayoutMode,
  ViewType,
  LayerState,
  ToolType,
  PaintMode,
  PaintBehavior,
  ShapeFillMode,
  DepthConfig,
} from '../types';

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
  Component: React.ComponentType<P & WithEditorStateProps>
) {
  return function WithEditorState(props: P) {
    const [layoutMode, setLayoutMode] = React.useState<LayoutMode>(
      editorStateManager.getLayoutMode()
    );
    const [activeView, setActiveView] = React.useState<ViewType>(
      editorStateManager.getActiveView()
    );
    const [activeLayers, setActiveLayers] = React.useState<LayerState>(
      editorStateManager.getActiveLayers()
    );
    const [selectedBlock, setSelectedBlock] = React.useState<string | null>(
      editorStateManager.getSelectedBlock()
    );
    const [activeTool, setActiveTool] = React.useState<ToolType>(
      editorStateManager.getActiveTool()
    );
    const [paintMode, setPaintMode] = React.useState<PaintMode>(
      editorStateManager.getPaintMode()
    );
    const [paintBehavior, setPaintBehavior] = React.useState<PaintBehavior>(
      editorStateManager.getPaintBehavior()
    );
    const [shapeFillMode, setShapeFillMode] = React.useState<ShapeFillMode>(
      editorStateManager.getShapeFillMode()
    );
    const [depthConfig, setDepthConfig] = React.useState<DepthConfig>(
      editorStateManager.getDepthConfig()
    );
    const [isPlacementMode, setIsPlacementMode] = React.useState<boolean>(
      editorStateManager.getPlacementMode()
    );
    const [isActionBarExpanded, setIsActionBarExpanded] = React.useState<boolean>(
      editorStateManager.getActionBarExpanded()
    );
    const [quickSelectSlots, setQuickSelectSlots] = React.useState<(string | null)[]>(
      editorStateManager.getQuickSelectSlots()
    );
    const [activeDragBlock, setActiveDragBlock] = React.useState<string | null>(
      editorStateManager.getActiveDragBlock()
    );

    React.useEffect(() => {
      const handleLayoutChanged = (mode: LayoutMode) => {
        setLayoutMode(mode);
      };

      const handleViewChanged = (view: ViewType) => {
        setActiveView(view);
      };

      const handleLayerChanged = () => {
        setActiveLayers(editorStateManager.getActiveLayers());
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

      // Subscribe to events
      editorStateManager.on('layout:changed', handleLayoutChanged);
      editorStateManager.on('view:changed', handleViewChanged);
      editorStateManager.on('layer:changed', handleLayerChanged);
      editorStateManager.on('block:selected', handleBlockSelected);
      editorStateManager.on('tool:changed', handleToolChanged);
      editorStateManager.on('paintmode:changed', handlePaintModeChanged);
      editorStateManager.on('paintbehavior:changed', handlePaintBehaviorChanged);
      editorStateManager.on('shapefillmode:changed', handleShapeFillModeChanged);
      editorStateManager.on('depthconfig:changed', handleDepthConfigChanged);
      editorStateManager.on('placementmode:changed', handlePlacementModeChanged);
      editorStateManager.on('actionbar:changed', handleActionBarChanged);
      editorStateManager.on('quickselect:changed', handleQuickSelectChanged);
      editorStateManager.on('drag:changed', handleDragChanged);

      // Cleanup
      return () => {
        editorStateManager.off('layout:changed', handleLayoutChanged);
        editorStateManager.off('view:changed', handleViewChanged);
        editorStateManager.off('layer:changed', handleLayerChanged);
        editorStateManager.off('block:selected', handleBlockSelected);
        editorStateManager.off('tool:changed', handleToolChanged);
        editorStateManager.off('paintmode:changed', handlePaintModeChanged);
        editorStateManager.off('paintbehavior:changed', handlePaintBehaviorChanged);
        editorStateManager.off('shapefillmode:changed', handleShapeFillModeChanged);
        editorStateManager.off('depthconfig:changed', handleDepthConfigChanged);
        editorStateManager.off('placementmode:changed', handlePlacementModeChanged);
        editorStateManager.off('actionbar:changed', handleActionBarChanged);
        editorStateManager.off('quickselect:changed', handleQuickSelectChanged);
        editorStateManager.off('drag:changed', handleDragChanged);
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
        activeDragBlock={activeDragBlock}
      />
    );
  };
}
