import React from 'react';
import { Box, Stack, IconButton, Paper, Tab, Button, Typography } from '@mui/material';
import { TabList, TabContext } from '@mui/lab';
import { Apps, Check } from '@mui/icons-material';

import type { ViewType, LayoutMode, PaintMode, PaintBehavior } from '../types';

import { withProjectState, WithProjectStateProps } from '../hocs/withProjectState';
import { withEditorState, WithEditorStateProps } from '../hocs/withEditorState';
import { withBlockRegistry, WithBlockRegistryProps } from '../hocs/withBlockRegistry';
import { withStorageState, WithStorageStateProps } from '../hocs/withStorageState';

import { Toolbar } from '../layouts/Toolbar';
import { LayerControls } from '../components/LayerControls';
import { QuickSelectPalette } from '../components/QuickSelectPalette';
import { FullPaletteMenu } from '../components/FullPaletteMenu';
import { MetaBlockPlacementModal } from '../components/MetaBlockPlacementModal';
import { PaintControls } from '../components/PaintControls';

import { TabbedLayout } from '../layouts/TabbedLayout';
import { QuadLayout } from '../layouts/QuadLayout';

import { projectManager } from '../core/ProjectManager';
import { editorStateManager } from '../core/EditorStateManager';
import { storageManager } from '../core/StorageManager';
import { Canvas2DController } from '../core/canvas2d';

/**
 * EditorView - Main editor container
 *
 * Orchestrates all editor components:
 * - Toolbar with project actions and layout mode selector
 * - Layout-specific rendering (Tabbed or Quad mode)
 * - Layer controls for X/Y/Z dimensions
 * - Bottom actionbar with quick-select palette
 * - Meta block placement modal (if not placed yet)
 *
 * Uses HOCs to subscribe to project, editor state, and block registry.
 * Handles keyboard shortcuts for layer navigation globally.
 */
interface EditorViewProps
  extends WithProjectStateProps,
    WithEditorStateProps,
    WithBlockRegistryProps,
    WithStorageStateProps {}

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
    saveState,
  } = props;

  const [showMetaBlockModal, setShowMetaBlockModal] = React.useState(false);
  const [isPlacementMode, setIsPlacementMode] = React.useState(false);
  const [isActionBarExpanded, setIsActionBarExpanded] = React.useState(true);

  // Check if meta block has been confirmed
  React.useEffect(() => {
    if (project && !projectManager.isMetaBlockConfirmed()) {
      setShowMetaBlockModal(true);
    }
  }, [project]);

  // Handle meta block modal close (enter placement mode)
  const handleMetaBlockModalClose = () => {
    setShowMetaBlockModal(false);
    setIsPlacementMode(true);
  };

  // Handle meta block placed (exit placement mode)
  React.useEffect(() => {
    const handleMetaBlockPlaced = () => {
      setIsPlacementMode(false);
    };

    projectManager.on('metablock:placed', handleMetaBlockPlaced);
    return () => {
      projectManager.off('metablock:placed', handleMetaBlockPlaced);
    };
  }, []);

  // Keyboard shortcuts for layer navigation and meta block confirmation
  React.useEffect(() => {
    if (!project) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const { shiftKey } = event;

      // Confirm meta block placement with Enter
      if (isPlacementMode && key === 'enter') {
        event.preventDefault();
        handleConfirmMetaBlockPlacement();
        return;
      }

      if (key === 'x') {
        event.preventDefault();
        if (shiftKey) {
          editorStateManager.decrementLayer('x');
        } else {
          editorStateManager.incrementLayer('x', project.dimensions.width);
        }
      } else if (key === 'y') {
        event.preventDefault();
        if (shiftKey) {
          editorStateManager.decrementLayer('y');
        } else {
          editorStateManager.incrementLayer('y', project.dimensions.height);
        }
      } else if (key === 'z') {
        event.preventDefault();
        if (shiftKey) {
          editorStateManager.decrementLayer('z');
        } else {
          editorStateManager.incrementLayer('z', project.dimensions.depth);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [project, isPlacementMode]);

  // Handlers
  const handleNewProject = () => {
    // This will be handled by App.tsx
    console.log('New project requested');
  };

  const handleSaveProject = () => {
    if (project) {
      storageManager.exportProject(project);
      // TODO: Trigger download
    }
  };

  const handleOpenProject = () => {
    // This will be handled by App.tsx
    console.log('Open project requested');
  };

  const handleLayoutModeChange = (mode: LayoutMode) => {
    editorStateManager.setLayoutMode(mode);
  };

  const handleLayerChange = (dimension: 'x' | 'y' | 'z', layer: number) => {
    editorStateManager.setActiveLayer(dimension, layer);
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

  const handleViewChange = (key: React.Key) => {
    editorStateManager.setActiveView(key as ViewType);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    handleViewChange(newValue);
  };

  const handleConfirmMetaBlockPlacement = () => {
    Canvas2DController.confirmAllPlacements();
    setIsPlacementMode(false);
  };

  if (!project) {
    return (
      <Box sx={{ p: 4 }}>
        <p>No project loaded</p>
      </Box>
    );
  };

  const selectedSlotIndex = quickSelectSlots.findIndex((id) => id === selectedBlock);

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

        {/* Main Canvas Area with ActionBar */}
        <Box sx={{ flex: 1, overflow: 'hidden', height: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {layoutMode === 'tabbed' ? (
            <TabContext value={activeView}>
              {/* Layer Controls / Tab Bar */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, py: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  {/* Tabs */}
                  <Box sx={{ flex: 1 }}>
                    <TabList onChange={handleTabChange} aria-label="View tabs">
                      <Tab label="Front" value="front" />
                      <Tab label="Back" value="back" />
                      <Tab label="Left" value="left" />
                      <Tab label="Right" value="right" />
                      <Tab label="Top" value="top" />
                      <Tab label="Bottom" value="bottom" />
                      <Tab label="3D Preview" value="3d" />
                    </TabList>
                  </Box>

                  {/* Layer Controls */}
                  <Box>
                    <LayerControls
                      maxDimensions={project.dimensions}
                      activeLayers={activeLayers}
                      onLayerChange={handleLayerChange}
                    />
                  </Box>
                </Stack>
              </Box>

              {/* Canvas Layout */}
              <Box sx={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', position: 'relative' }}>
                <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
                  <TabbedLayout
                    activeView={activeView}
                    onViewChange={handleViewChange}
                    project={project}
                    activeLayers={activeLayers}
                    isPlacementMode={isPlacementMode}
                    selectedBlockId={selectedBlock}
                  />
                </Box>

                {/* Meta Block Placement Confirmation UI */}
                {isPlacementMode && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 24,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 100,
                    }}
                  >
                    <Paper elevation={8} sx={{ p: 2 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="body2">
                          Click to place meta block, then confirm
                        </Typography>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<Check />}
                          size="small"
                          onClick={handleConfirmMetaBlockPlacement}
                        >
                          Confirm (Enter)
                        </Button>
                      </Stack>
                    </Paper>
                  </Box>
                )}

                {/* Expand Button (shown when ActionBar is hidden) */}
                {!isActionBarExpanded && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      right: 16,
                      transform: 'translateY(-50%)',
                      zIndex: 101,
                    }}
                  >
                    <Paper elevation={4}>
                      <IconButton
                        onClick={() => setIsActionBarExpanded(true)}
                        aria-label="Show palette"
                        sx={{
                          width: 48,
                          height: 48,
                        }}
                      >
                        <Apps />
                      </IconButton>
                    </Paper>
                  </Box>
                )}

                {/* Right Sidebar Action Bar */}
                {isActionBarExpanded && (
                  <Paper
                    elevation={8}
                    sx={{
                      width: 'auto',
                      minWidth: 80,
                      display: 'flex',
                      flexDirection: 'column',
                      borderLeft: 1,
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Stack direction="column" spacing={2} sx={{ p: 2, flex: 1 }}>
                      <PaintControls
                        paintMode={paintMode}
                        paintBehavior={paintBehavior}
                        onPaintModeChange={handlePaintModeChange}
                        onPaintBehaviorChange={handlePaintBehaviorChange}
                        orientation="vertical"
                      />
                      <QuickSelectPalette
                        slots={quickSelectSlots}
                        selectedSlotIndex={selectedSlotIndex}
                        blocks={blocks}
                        onSelectSlot={handleQuickSelectSlot}
                        onAssignSlot={handleAssignSlot}
                        orientation="vertical"
                      />
                      <FullPaletteMenu
                        blocks={blocks}
                        selectedBlockId={selectedBlock}
                        onSelectBlock={(blockId: string) => editorStateManager.setSelectedBlock(blockId)}
                      />
                    </Stack>
                    <Box sx={{ borderTop: 1, borderColor: 'divider', p: 1, display: 'flex', justifyContent: 'center' }}>
                      <IconButton
                        onClick={() => setIsActionBarExpanded(false)}
                        size="small"
                        aria-label="Hide palette"
                      >
                        <Apps />
                      </IconButton>
                    </Box>
                  </Paper>
                )}
              </Box>
            </TabContext>
          ) : (
            <>
              {/* Layer Controls / Tab Bar */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, py: 1 }}>
                <Stack direction="row" justifyContent="flex-end" alignItems="center">
                  {/* Layer Controls */}
                  <LayerControls
                    maxDimensions={project.dimensions}
                    activeLayers={activeLayers}
                    onLayerChange={handleLayerChange}
                  />
                </Stack>
              </Box>

              {/* Canvas Layout */}
              <Box sx={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', position: 'relative' }}>
                <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
                  <QuadLayout
                    project={project}
                    activeLayers={activeLayers}
                    isPlacementMode={isPlacementMode}
                    selectedBlockId={selectedBlock}
                  />
                </Box>

                {/* Meta Block Placement Confirmation UI */}
                {isPlacementMode && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 24,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 100,
                    }}
                  >
                    <Paper elevation={8} sx={{ p: 2 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="body2">
                          Click to place meta block, then confirm
                        </Typography>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<Check />}
                          size="small"
                          onClick={handleConfirmMetaBlockPlacement}
                        >
                          Confirm (Enter)
                        </Button>
                      </Stack>
                    </Paper>
                  </Box>
                )}

                {/* Expand Button (shown when ActionBar is hidden) */}
                {!isActionBarExpanded && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      right: 16,
                      transform: 'translateY(-50%)',
                      zIndex: 101,
                    }}
                  >
                    <Paper elevation={4}>
                      <IconButton
                        onClick={() => setIsActionBarExpanded(true)}
                        aria-label="Show palette"
                        sx={{
                          width: 48,
                          height: 48,
                        }}
                      >
                        <Apps />
                      </IconButton>
                    </Paper>
                  </Box>
                )}

                {/* Right Sidebar Action Bar */}
                {isActionBarExpanded && (
                  <Paper
                    elevation={8}
                    sx={{
                      width: 'auto',
                      minWidth: 80,
                      display: 'flex',
                      flexDirection: 'column',
                      borderLeft: 1,
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Stack direction="column" spacing={2} sx={{ p: 2, flex: 1 }}>
                      <PaintControls
                        paintMode={paintMode}
                        paintBehavior={paintBehavior}
                        onPaintModeChange={handlePaintModeChange}
                        onPaintBehaviorChange={handlePaintBehaviorChange}
                        orientation="vertical"
                      />
                      <QuickSelectPalette
                        slots={quickSelectSlots}
                        selectedSlotIndex={selectedSlotIndex}
                        blocks={blocks}
                        onSelectSlot={handleQuickSelectSlot}
                        onAssignSlot={handleAssignSlot}
                        orientation="vertical"
                      />
                      <FullPaletteMenu
                        blocks={blocks}
                        selectedBlockId={selectedBlock}
                        onSelectBlock={(blockId: string) => editorStateManager.setSelectedBlock(blockId)}
                      />
                    </Stack>
                    <Box sx={{ borderTop: 1, borderColor: 'divider', p: 1, display: 'flex', justifyContent: 'center' }}>
                      <IconButton
                        onClick={() => setIsActionBarExpanded(false)}
                        size="small"
                        aria-label="Hide palette"
                      >
                        <Apps />
                      </IconButton>
                    </Box>
                  </Paper>
                )}
              </Box>
            </>
          )}
        </Box>

      </Stack>

      {/* Meta Block Placement Modal */}
      <MetaBlockPlacementModal
        isOpen={showMetaBlockModal}
        onClose={handleMetaBlockModalClose}
      />
    </Box>
  );
}

// Export with HOCs - all props are injected by HOCs
const EditorViewWithHOCs = withStorageState(
  withBlockRegistry(
    withEditorState(withProjectState(EditorViewComponent))
  )
);

// Type assertion to tell TypeScript that all props are injected by HOCs
// Double assertion needed because HOC types don't properly narrow
export const EditorView = EditorViewWithHOCs as unknown as React.ComponentType<Record<string, never>>;
