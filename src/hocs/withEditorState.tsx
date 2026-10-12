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
  HeldModifiers,
} from "../types";

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
  heldModifiers: HeldModifiers;
  isPlacementMode: boolean;
  quickSelectSlots: (string | null)[];
  sliceGuideVisibility: { x: boolean; y: boolean; z: boolean };
  renderSettings: RenderSettings;
  renderSettingsModalOpen: boolean;
  activeBlockState: BlockStateProperties;
  hasBlockState: boolean;
}

const increment = (count: number): number => count + 1;

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
  "modifiers:held",
  "placementmode:toggled",
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
    heldModifiers: editorState.getHeldModifiers(),
    isPlacementMode: editorState.getPlacementMode(),
    quickSelectSlots: editorState.getQuickSelectSlots(),
    sliceGuideVisibility: editorState.getSliceGuideVisibility(),
    renderSettings: editorState.getRenderSettings(),
    renderSettingsModalOpen: editorState.getRenderSettingsModalOpen(),
    activeBlockState: editorState.getActiveBlockState(),
    hasBlockState: deriveHasBlockState(selectedBlock),
  };
};

/**
 * HOC that bridges EditorState to React re-renders.
 * Props are read from the singleton on every render. Events only trigger the re-render.
 */
export function withEditorState<P extends object>(
  Component: React.ComponentType<P & WithEditorStateProps>,
) {
  return function WithEditorState(props: P) {
    const [, rerender] = React.useReducer(increment, 0);

    const subscribe = (): (() => void) => {
      for (const event of EDITOR_EVENTS) {
        editorState.on(event, rerender);
      }
      const unsubscribe = (): void => {
        for (const event of EDITOR_EVENTS) {
          editorState.off(event, rerender);
        }
      };
      return unsubscribe;
    };
    React.useEffect(subscribe, []);

    return <Component {...props} {...readEditorState()} />;
  };
}
