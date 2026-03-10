import React from 'react';
import { Box, Stack } from "@mui/material";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
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
import { MaterialQuickSelect } from "../components/MaterialQuickSelect";
import { MaterialBrowserModal } from "../components/MaterialBrowserModal";
import { ColorSwatch } from "../components/ColorSwatch";
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
    WithMaterialBrowserStateProps {}

function EditorViewComponent(props: EditorViewProps) {
  const {
    project,
    layoutMode,
    activeView,
    activeLayers,
    blocks,
    quickSelectSlots,
    selectedBlock,
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
    selectedQuickSelectSlot,
    activeDragBlock,
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

  // TODO: Add keyboard shortcuts directly (no manager pattern)
  // For now, metablock placement can be confirmed via UI button

  // Get the actual Block object for the active drag block ID
  const activeDragBlockObject = activeDragBlock
    ? (blocks.find((b) => b.id === activeDragBlock) ?? null)
    : null;

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
    console.log("Open project requested");
  };

  const handleViewTabChange = (
    _event: React.SyntheticEvent,
    newValue: string,
  ) => {
    editorState.setActiveView(newValue as ViewType);
  };

  const handleQuickSelectSlot = (index: number) => {
    // Always select the slot (even if empty)
    editorState.setSelectedQuickSelectSlot(index);

    // If the slot has a material, also select that material
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
    void confirmMetaBlockCommand.execute();
    // Don't toggle placement mode - let the confirmation event update the projection
    // The modal will hide automatically when metaBlock.isConfirmed becomes true
  };

  const handleDragStart = (event: DragStartEvent) => {
    const blockId = event.active.data.current?.blockId;
    if (blockId) {
      editorState.setActiveDragBlock(blockId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Clear the active drag block
    editorState.setActiveDragBlock(null);

    if (!over) return;

    // Extract block ID from dragged material
    const blockId = active.data.current?.blockId;
    // Extract slot index from drop target
    const slotIndex = over.data.current?.slotIndex;

    if (blockId && typeof slotIndex === "number") {
      editorState.setQuickSelectSlot(slotIndex, blockId);
    }
  };

  const handleDragCancel = () => {
    editorState.setActiveDragBlock(null);
  };

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

      {/* Drag-and-drop context for material assignment */}
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Material Quick Select Bar (floating at bottom) */}
        <MaterialQuickSelect
          slots={quickSelectSlots}
          selectedSlotIndex={selectedQuickSelectSlot}
          blocks={blocks}
          onSelectSlot={handleQuickSelectSlot}
          onOpenBrowser={() => editorState.setMaterialBrowserOpen(true)}
        />

        {/* Material Browser Modal */}
        <MaterialBrowserModal
          isOpen={isMaterialBrowserOpen}
          blocks={blocks}
          selectedBlockId={selectedBlock}
          searchQuery={materialBrowserSearchQuery}
          selectedTab={materialBrowserSelectedTab}
          quickSelectSlots={quickSelectSlots}
          selectedSlotIndex={selectedQuickSelectSlot}
          onClose={() => editorState.setMaterialBrowserOpen(false)}
          onSelectMaterial={editorState.setSelectedBlock}
          onSearchChange={editorState.setMaterialBrowserSearchQuery}
          onTabChange={editorState.setMaterialBrowserSelectedTab}
          onSelectSlot={handleQuickSelectSlot}
          onAssignSlot={handleAssignSlot}
        />

        {/* Drag Overlay - shows visual feedback while dragging */}
        <DragOverlay zIndex={1400} dropAnimation={null}>
          {activeDragBlockObject && (
            <Box
              sx={{
                width: 60,
                height: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "background.paper",
                border: 2,
                borderColor: "primary.main",
                borderRadius: 1,
                boxShadow: 4,
                cursor: "grabbing",
              }}
            >
              <ColorSwatch color={activeDragBlockObject.color} size="L" />
            </Box>
          )}
        </DragOverlay>
      </DndContext>
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
