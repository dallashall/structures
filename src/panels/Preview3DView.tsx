import React from 'react';
import { Box, IconButton, Tooltip, Stack, Typography } from '@mui/material';
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
  const [xVisible, setXVisible] = React.useState(true);
  const [yVisible, setYVisible] = React.useState(true);
  const [zVisible, setZVisible] = React.useState(true);

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

  // Handle axis visibility toggles
  const handleToggleX = () => {
    const newVisibility = !xVisible;
    setXVisible(newVisibility);
    controllerRef.current?.setAxisSliceVisible('x', newVisibility);
  };

  const handleToggleY = () => {
    const newVisibility = !yVisible;
    setYVisible(newVisibility);
    controllerRef.current?.setAxisSliceVisible('y', newVisibility);
  };

  const handleToggleZ = () => {
    const newVisibility = !zVisible;
    setZVisible(newVisibility);
    controllerRef.current?.setAxisSliceVisible('z', newVisibility);
  };

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

      {/* Slice Guides Toggle Buttons */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
        }}
      >
        <Stack direction="row" spacing={0.5} sx={{ bgcolor: 'background.paper', borderRadius: 1, p: 0.5, boxShadow: 2 }}>
          <Tooltip title="Toggle X Slice (Width)">
            <IconButton
              onClick={handleToggleX}
              size="small"
              sx={{
                bgcolor: xVisible ? '#e74c3c' : 'transparent',
                color: xVisible ? '#fff' : '#e74c3c',
                border: 1,
                borderColor: '#e74c3c',
                '&:hover': {
                  bgcolor: xVisible ? '#c0392b' : 'rgba(231, 76, 60, 0.1)',
                },
                minWidth: 32,
                width: 32,
                height: 32,
              }}
            >
              <Typography variant="caption" fontWeight="bold">X</Typography>
            </IconButton>
          </Tooltip>

          <Tooltip title="Toggle Y Slice (Height)">
            <IconButton
              onClick={handleToggleY}
              size="small"
              sx={{
                bgcolor: yVisible ? '#3498db' : 'transparent',
                color: yVisible ? '#fff' : '#3498db',
                border: 1,
                borderColor: '#3498db',
                '&:hover': {
                  bgcolor: yVisible ? '#2980b9' : 'rgba(52, 152, 219, 0.1)',
                },
                minWidth: 32,
                width: 32,
                height: 32,
              }}
            >
              <Typography variant="caption" fontWeight="bold">Y</Typography>
            </IconButton>
          </Tooltip>

          <Tooltip title="Toggle Z Slice (Depth)">
            <IconButton
              onClick={handleToggleZ}
              size="small"
              sx={{
                bgcolor: zVisible ? '#27ae60' : 'transparent',
                color: zVisible ? '#fff' : '#27ae60',
                border: 1,
                borderColor: '#27ae60',
                '&:hover': {
                  bgcolor: zVisible ? '#229954' : 'rgba(39, 174, 96, 0.1)',
                },
                minWidth: 32,
                width: 32,
                height: 32,
              }}
            >
              <Typography variant="caption" fontWeight="bold">Z</Typography>
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );
}
