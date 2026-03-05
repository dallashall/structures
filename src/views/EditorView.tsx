import { Box, Stack } from '@mui/material';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import type { ViewType, LayoutMode, PaintMode, PaintBehavior, ShapeFillMode, DepthConfig } from '../types';
import type { Block } from '../types';

import { withProjectState, WithProjectStateProps } from '../hocs/withProjectState';
import { withEditorState, WithEditorStateProps } from '../hocs/withEditorState';
import { withBlockRegistry, WithBlockRegistryProps } from '../hocs/withBlockRegistry';
import { withStorageState, WithStorageStateProps } from '../hocs/withStorageState';
import { withMaterialBrowserState, WithMaterialBrowserStateProps } from '../hocs/withMaterialBrowserState';

import { Toolbar } from '../layouts/Toolbar';
import { ToolOptionsBar } from '../components/ToolOptionsBar';
import { MetaBlockPlacementModal } from '../components/MetaBlockPlacementModal';
import { MaterialQuickSelect } from '../components/MaterialQuickSelect';
import { MaterialBrowserModal } from '../components/MaterialBrowserModal';
import { ColorSwatch } from '../components/ColorSwatch';
import { TabbedEditorView } from './TabbedEditorView';
import { QuadEditorView } from './QuadEditorView';

import { projectManager } from '../core/ProjectManager';
import { editorStateManager } from '../core/EditorStateManager';
import { storageManager } from '../core/StorageManager';
import { Canvas2DController } from '../core/canvas2d';
import { keyboardShortcutManager } from '../core/KeyboardShortcutManager';
import React from 'react';

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
  extends WithProjectStateProps,
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
  const showMetaBlockModal = !projectManager.isMetaBlockConfirmed() && !isPlacementMode;

  // Handle meta block modal close (enter placement mode)
  const handleMetaBlockModalClose = () => {
    editorStateManager.setPlacementMode(true);
  };

  // Start keyboard shortcut manager on mount
  React.useEffect(() => {
    keyboardShortcutManager.startListening();

    // Subscribe to meta block placement confirmation from keyboard
    const handleConfirmPlacement = () => {
      handleConfirmMetaBlockPlacement();
    };

    keyboardShortcutManager.on('confirmMetaBlockPlacement', handleConfirmPlacement);

    return () => {
      keyboardShortcutManager.off('confirmMetaBlockPlacement', handleConfirmPlacement);
      keyboardShortcutManager.stopListening();
    };
  }, []);

  // Track actively dragged block for overlay
  const [activeDragBlock, setActiveDragBlock] = React.useState<Block | null>(null);

  // Handlers
  const handleNewProject = () => {
    console.log('New project requested');
  };

  const handleSaveProject = () => {
    if (project) {
      storageManager.exportProject(project);
    }
  };

  const handleOpenProject = () => {
    console.log('Open project requested');
  };

  const handleLayoutModeChange = (mode: LayoutMode) => {
    editorStateManager.setLayoutMode(mode);
  };

  const handleLayerChange = (dimension: 'x' | 'y' | 'z', layer: number) => {
    editorStateManager.setActiveLayer(dimension, layer);
  };

  const handleViewChange = (view: ViewType) => {
    editorStateManager.setActiveView(view);
  };

  const handleViewTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    editorStateManager.setActiveView(newValue as ViewType);
  };

  const handleQuickSelectSlot = (index: number) => {
    const blockId = quickSelectSlots[index];
    if (blockId) {
      editorStateManager.setSelectedBlock(blockId);
    }
  };

  const handleAssignSlot = (index: number) => {
    if (selectedBlock) {
      editorStateManager.setQuickSelectSlot(index, selectedBlock);
    }
  };

  const handlePaintModeChange = (mode: PaintMode) => {
    editorStateManager.setPaintMode(mode);
  };

  const handlePaintBehaviorChange = (behavior: PaintBehavior) => {
    editorStateManager.setPaintBehavior(behavior);
  };

  const handleShapeFillModeChange = (mode: ShapeFillMode) => {
    editorStateManager.setShapeFillMode(mode);
  };

  const handleDepthConfigChange = (config: Partial<DepthConfig>) => {
    editorStateManager.setDepthConfig(config);
  };

  const handleConfirmMetaBlockPlacement = () => {
    Canvas2DController.confirmAllPlacements();
    editorStateManager.setPlacementMode(false);
  };

  const handleOpenMaterialBrowser = () => {
    editorStateManager.setMaterialBrowserOpen(true);
  };

  const handleCloseMaterialBrowser = () => {
    editorStateManager.setMaterialBrowserOpen(false);
  };

  const handleSelectMaterial = (blockId: string) => {
    editorStateManager.setSelectedBlock(blockId);
    editorStateManager.setMaterialBrowserOpen(false);
  };

  const handleMaterialBrowserSearchChange = (query: string) => {
    editorStateManager.setMaterialBrowserSearchQuery(query);
  };

  const handleMaterialBrowserTabChange = (tab: number) => {
    editorStateManager.setMaterialBrowserSelectedTab(tab);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const blockId = event.active.data.current?.blockId;
    if (blockId) {
      const block = blocks.find((b) => b.id === blockId);
      setActiveDragBlock(block ?? null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Clear the active drag block
    setActiveDragBlock(null);

    if (!over) return;

    // Extract block ID from dragged material
    const blockId = active.data.current?.blockId;
    // Extract slot index from drop target
    const slotIndex = over.data.current?.slotIndex;

    if (blockId && typeof slotIndex === 'number') {
      editorStateManager.setQuickSelectSlot(slotIndex, blockId);
    }
  };

  const handleDragCancel = () => {
    setActiveDragBlock(null);
  };

  const matchesSelectedBlock = (id: string | null) => id === selectedBlock;
  const selectedSlotIndex = quickSelectSlots.findIndex(matchesSelectedBlock);

  return (
    <Box sx={{ height: '100%', overflow: 'hidden' }}>
      <Stack direction="column" sx={{ height: '100%' }}>
        {/* Toolbar */}
        <Toolbar
          projectName={project.name}
          layoutMode={layoutMode}
          saveState={saveState}
          onNewProject={handleNewProject}
          onSaveProject={handleSaveProject}
          onOpenProject={handleOpenProject}
          onLayoutModeChange={handleLayoutModeChange}
        />

        {/* Tool Options Bar */}
        <ToolOptionsBar
          paintMode={paintMode}
          paintBehavior={paintBehavior}
          shapeFillMode={shapeFillMode}
          depthConfig={depthConfig}
          onPaintBehaviorChange={handlePaintBehaviorChange}
          onShapeFillModeChange={handleShapeFillModeChange}
          onDepthConfigChange={handleDepthConfigChange}
        />

        {/* Main Canvas Area - Switch between layout modes */}
        <Box sx={{ flex: 1, overflow: 'hidden', height: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {layoutMode === 'tabbed' ? (
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
              onLayerChange={handleLayerChange}
              onViewChange={handleViewChange}
              onTabChange={handleViewTabChange}
              onPaintModeChange={handlePaintModeChange}
              onPaintBehaviorChange={handlePaintBehaviorChange}
              onShapeFillModeChange={handleShapeFillModeChange}
              onDepthConfigChange={handleDepthConfigChange}
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
              onLayerChange={handleLayerChange}
              onPaintModeChange={handlePaintModeChange}
              onPaintBehaviorChange={handlePaintBehaviorChange}
              onShapeFillModeChange={handleShapeFillModeChange}
              onDepthConfigChange={handleDepthConfigChange}
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
          selectedSlotIndex={selectedSlotIndex}
          blocks={blocks}
          onSelectSlot={handleQuickSelectSlot}
          onOpenBrowser={handleOpenMaterialBrowser}
        />

        {/* Material Browser Modal */}
        <MaterialBrowserModal
          isOpen={isMaterialBrowserOpen}
          blocks={blocks}
          selectedBlockId={selectedBlock}
          searchQuery={materialBrowserSearchQuery}
          selectedTab={materialBrowserSelectedTab}
          quickSelectSlots={quickSelectSlots}
          selectedSlotIndex={selectedSlotIndex}
          onClose={handleCloseMaterialBrowser}
          onSelectMaterial={handleSelectMaterial}
          onSearchChange={handleMaterialBrowserSearchChange}
          onTabChange={handleMaterialBrowserTabChange}
          onSelectSlot={handleQuickSelectSlot}
        />

        {/* Drag Overlay - shows visual feedback while dragging */}
        <DragOverlay zIndex={1400} dropAnimation={null}>
          {activeDragBlock && (
            <Box
              sx={{
                width: 60,
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.paper',
                border: 2,
                borderColor: 'primary.main',
                borderRadius: 1,
                boxShadow: 4,
                cursor: 'grabbing',
              }}
            >
              <ColorSwatch color={activeDragBlock.color} size="L" />
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
    withBlockRegistry(
      withEditorState(
        withProjectState(EditorViewComponent)
      )
    )
  )
) as any;
