import React from 'react';
import { Tabs, TabList, TabPanels, Item, View, Flex } from '@adobe/react-spectrum';

import type { ViewType, Project, LayerState, Vector3D } from '../types';

import { Canvas2DView } from '../panels/Canvas2DView';
import { projectManager } from '../core/ProjectManager';

interface TabbedLayoutProps {
  activeView: ViewType;
  onViewChange: (key: React.Key) => void;
  project: Project;
  activeLayers: LayerState;
  isPlacementMode: boolean;
  selectedBlockId: string | null;
}

/**
 * TabbedLayout - Single canvas with tab navigation
 *
 * Displays one view at a time with tabs to switch between different
 * orthographic views and 3D preview.
 */
export function TabbedLayout({
  activeView,
  onViewChange,
  project,
  activeLayers,
  selectedBlockId,
}: TabbedLayoutProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = React.useState({ width: 800, height: 600 });

  // Measure container size for canvas dimensions
  React.useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handlers for block placement/removal
  const handleBlockPlaced = React.useCallback((position: Vector3D, blockType: string) => {
    projectManager.setBlock(position, blockType);
  }, []);

  const handleBlockRemoved = React.useCallback((position: Vector3D) => {
    projectManager.removeBlock(position);
  }, []);

  return (
    <Tabs
      selectedKey={activeView}
      onSelectionChange={onViewChange}
      height="100%"
    >
      <TabList>
        <Item key="front">Front</Item>
        <Item key="back">Back</Item>
        <Item key="left">Left</Item>
        <Item key="right">Right</Item>
        <Item key="top">Top</Item>
        <Item key="bottom">Bottom</Item>
        <Item key="3d">3D Preview</Item>
      </TabList>
      <TabPanels>
        {(['front', 'back', 'left', 'right', 'top', 'bottom', '3d'] as const).map((view) => (
          <Item key={view}>
            <View padding="size-200" height="100%" width="100%">
              {view === '3d' ? (
                <View backgroundColor="gray-200" height="100%">
                  <Flex height="100%" alignItems="center" justifyContent="center">
                    <p>3D Preview (Placeholder)</p>
                  </Flex>
                </View>
              ) : (
                <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
                  <Canvas2DView
                    viewType={view}
                    project={project}
                    activeLayers={activeLayers}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    selectedBlockId={selectedBlockId}
                    onBlockPlaced={handleBlockPlaced}
                    onBlockRemoved={handleBlockRemoved}
                  />
                </div>
              )}
            </View>
          </Item>
        ))}
      </TabPanels>
    </Tabs>
  );
}
