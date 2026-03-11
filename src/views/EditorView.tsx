import React from 'react';
import { Box, Stack } from "@mui/material";
import type { ViewType } from "../types";

import {
  withProjectState,
  WithProjectStateProps,
} from "../hocs/withProjectState";
import { withEditorState, WithEditorStateProps } from "../hocs/withEditorState";
import {
  withBlockRegistry,
  WithBlockRegistryProps,
} from "../hocs/withBlockRegistry";
import {
  withStorageState,
  WithStorageStateProps,
} from "../hocs/withStorageState";
import {
  withMaterialBrowserState,
  WithMaterialBrowserStateProps,
} from "../hocs/withMaterialBrowserState";

import { Toolbar } from "../layouts/Toolbar";
import { ToolOptionsBar } from "../components/ToolOptionsBar";
import { MetaBlockPlacementModal } from "../components/MetaBlockPlacementModal";
import { MaterialBrowserModal } from "../components/MaterialBrowserModal";
import { TabbedEditorView } from "./TabbedEditorView";
import { QuadEditorView } from "./QuadEditorView";

import { editorState } from "../core/EditorState";
import { confirmMetaBlockCommand } from "../commands/ConfirmMetaBlockCommand";

/**
 * EditorView - Main editor orchestrator
 *
 * Minimal wrapper that:
 * - Shows toolbar
 * - Switches between TabbedEditorView and QuadEditorView based on layout mode
 * - Handles meta block placement modal
 * - Provides event handlers to child views
 */
interface EditorViewProps
  extends
    WithProjectStateProps,
    WithEditorStateProps,
    WithBlockRegistryProps,
    WithStorageStateProps,
    WithMaterialBrowserStateProps {
  onBackToWelcome?: () => void;
}

function EditorViewComponent(props: EditorViewProps) {
  const {
    project,
    layoutMode,
    activeView,
    activeLayers,
    blocks,
    quickSelectSlots,
    selectedBlock,
    foregroundBlock,
    backgroundBlock,
    activeMaterialSlot,
    paintMode,
    paintBehavior,
    shapeFillMode,
    depthConfig,
    isPlacementMode,
    isActionBarExpanded,
    saveState,
    isMaterialBrowserOpen,
    materialBrowserSearchQuery,
    materialBrowserSelectedTab,
    onBackToWelcome,
  } = props;

  // No project loaded
  if (!project) {
    return (
      <Box sx={{ p: 4 }}>
        <p>No project loaded</p>
      </Box>
    );
  }

  // Derive modal visibility from meta block confirmation status
  // Hide modal when in placement mode (user clicked "Got it") or when meta block is confirmed
  const metaBlock = project?.metaBlock;
  const showMetaBlockModal =
    metaBlock ? !metaBlock.isConfirmed && !isPlacementMode : false;

  // Handle meta block modal close (enter placement mode)
  const handleMetaBlockModalClose = () => {
    editorState.setPlacementMode(true);
  };

  // Handlers
  const handleNewProject = () => {
    console.log("New project requested");
  };

  const handleSaveProject = () => {
    // TODO: Implement export command
    // Project is automatically saved to EventLog (IndexedDB)
    console.log("Export not yet implemented");
  };

  const handleOpenProject = () => {
    if (onBackToWelcome) {
      onBackToWelcome();
    }
  };

  const handleViewTabChange = (
    _event: React.SyntheticEvent,
    newValue: string,
  ) => {
    editorState.setActiveView(newValue as ViewType);
  };

  const handleQuickSelectSlot = (index: number) => {
    // Get block from slot and apply to active material
    const blockId = quickSelectSlots[index];
    if (blockId) {
      editorState.setSelectedBlock(blockId);
    }
  };

  const handleAssignSlot = (index: number, blockId?: string) => {
    const materialToAssign = blockId ?? selectedBlock;
    if (materialToAssign) {
      editorState.setQuickSelectSlot(index, materialToAssign);
    }
  };

  const handleConfirmMetaBlockPlacement = () => {
    // Command handles exiting placement mode after event is persisted
    void confirmMetaBlockCommand.execute();
  };

  // Keyboard shortcuts handled by KeyboardManager singleton

  return (
    <Box sx={{ height: "100%", overflow: "hidden" }}>
      <Stack direction="column" sx={{ height: "100%" }}>
        {/* Toolbar */}
        <Toolbar
          projectName={project.name}
          layoutMode={layoutMode}
          saveState={saveState}
          onNewProject={handleNewProject}
          onSaveProject={handleSaveProject}
          onOpenProject={handleOpenProject}
          onLayoutModeChange={editorState.setLayoutMode}
        />

        {/* Tool Options Bar */}
        <ToolOptionsBar
          paintMode={paintMode}
          paintBehavior={paintBehavior}
          shapeFillMode={shapeFillMode}
          depthConfig={depthConfig}
          onPaintBehaviorChange={editorState.setPaintBehavior}
          onShapeFillModeChange={editorState.setShapeFillMode}
          onDepthConfigChange={editorState.setDepthConfig}
        />

        {/* Main Canvas Area - Switch between layout modes */}
        <Box
          sx={{
            flex: 1,
            overflow: "hidden",
            height: "100%",
            minHeight: 0,
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {layoutMode === "tabbed" ? (
            <TabbedEditorView
              project={project}
              activeView={activeView}
              activeLayers={activeLayers}
              selectedBlock={selectedBlock}
              foregroundBlock={foregroundBlock}
              backgroundBlock={backgroundBlock}
              activeMaterialSlot={activeMaterialSlot}
              paintMode={paintMode}
              paintBehavior={paintBehavior}
              shapeFillMode={shapeFillMode}
              depthConfig={depthConfig}
              isPlacementMode={isPlacementMode}
              isActionBarExpanded={isActionBarExpanded}
              quickSelectSlots={quickSelectSlots}
              blocks={blocks}
              onLayerChange={editorState.setActiveLayer}
              onViewChange={editorState.setActiveView}
              onTabChange={handleViewTabChange}
              onPaintModeChange={editorState.setPaintMode}
              onPaintBehaviorChange={editorState.setPaintBehavior}
              onShapeFillModeChange={editorState.setShapeFillMode}
              onDepthConfigChange={editorState.setDepthConfig}
              onQuickSelectSlot={handleQuickSelectSlot}
              onAssignSlot={handleAssignSlot}
              onConfirmPlacement={handleConfirmMetaBlockPlacement}
            />
          ) : (
            <QuadEditorView
              project={project}
              activeLayers={activeLayers}
              selectedBlock={selectedBlock}
              foregroundBlock={foregroundBlock}
              backgroundBlock={backgroundBlock}
              activeMaterialSlot={activeMaterialSlot}
              paintMode={paintMode}
              paintBehavior={paintBehavior}
              shapeFillMode={shapeFillMode}
              depthConfig={depthConfig}
              isPlacementMode={isPlacementMode}
              isActionBarExpanded={isActionBarExpanded}
              quickSelectSlots={quickSelectSlots}
              blocks={blocks}
              onLayerChange={editorState.setActiveLayer}
              onPaintModeChange={editorState.setPaintMode}
              onPaintBehaviorChange={editorState.setPaintBehavior}
              onShapeFillModeChange={editorState.setShapeFillMode}
              onDepthConfigChange={editorState.setDepthConfig}
              onQuickSelectSlot={handleQuickSelectSlot}
              onAssignSlot={handleAssignSlot}
              onConfirmPlacement={handleConfirmMetaBlockPlacement}
            />
          )}
        </Box>
      </Stack>

      {/* Meta Block Placement Modal */}
      <MetaBlockPlacementModal
        isOpen={showMetaBlockModal}
        onClose={handleMetaBlockModalClose}
      />

      {/* Material Browser Modal */}
      <MaterialBrowserModal
        isOpen={isMaterialBrowserOpen}
        blocks={blocks}
        searchQuery={materialBrowserSearchQuery}
        selectedTab={materialBrowserSelectedTab}
        quickSelectSlots={quickSelectSlots}
        onClose={() => editorState.setMaterialBrowserOpen(false)}
        onSearchChange={editorState.setMaterialBrowserSearchQuery}
        onTabChange={editorState.setMaterialBrowserSelectedTab}
        onAssignSlot={handleAssignSlot}
      />
    </Box>
  );
}

// Export with HOCs - all props are injected by HOCs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const EditorView = withMaterialBrowserState(
  withStorageState(
    withBlockRegistry(withEditorState(withProjectState(EditorViewComponent))),
  ),
) as any;
