import React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { Babylon3D } from "../core/Babylon3D";

// Axis colors that work in dark/light mode
const AXIS_COLORS = {
  x: { main: "#e74c3c", hover: "#c0392b", bg: "rgba(231, 76, 60, 0.1)" },
  y: { main: "#3498db", hover: "#2980b9", bg: "rgba(52, 152, 219, 0.1)" },
  z: { main: "#27ae60", hover: "#229954", bg: "rgba(39, 174, 96, 0.1)" },
};

interface Preview3DViewProps {
  width: number;
  height: number;
}

/**
 * Preview3DView - Thin React wrapper for Babylon3D
 *
 * Pure TypeScript controller handles all BabylonJS rendering and interactions.
 * This component just mounts/unmounts the controller and provides the canvas element.
 *
 * ARCHITECTURAL NOTE:
 * This component is technically an HOC for the native HTML canvas element.
 * It uses React hooks (useEffect, useRef) to manage the lifecycle of the
 * Babylon3D and sync props to it. This is an accepted exception to
 * the "minimal hooks" rule because:
 * - All business logic lives in the Babylon3D class
 * - The component only handles React ↔ DOM lifecycle management
 * - It's a bridge between React's declarative props and imperative BabylonJS APIs
 */
export function Preview3DView({ width, height }: Preview3DViewProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const controllerRef = React.useRef<Babylon3D | null>(null);
  const theme = useTheme();
  const [xVisible, setXVisible] = React.useState(true);
  const [yVisible, setYVisible] = React.useState(true);
  const [zVisible, setZVisible] = React.useState(true);

  // Create and mount controller
  React.useEffect(() => {
    if (!canvasRef.current) return;

    const controller = new Babylon3D(canvasRef.current);
    controllerRef.current = controller;

    // Initialize with async project data
    void controller.init();

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
    controllerRef.current?.setAxisSliceVisible("x", newVisibility);
  };

  const handleToggleY = () => {
    const newVisibility = !yVisible;
    setYVisible(newVisibility);
    controllerRef.current?.setAxisSliceVisible("y", newVisibility);
  };

  const handleToggleZ = () => {
    const newVisibility = !zVisible;
    setZVisible(newVisibility);
    controllerRef.current?.setAxisSliceVisible("z", newVisibility);
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        position: "relative",
        bgcolor: "#1a1a1a",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: `${width}px`,
          height: `${height}px`,
          boxSizing: "border-box",
        }}
      />

      {/* Slice Guides Toggle Buttons */}
      <Box
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 10,
        }}
      >
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ bgcolor: "rgba(0, 0, 0, 0.5)", borderRadius: 1, p: 0.5 }}
        >
          <Tooltip title="Toggle X Slice (Width)">
            <IconButton
              onClick={handleToggleX}
              size="small"
              sx={{
                bgcolor: xVisible ? AXIS_COLORS.x.main : "transparent",
                color: xVisible
                  ? theme.palette.getContrastText(AXIS_COLORS.x.main)
                  : AXIS_COLORS.x.main,
                border: 1,
                borderColor: AXIS_COLORS.x.main,
                "&:hover": {
                  bgcolor: xVisible ? AXIS_COLORS.x.hover : AXIS_COLORS.x.bg,
                },
                minWidth: 24,
                width: 24,
                height: 24,
                fontSize: "0.75rem",
              }}
            >
              <Typography
                variant="caption"
                fontWeight="bold"
                sx={{ fontSize: "0.75rem" }}
              >
                X
              </Typography>
            </IconButton>
          </Tooltip>

          <Tooltip title="Toggle Y Slice (Height)">
            <IconButton
              onClick={handleToggleY}
              size="small"
              sx={{
                bgcolor: yVisible ? AXIS_COLORS.y.main : "transparent",
                color: yVisible
                  ? theme.palette.getContrastText(AXIS_COLORS.y.main)
                  : AXIS_COLORS.y.main,
                border: 1,
                borderColor: AXIS_COLORS.y.main,
                "&:hover": {
                  bgcolor: yVisible ? AXIS_COLORS.y.hover : AXIS_COLORS.y.bg,
                },
                minWidth: 24,
                width: 24,
                height: 24,
                fontSize: "0.75rem",
              }}
            >
              <Typography
                variant="caption"
                fontWeight="bold"
                sx={{ fontSize: "0.75rem" }}
              >
                Y
              </Typography>
            </IconButton>
          </Tooltip>

          <Tooltip title="Toggle Z Slice (Depth)">
            <IconButton
              onClick={handleToggleZ}
              size="small"
              sx={{
                bgcolor: zVisible ? AXIS_COLORS.z.main : "transparent",
                color: zVisible
                  ? theme.palette.getContrastText(AXIS_COLORS.z.main)
                  : AXIS_COLORS.z.main,
                border: 1,
                borderColor: AXIS_COLORS.z.main,
                "&:hover": {
                  bgcolor: zVisible ? AXIS_COLORS.z.hover : AXIS_COLORS.z.bg,
                },
                minWidth: 24,
                width: 24,
                height: 24,
                fontSize: "0.75rem",
              }}
            >
              <Typography
                variant="caption"
                fontWeight="bold"
                sx={{ fontSize: "0.75rem" }}
              >
                Z
              </Typography>
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );
}
