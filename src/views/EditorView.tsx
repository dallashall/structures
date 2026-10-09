import React from 'react';
import { Box, Button, Stack, Typography } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
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
import { HistoryToast } from "../components/HistoryToast";
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
    materialBrowserGrabbedBlockId,
    activeBlockState,
    hasBlockState,
    onBackToWelcome,
  } = props;

  const handleBackToProjects = () => {
    if (onBackToWelcome) {
      onBackToWelcome();
    }
  };

  if (!project) {
    return (
      <Stack
        spacing={2}
        sx={{ height: "100%", alignItems: "center", justifyContent: "center" }}
      >
        <Typography variant="h6">No project loaded</Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={handleBackToProjects}
        >
          Back to Projects
        </Button>
      </Stack>
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
  const handleViewTabChange = (
    _event: React.SyntheticEvent,
    newValue: string,
  ) => {
    editorState.setActiveView(newValue as ViewType);
  };

  const handleQuickSelectSlot = (index: number) => {
    // Update the foreground/background slot index based on active material slot
    // This makes the block at this slot the active foreground/background
    // WITHOUT modifying what's stored in the slot
    const activeMaterialSlot = editorState.getActiveMaterialSlot();
    if (activeMaterialSlot === 'foreground') {
      editorState.setForegroundSlotIndex(index);
    } else {
      editorState.setBackgroundSlotIndex(index);
    }
  };

  const handleAssignSlot = (index: number, blockId?: string) => {
    const materialToAssign = blockId ?? selectedBlock;
    if (materialToAssign) {
      editorState.setQuickSelectSlot(index, materialToAssign);
    }
  };

  const handleMaterialBrowserClose = () => {
    editorState.setMaterialBrowserOpen(false);
  };

  const handleConfirmMetaBlockPlacement = () => {
    // Command handles exiting placement mode after event is persisted
    void confirmMetaBlockCommand.execute();
  };

  // Keyboard shortcuts handled by HotkeyDispatcher singleton

  return (
    <Box sx={{ height: "100%", overflow: "hidden" }}>
      <Stack direction="column" sx={{ height: "100%" }}>
        {/* Toolbar */}
        <Toolbar
          projectName={project.name}
          layoutMode={layoutMode}
          saveState={saveState}
          onBackToProjects={handleBackToProjects}
          onLayoutModeChange={editorState.setLayoutMode}
        />

        {/* Tool Options Bar */}
        <ToolOptionsBar
          paintMode={paintMode}
          paintBehavior={paintBehavior}
          shapeFillMode={shapeFillMode}
          depthConfig={depthConfig}
          maxDimensions={project.dimensions}
          activeLayers={activeLayers}
          onPaintBehaviorChange={editorState.setPaintBehavior}
          onShapeFillModeChange={editorState.setShapeFillMode}
          onDepthConfigChange={editorState.setDepthConfig}
          onLayerChange={editorState.setActiveLayer}
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
              activeView={activeView}
              activeLayers={activeLayers}
              foregroundBlock={foregroundBlock}
              backgroundBlock={backgroundBlock}
              activeMaterialSlot={activeMaterialSlot}
              activeBlockState={activeBlockState}
              hasBlockState={hasBlockState}
              paintMode={paintMode}
              paintBehavior={paintBehavior}
              shapeFillMode={shapeFillMode}
              depthConfig={depthConfig}
              isPlacementMode={isPlacementMode}
              isActionBarExpanded={isActionBarExpanded}
              quickSelectSlots={quickSelectSlots}
              blocks={blocks}
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
              activeLayers={activeLayers}
              foregroundBlock={foregroundBlock}
              backgroundBlock={backgroundBlock}
              activeMaterialSlot={activeMaterialSlot}
              activeBlockState={activeBlockState}
              hasBlockState={hasBlockState}
              paintMode={paintMode}
              paintBehavior={paintBehavior}
              shapeFillMode={shapeFillMode}
              depthConfig={depthConfig}
              isPlacementMode={isPlacementMode}
              isActionBarExpanded={isActionBarExpanded}
              quickSelectSlots={quickSelectSlots}
              blocks={blocks}
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
        onClose={handleMaterialBrowserClose}
        onSearchChange={editorState.setMaterialBrowserSearchQuery}
        onTabChange={editorState.setMaterialBrowserSelectedTab}
        onAssignSlot={handleAssignSlot}
        grabbedBlockId={materialBrowserGrabbedBlockId}
        onGrabBlock={editorState.setMaterialBrowserGrabbedBlock}
      />

      <HistoryToast />
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
