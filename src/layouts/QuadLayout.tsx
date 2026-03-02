import React from 'react';
import { Grid, View } from '@adobe/react-spectrum';

import type { Project, LayerState, Vector3D } from '../types';

import { Canvas2DView } from '../panels/Canvas2DView';
import { projectManager } from '../core/ProjectManager';

interface QuadLayoutProps {
  project: Project;
  activeLayers: LayerState;
  isPlacementMode: boolean;
  selectedBlockId: string | null;
}

/**
 * QuadLayout - 2x2 grid with 3 2D views + 3D preview
 *
 * Displays four viewports in a grid:
 * - Front view (top-left)
 * - Left view (top-right)
 * - Top view (bottom-left)
 * - 3D Preview (bottom-right)
 */
export function QuadLayout({
  project,
  activeLayers,
  selectedBlockId,
}: QuadLayoutProps) {
  const frontContainerRef = React.useRef<HTMLDivElement>(null);
  const leftContainerRef = React.useRef<HTMLDivElement>(null);
  const topContainerRef = React.useRef<HTMLDivElement>(null);

  const [canvasSizes, setCanvasSizes] = React.useState({
    front: { width: 400, height: 300 },
    left: { width: 400, height: 300 },
    top: { width: 400, height: 300 },
  });

  // Measure container sizes for canvas dimensions
  React.useEffect(() => {
    const updateSizes = () => {
      if (frontContainerRef.current) {
        const rect = frontContainerRef.current.getBoundingClientRect();
        setCanvasSizes((prev) => ({
          ...prev,
          front: { width: rect.width, height: rect.height },
        }));
      }
      if (leftContainerRef.current) {
        const rect = leftContainerRef.current.getBoundingClientRect();
        setCanvasSizes((prev) => ({
          ...prev,
          left: { width: rect.width, height: rect.height },
        }));
      }
      if (topContainerRef.current) {
        const rect = topContainerRef.current.getBoundingClientRect();
        setCanvasSizes((prev) => ({
          ...prev,
          top: { width: rect.width, height: rect.height },
        }));
      }
    };

    updateSizes();
    window.addEventListener('resize', updateSizes);
    return () => window.removeEventListener('resize', updateSizes);
  }, []);

  // Handlers for block placement/removal (shared across all views)
  const handleBlockPlaced = React.useCallback((position: Vector3D, blockType: string) => {
    projectManager.setBlock(position, blockType);
  }, []);

  const handleBlockRemoved = React.useCallback((position: Vector3D) => {
    projectManager.removeBlock(position);
  }, []);

  return (
    <Grid
      columns={['1fr', '1fr']}
      rows={['1fr', '1fr']}
      height="100%"
      gap="size-100"
    >
      <View backgroundColor="gray-100" padding="size-200">
        <div ref={frontContainerRef} style={{ width: '100%', height: '100%' }}>
          <Canvas2DView
            viewType="front"
            project={project}
            activeLayers={activeLayers}
            width={canvasSizes.front.width}
            height={canvasSizes.front.height}
            selectedBlockId={selectedBlockId}
            onBlockPlaced={handleBlockPlaced}
            onBlockRemoved={handleBlockRemoved}
          />
        </div>
      </View>
      <View backgroundColor="gray-100" padding="size-200">
        <div ref={leftContainerRef} style={{ width: '100%', height: '100%' }}>
          <Canvas2DView
            viewType="left"
            project={project}
            activeLayers={activeLayers}
            width={canvasSizes.left.width}
            height={canvasSizes.left.height}
            selectedBlockId={selectedBlockId}
            onBlockPlaced={handleBlockPlaced}
            onBlockRemoved={handleBlockRemoved}
          />
        </div>
      </View>
      <View backgroundColor="gray-100" padding="size-200">
        <div ref={topContainerRef} style={{ width: '100%', height: '100%' }}>
          <Canvas2DView
            viewType="top"
            project={project}
            activeLayers={activeLayers}
            width={canvasSizes.top.width}
            height={canvasSizes.top.height}
            selectedBlockId={selectedBlockId}
            onBlockPlaced={handleBlockPlaced}
            onBlockRemoved={handleBlockRemoved}
          />
        </div>
      </View>
      <View backgroundColor="gray-200" padding="size-200">
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>3D Preview (Placeholder)</p>
        </div>
      </View>
    </Grid>
  );
}
