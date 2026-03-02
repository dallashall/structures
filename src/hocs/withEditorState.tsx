import React from 'react';
import { editorStateManager } from '../core/EditorStateManager';
import type {
  LayoutMode,
  ViewType,
  LayerState,
  ToolType,
  PaintMode,
  PaintBehavior,
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
  quickSelectSlots: (string | null)[];
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
    const [quickSelectSlots, setQuickSelectSlots] = React.useState<(string | null)[]>(
      editorStateManager.getQuickSelectSlots()
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

      const handleQuickSelectChanged = (slots: (string | null)[]) => {
        setQuickSelectSlots(slots);
      };

      // Subscribe to events
      editorStateManager.on('layout:changed', handleLayoutChanged);
      editorStateManager.on('view:changed', handleViewChanged);
      editorStateManager.on('layer:changed', handleLayerChanged);
      editorStateManager.on('block:selected', handleBlockSelected);
      editorStateManager.on('tool:changed', handleToolChanged);
      editorStateManager.on('paintmode:changed', handlePaintModeChanged);
      editorStateManager.on('paintbehavior:changed', handlePaintBehaviorChanged);
      editorStateManager.on('quickselect:changed', handleQuickSelectChanged);

      // Cleanup
      return () => {
        editorStateManager.off('layout:changed', handleLayoutChanged);
        editorStateManager.off('view:changed', handleViewChanged);
        editorStateManager.off('layer:changed', handleLayerChanged);
        editorStateManager.off('block:selected', handleBlockSelected);
        editorStateManager.off('tool:changed', handleToolChanged);
        editorStateManager.off('paintmode:changed', handlePaintModeChanged);
        editorStateManager.off('paintbehavior:changed', handlePaintBehaviorChanged);
        editorStateManager.off('quickselect:changed', handleQuickSelectChanged);
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
        quickSelectSlots={quickSelectSlots}
      />
    );
  };
}
