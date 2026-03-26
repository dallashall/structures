import React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Stack,
  Typography,
  useTheme,
  Button,
  ButtonGroup,
} from "@mui/material";
import {
  ZoomIn,
  ZoomOut,
  RestartAlt,
  Tune,
} from "@mui/icons-material";
import { Babylon3D } from "../core/Babylon3D";
import { editorState } from "../core/EditorState";
import { RenderSettingsModal } from "../components/RenderSettingsModal";

import type { RenderSettings } from "../types";

// Axis colors that work in dark/light mode
const AXIS_COLORS = {
  x: { main: "#e74c3c", hover: "#c0392b", bg: "rgba(231, 76, 60, 0.1)" },
  y: { main: "#3498db", hover: "#2980b9", bg: "rgba(52, 152, 219, 0.1)" },
  z: { main: "#27ae60", hover: "#229954", bg: "rgba(39, 174, 96, 0.1)" },
};

interface Preview3DViewProps {
  width: number;
  height: number;
  isVisible?: boolean;
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
export function Preview3DView({ width, height, isVisible }: Preview3DViewProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const controllerRef = React.useRef<Babylon3D | null>(null);
  const theme = useTheme();

  // Render cache for slice guide visibility (source of truth is EditorState)
  const [sliceGuideVisibility, setSliceGuideVisibility] = React.useState(
    editorState.getSliceGuideVisibility()
  );

  // Render settings state
  const [renderSettingsOpen, setRenderSettingsOpen] = React.useState(false);
  const [renderSettings, setRenderSettings] = React.useState<RenderSettings>(
    editorState.getRenderSettings()
  );

  // Create and mount controller
  React.useEffect(() => {
    if (!canvasRef.current) return;

    const controller = new Babylon3D(canvasRef.current);
    controllerRef.current = controller;

    // Expose controller to window for programmatic control
    (window as any).babylon3d = controller;

    // Initialize with async project data
    void controller.init();

    return () => {
      controller.destroy();
      controllerRef.current = null;
      delete (window as any).babylon3d;
    };
  }, []);

  // Pause/resume render loop based on visibility
  React.useEffect(() => {
    if (!controllerRef.current) return;
    if (isVisible === false) {
      controllerRef.current.pause();
    } else {
      controllerRef.current.resume();
    }
  }, [isVisible]);

  // Handle resize
  React.useEffect(() => {
    controllerRef.current?.resize(width, height);
  }, [width, height]);

  // Subscribe to slice guide visibility changes for button styling
  React.useEffect(() => {
    const handleSliceGuideToggled = () => {
      setSliceGuideVisibility(editorState.getSliceGuideVisibility());
    };
    editorState.on('sliceguide:axis:toggled', handleSliceGuideToggled);
    return () => {
      editorState.off('sliceguide:axis:toggled', handleSliceGuideToggled);
    };
  }, []);

  // Subscribe to render settings changes
  React.useEffect(() => {
    const handleRenderSettingsApplied = (settings: RenderSettings) => {
      setRenderSettings(settings);
    };
    editorState.on('rendersettings:applied', handleRenderSettingsApplied);
    return () => {
      editorState.off('rendersettings:applied', handleRenderSettingsApplied);
    };
  }, []);

  // Handle axis visibility toggles via EditorState
  const handleToggleX = () => { editorState.toggleSliceGuide('x'); };
  const handleToggleY = () => { editorState.toggleSliceGuide('y'); };
  const handleToggleZ = () => { editorState.toggleSliceGuide('z'); };

  // Handle camera controls
  const handleCameraView = (view: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom') => {
    controllerRef.current?.setCameraView(view);
  };

  const handleZoomIn = () => {
    controllerRef.current?.zoomCamera(-2);
  };

  const handleZoomOut = () => {
    controllerRef.current?.zoomCamera(2);
  };

  const handleResetCamera = () => {
    controllerRef.current?.resetCamera();
  };

  // Render settings handlers
  const handleOpenSettings = () => { setRenderSettingsOpen(true); };
  const handleCloseSettings = () => { setRenderSettingsOpen(false); };
  const handleApplySettings = (settings: RenderSettings) => { editorState.setRenderSettings(settings); };
  const handleResetSettings = () => { editorState.resetRenderSettings(); };

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

      {/* Slice Guides Toggle Buttons + Settings */}
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
          <Tooltip title="Render Settings">
            <IconButton
              onClick={handleOpenSettings}
              size="small"
              sx={{
                color: "#aaa",
                "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.1)" },
                minWidth: 24,
                width: 24,
                height: 24,
              }}
            >
              <Tune sx={{ fontSize: "1rem" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Toggle X Slice (Width)">
            <IconButton
              onClick={handleToggleX}
              size="small"
              sx={{
                bgcolor: sliceGuideVisibility.x ? AXIS_COLORS.x.main : "transparent",
                color: sliceGuideVisibility.x
                  ? theme.palette.getContrastText(AXIS_COLORS.x.main)
                  : AXIS_COLORS.x.main,
                border: 1,
                borderColor: AXIS_COLORS.x.main,
                "&:hover": {
                  bgcolor: sliceGuideVisibility.x ? AXIS_COLORS.x.hover : AXIS_COLORS.x.bg,
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
                bgcolor: sliceGuideVisibility.y ? AXIS_COLORS.y.main : "transparent",
                color: sliceGuideVisibility.y
                  ? theme.palette.getContrastText(AXIS_COLORS.y.main)
                  : AXIS_COLORS.y.main,
                border: 1,
                borderColor: AXIS_COLORS.y.main,
                "&:hover": {
                  bgcolor: sliceGuideVisibility.y ? AXIS_COLORS.y.hover : AXIS_COLORS.y.bg,
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
                bgcolor: sliceGuideVisibility.z ? AXIS_COLORS.z.main : "transparent",
                color: sliceGuideVisibility.z
                  ? theme.palette.getContrastText(AXIS_COLORS.z.main)
                  : AXIS_COLORS.z.main,
                border: 1,
                borderColor: AXIS_COLORS.z.main,
                "&:hover": {
                  bgcolor: sliceGuideVisibility.z ? AXIS_COLORS.z.hover : AXIS_COLORS.z.bg,
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

      {/* Camera and Zoom Controls - Consolidated Horizontal Bar */}
      <Box
        sx={{
          position: "absolute",
          bottom: 8,
          left: 8,
          zIndex: 10,
          bgcolor: "rgba(0, 0, 0, 0.7)",
          borderRadius: 1,
          p: 1,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Camera View Section */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" sx={{ color: "#aaa", mr: 0.5 }}>
              Camera:
            </Typography>
            <Button size="small" variant="outlined" onClick={() => handleCameraView('front')} sx={{ minWidth: 45, fontSize: "0.7rem" }}>
              Front
            </Button>
            <Button size="small" variant="outlined" onClick={() => handleCameraView('back')} sx={{ minWidth: 45, fontSize: "0.7rem" }}>
              Back
            </Button>
            <Button size="small" variant="outlined" onClick={() => handleCameraView('left')} sx={{ minWidth: 45, fontSize: "0.7rem" }}>
              Left
            </Button>
            <Button size="small" variant="outlined" onClick={() => handleCameraView('right')} sx={{ minWidth: 45, fontSize: "0.7rem" }}>
              Right
            </Button>
            <Button size="small" variant="outlined" onClick={() => handleCameraView('top')} sx={{ minWidth: 45, fontSize: "0.7rem" }}>
              Top
            </Button>
            <Button size="small" variant="outlined" onClick={() => handleCameraView('bottom')} sx={{ minWidth: 45, fontSize: "0.7rem" }}>
              Bottom
            </Button>
          </Stack>

          {/* Zoom Section */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" sx={{ color: "#aaa", mr: 0.5 }}>
              Zoom:
            </Typography>
            <ButtonGroup size="small" variant="outlined">
              <Tooltip title="Zoom In">
                <IconButton onClick={handleZoomIn} size="small">
                  <ZoomIn fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Zoom Out">
                <IconButton onClick={handleZoomOut} size="small">
                  <ZoomOut fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset Camera">
                <IconButton onClick={handleResetCamera} size="small">
                  <RestartAlt fontSize="small" />
                </IconButton>
              </Tooltip>
            </ButtonGroup>
          </Stack>
        </Stack>
      </Box>

      {/* Render Settings Modal */}
      <RenderSettingsModal
        isOpen={renderSettingsOpen}
        settings={renderSettings}
        onClose={handleCloseSettings}
        onApply={handleApplySettings}
        onReset={handleResetSettings}
      />
    </Box>
  );
}
