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
  withSaveState,
  WithSaveStateProps,
} from "../hocs/withSaveState";

import { Toolbar } from "../layouts/Toolbar";
import { ToolOptionsBar } from "../components/ToolOptionsBar";
import { MetaBlockPlacementModal } from "../components/MetaBlockPlacementModal";
import { MaterialBrowserModal } from "../components/MaterialBrowserModal";
import { HistoryToast } from "../components/HistoryToast";
import { TabbedEditorView } from "./TabbedEditorView";
import { QuadEditorView } from "./QuadEditorView";

import { editorState } from "../core/EditorState";
import { screenRouter } from "../core/ScreenRouter";
import { confirmMetaBlockCommand } from "../commands/ConfirmMetaBlockCommand";
import { saveProjectFileCommand } from "../commands/SaveProjectFileCommand";
import { toFileErrorMessage } from "../utils/projectFile";

interface EditorViewProps
  extends
    WithProjectStateProps,
    WithEditorStateProps,
    WithBlockRegistryProps,
    WithSaveStateProps {
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
    heldModifiers,
    isPlacementMode,
    saveState,
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

  // "Got it" enters placement mode, which hides the modal until the meta block is confirmed
  const metaBlock = project?.metaBlock;
  const showMetaBlockModal =
    metaBlock ? !metaBlock.isConfirmed && !isPlacementMode : false;

  const handleMetaBlockModalClose = () => {
    editorState.setPlacementMode(true);
  };

  const handleViewTabChange = (
    _event: React.SyntheticEvent,
    newValue: string,
  ) => {
    editorState.setActiveView(newValue as ViewType);
  };

  const handleQuickSelectSlot = (index: number) => {
    // Points the active material at this slot. The slot's stored block stays as it is.
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

  const handleSaveToFile = async () => {
    try {
      await saveProjectFileCommand.execute();
    } catch (error) {
      console.error("Failed to save project file:", error);
      screenRouter.showFileError(toFileErrorMessage(error, "The project file could not be saved."));
    }
  };

  return (
    <Box sx={{ height: "100%", overflow: "hidden" }}>
      <Stack direction="column" sx={{ height: "100%" }}>
        <Toolbar
          projectName={project.name}
          layoutMode={layoutMode}
          saveState={saveState}
          onBackToProjects={handleBackToProjects}
          onLayoutModeChange={editorState.setLayoutMode}
          onSaveToFile={handleSaveToFile}
          onShowCredits={screenRouter.openCreditsDialog}
        />

        <ToolOptionsBar
          paintMode={paintMode}
          paintBehavior={paintBehavior}
          shapeFillMode={shapeFillMode}
          depthConfig={depthConfig}
          maxDimensions={project.dimensions}
          activeLayers={activeLayers}
          heldModifiers={heldModifiers}
          onPaintBehaviorChange={editorState.setPaintBehavior}
          onShapeFillModeChange={editorState.setShapeFillMode}
          onDepthConfigChange={editorState.setDepthConfig}
          onLayerChange={editorState.setActiveLayer}
        />

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

      <MetaBlockPlacementModal
        isOpen={showMetaBlockModal}
        onClose={handleMetaBlockModalClose}
      />

      <MaterialBrowserModal
        blocks={blocks}
        quickSelectSlots={quickSelectSlots}
        onClose={handleMaterialBrowserClose}
        onSearchChange={editorState.setMaterialBrowserSearchQuery}
        onTabChange={editorState.setMaterialBrowserSelectedTab}
        onAssignSlot={editorState.setQuickSelectSlot}
        onPick={editorState.assignToActiveSlot}
      />

      <HistoryToast />
    </Box>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const EditorView = withSaveState(
  withBlockRegistry(withEditorState(withProjectState(EditorViewComponent))),
) as any;
