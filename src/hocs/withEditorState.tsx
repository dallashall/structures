import React from 'react';
import { editorState } from "../core/EditorState";
import { blockRegistry } from "../core/BlockRegistry";

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
  RenderSettings,
} from "../types";

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
  renderSettings: RenderSettings;
  renderSettingsModalOpen: boolean;
  activeBlockState: BlockStateProperties;
  hasBlockState: boolean;
}

const increment = (count: number): number => count + 1;

/** All EditorState events that should trigger a re-render */
const EDITOR_EVENTS = [
  "layout:toggled",
  "view:switched",
  "layer:adjusted",
  "block:selected",
  "materialslot:toggled",
  "tool:selected",
  "paintmode:selected",
  "paintbehavior:selected",
  "shapefillmode:selected",
  "depthconfig:applied",
  "placementmode:toggled",
  "actionbar:toggled",
  "quickselect:assigned",
  "sliceguide:axis:toggled",
  "rendersettings:applied",
  "rendersettingsmodal:toggled",
  "blockstate:applied",
] as const;

const deriveHasBlockState = (blockId: string | null): boolean => {
  if (!blockId) return false;
  const block = blockRegistry.getBlock(blockId);
  return block?.hasBlockState ?? false;
};

/**
 * Read all editor state directly from the singleton.
 * No local copies — the singleton IS the source of truth.
 */
const readEditorState = (): WithEditorStateProps => {
  const selectedBlock = editorState.getSelectedBlock();
  return {
    layoutMode: editorState.getLayoutMode(),
    activeView: editorState.getActiveView(),
    activeLayers: editorState.getActiveLayers(),
    selectedBlock,
    foregroundBlock: editorState.getForegroundBlock(),
    backgroundBlock: editorState.getBackgroundBlock(),
    activeMaterialSlot: editorState.getActiveMaterialSlot(),
    activeTool: editorState.getActiveTool(),
    paintMode: editorState.getPaintMode(),
    paintBehavior: editorState.getPaintBehavior(),
    shapeFillMode: editorState.getShapeFillMode(),
    depthConfig: editorState.getDepthConfig(),
    isPlacementMode: editorState.getPlacementMode(),
    isActionBarExpanded: editorState.getActionBarExpanded(),
    quickSelectSlots: editorState.getQuickSelectSlots(),
    sliceGuideVisibility: editorState.getSliceGuideVisibility(),
    renderSettings: editorState.getRenderSettings(),
    renderSettingsModalOpen: editorState.getRenderSettingsModalOpen(),
    activeBlockState: editorState.getActiveBlockState(),
    hasBlockState: deriveHasBlockState(selectedBlock),
  };
};

/**
 * HOC that bridges EditorState singleton → React re-renders.
 *
 * Subscribes to all EditorState events. On any event, triggers a re-render.
 * Props are read directly from the singleton — no local state duplication.
 */
export function withEditorState<P extends object>(
  Component: React.ComponentType<P & WithEditorStateProps>,
) {
  return function WithEditorState(props: P) {
    const [, rerender] = React.useReducer(increment, 0);

    React.useEffect(() => {
      for (const event of EDITOR_EVENTS) {
        editorState.on(event, rerender);
      }
      return () => {
        for (const event of EDITOR_EVENTS) {
          editorState.off(event, rerender);
        }
      };
    }, []);

    return <Component {...props} {...readEditorState()} />;
  };
}
