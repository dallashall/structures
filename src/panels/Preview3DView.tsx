import React from 'react';
import { Box } from '@mui/material';
import { Babylon3DController } from '../core/Babylon3DController';

interface Preview3DViewProps {
  width: number;
  height: number;
}

/**
 * Preview3DView - Thin React wrapper for Babylon3DController
 *
 * Pure TypeScript controller handles all BabylonJS rendering and interactions.
 * This component just mounts/unmounts the controller and provides the canvas element.
 *
 * ARCHITECTURAL NOTE:
 * This component is technically an HOC for the native HTML canvas element.
 * It uses React hooks (useEffect, useRef) to manage the lifecycle of the
 * Babylon3DController and sync props to it. This is an accepted exception to
 * the "minimal hooks" rule because:
 * - All business logic lives in the Babylon3DController class
 * - The component only handles React ↔ DOM lifecycle management
 * - It's a bridge between React's declarative props and imperative BabylonJS APIs
 */
export function Preview3DView({ width, height }: Preview3DViewProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const controllerRef = React.useRef<Babylon3DController | null>(null);

  // Create and mount controller
  React.useEffect(() => {
    if (!canvasRef.current) return;

    const controller = new Babylon3DController(canvasRef.current);
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  // Handle resize
  React.useEffect(() => {
    controllerRef.current?.resize(width, height);
  }, [width, height]);

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          display: 'block',
          width: `${width}px`,
          height: `${height}px`,
          boxSizing: 'border-box',
        }}
      />
    </Box>
  );
}
