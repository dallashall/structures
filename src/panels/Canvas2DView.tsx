import React from 'react';
import { View } from '@adobe/react-spectrum';
import type { ViewType, Project, LayerState, Vector3D } from '../types';
import { Canvas2DController } from '../core/Canvas2DController';

interface Canvas2DViewProps {
  viewType: ViewType;
  project: Project;
  activeLayers: LayerState;
  width: number;
  height: number;
  selectedBlockId: string | null;
  onBlockPlaced: (position: Vector3D, blockType: string) => void;
  onBlockRemoved: (position: Vector3D) => void;
}

/**
 * Canvas2DView - Thin React wrapper for Canvas2DController
 *
 * Pure TypeScript controller handles all rendering and interactions.
 * This component just mounts/unmounts the controller and provides the canvas element.
 */
export function Canvas2DView({
  viewType,
  width,
  height,
}: Canvas2DViewProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const controllerRef = React.useRef<Canvas2DController | null>(null);

  // Create and mount controller
  React.useEffect(() => {
    if (!canvasRef.current) return;

    const controller = new Canvas2DController(canvasRef.current, viewType);
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [viewType]);

  // Handle resize
  React.useEffect(() => {
    controllerRef.current?.resize(width, height);
  }, [width, height]);

  // Handle view type changes
  React.useEffect(() => {
    controllerRef.current?.setViewType(viewType);
  }, [viewType]);

  return (
    <View width="100%" height="100%">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          display: 'block',
          width: `${width}px`,
          height: `${height}px`
        }}
      />
    </View>
  );
}
