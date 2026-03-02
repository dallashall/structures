import React from 'react';
import { View, Flex } from '@adobe/react-spectrum';

import type { ViewType, LayoutMode } from '../types';

import { withProjectState, WithProjectStateProps } from '../hocs/withProjectState';
import { withEditorState, WithEditorStateProps } from '../hocs/withEditorState';
import { withBlockRegistry, WithBlockRegistryProps } from '../hocs/withBlockRegistry';

import { Toolbar } from '../layouts/Toolbar';
import { LayerControls } from '../components/LayerControls';
import { QuickSelectPalette } from '../components/QuickSelectPalette';
import { FullPaletteMenu } from '../components/FullPaletteMenu';
import { MetaBlockPlacementModal } from '../components/MetaBlockPlacementModal';

import { TabbedLayout } from '../layouts/TabbedLayout';
import { QuadLayout } from '../layouts/QuadLayout';

import { projectManager } from '../core/ProjectManager';
import { editorStateManager } from '../core/EditorStateManager';
import { storageManager } from '../core/StorageManager';

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
    WithBlockRegistryProps {}

function EditorViewComponent(props: EditorViewProps) {
  const {
    project,
    layoutMode,
    activeView,
    activeLayers,
    blocks,
    quickSelectSlots,
    selectedBlock,
  } = props;

  const [showMetaBlockModal, setShowMetaBlockModal] = React.useState(false);
  const [isPlacementMode, setIsPlacementMode] = React.useState(false);

  // Check if meta block has been placed
  React.useEffect(() => {
    if (project && !projectManager.isMetaBlockPlaced()) {
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

  // Keyboard shortcuts for layer navigation
  React.useEffect(() => {
    if (!project) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const { shiftKey } = event;

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
  }, [project]);

  // Auto-save on project changes
  React.useEffect(() => {
    if (project) {
      storageManager.autoSave(project);
    }
  }, [project]);

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

  const handleViewChange = (key: React.Key) => {
    editorStateManager.setActiveView(key as ViewType);
  };

  if (!project) {
    return (
      <View padding="size-400">
        <p>No project loaded</p>
      </View>
    );
  }

  const selectedSlotIndex = quickSelectSlots.findIndex((id) => id === selectedBlock);

  return (
    <View height="100%" overflow="hidden">
      <Flex direction="column" height="100%">
        {/* Toolbar */}
        <Toolbar
          projectName={project.name}
          layoutMode={layoutMode}
          onNewProject={handleNewProject}
          onSaveProject={handleSaveProject}
          onOpenProject={handleOpenProject}
          onLayoutModeChange={handleLayoutModeChange}
        />

        {/* Layer Controls */}
        <View padding="size-200">
          <Flex direction="row" justifyContent="end">
            <LayerControls
              maxDimensions={project.dimensions}
              activeLayers={activeLayers}
              onLayerChange={handleLayerChange}
            />
          </Flex>
        </View>

        {/* Main Canvas Area */}
        <View flex={1} overflow="hidden">
          {layoutMode === 'tabbed' ? (
            <TabbedLayout
              activeView={activeView}
              onViewChange={handleViewChange}
              project={project}
              activeLayers={activeLayers}
              isPlacementMode={isPlacementMode}
              selectedBlockId={selectedBlock}
            />
          ) : (
            <QuadLayout
              project={project}
              activeLayers={activeLayers}
              isPlacementMode={isPlacementMode}
              selectedBlockId={selectedBlock}
            />
          )}
        </View>

        {/* Bottom Actionbar */}
        <View padding="size-200" borderTopWidth="thick">
          <Flex
            direction={{ base: 'column', M: 'row' }}
            gap="size-200"
            justifyContent="center"
            alignItems="center"
            wrap
          >
            <QuickSelectPalette
              slots={quickSelectSlots}
              selectedSlotIndex={selectedSlotIndex}
              blocks={blocks}
              onSelectSlot={handleQuickSelectSlot}
            />
            <FullPaletteMenu
              blocks={blocks}
              onSelectBlock={(blockId: string) => editorStateManager.setSelectedBlock(blockId)}
            />
          </Flex>
        </View>
      </Flex>

      {/* Meta Block Placement Modal */}
      <MetaBlockPlacementModal
        isOpen={showMetaBlockModal}
        onClose={handleMetaBlockModalClose}
      />
    </View>
  );
}

// Export with HOCs - all props are injected by HOCs
const EditorViewWithHOCs = withBlockRegistry(
  withEditorState(withProjectState(EditorViewComponent))
);

// Type assertion to tell TypeScript that all props are injected by HOCs
// Double assertion needed because HOC types don't properly narrow
export const EditorView = EditorViewWithHOCs as unknown as React.ComponentType<Record<string, never>>;
