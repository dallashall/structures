import {
  Box,
  IconButton,
  Tooltip,
  Stack,
  Typography,
  useTheme,
  Button,
  alpha,
  darken,
  ButtonGroup,
} from "@mui/material";
import {
  ZoomIn,
  ZoomOut,
  FitScreen,
  RestartAlt,
  Tune,
} from "@mui/icons-material";
import { babylon3d } from "../core/Babylon3D";
import { editorState } from "../core/EditorState";
import { RenderSettingsModal } from "../components/RenderSettingsModal";
import { FrameStatsOverlay } from "../components/FrameStatsOverlay";
import { withEditorState } from "../hocs/withEditorState";

import type { WithEditorStateProps } from "../hocs/withEditorState";
import type { RenderSettings } from "../types";

interface AxisButtonColors {
  main: string;
  hover: string;
  bg: string;
}

const toAxisButtonColors = (main: string): AxisButtonColors => ({
  main,
  hover: darken(main, 0.15),
  bg: alpha(main, 0.15),
});

type Preview3DViewProps = WithEditorStateProps;

/**
 * All Babylon.js work lives in the babylon3d singleton. This component only renders controls and forwards actions.
 */
function Preview3DViewInner({
  sliceGuideVisibility,
  renderSettings,
  renderSettingsModalOpen,
}: Preview3DViewProps) {
  const theme = useTheme();
  const axisColors = {
    x: toAxisButtonColors(theme.palette.axis.x),
    y: toAxisButtonColors(theme.palette.axis.y),
    z: toAxisButtonColors(theme.palette.axis.z),
  };

  const handleToggleX = (): void => { editorState.toggleSliceGuide('x'); };
  const handleToggleY = (): void => { editorState.toggleSliceGuide('y'); };
  const handleToggleZ = (): void => { editorState.toggleSliceGuide('z'); };

  const handleCameraFront = (): void => { babylon3d.setCameraView('front'); };
  const handleCameraBack = (): void => { babylon3d.setCameraView('back'); };
  const handleCameraLeft = (): void => { babylon3d.setCameraView('left'); };
  const handleCameraRight = (): void => { babylon3d.setCameraView('right'); };
  const handleCameraTop = (): void => { babylon3d.setCameraView('top'); };
  const handleCameraBottom = (): void => { babylon3d.setCameraView('bottom'); };
  const handleZoomIn = (): void => { babylon3d.zoomCamera(-2); };
  const handleZoomOut = (): void => { babylon3d.zoomCamera(2); };
  const handleFitModel = (): void => { babylon3d.fitToModel(); };
  const handleResetCamera = (): void => { babylon3d.resetCamera(); };

  const handleOpenSettings = (): void => { editorState.setRenderSettingsModalOpen(true); };
  const handleCloseSettings = (): void => { editorState.setRenderSettingsModalOpen(false); };
  const handleApplySettings = (settings: RenderSettings): void => { editorState.setRenderSettings(settings); };
  const handleResetSettings = (): void => { editorState.resetRenderSettings(); };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        position: "relative",
        bgcolor: "chrome.canvas",
      }}
    >
      {/* babylon3d.mountCanvas attaches on mount and pauses on unmount. The engine follows the canvas size. */}
      <Box
        component="canvas"
        ref={babylon3d.mountCanvas}
        sx={{ display: "block", width: "100%", height: "100%" }}
      />

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
          sx={{ bgcolor: "chrome.overlay", borderRadius: 1, p: 0.5 }}
        >
          <Tooltip title="Render Settings">
            <IconButton
              onClick={handleOpenSettings}
              size="small"
              sx={{
                color: "text.secondary",
                "&:hover": { color: "text.primary", bgcolor: "action.hover" },
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
                bgcolor: sliceGuideVisibility.x ? axisColors.x.main : "transparent",
                color: sliceGuideVisibility.x
                  ? theme.palette.getContrastText(axisColors.x.main)
                  : axisColors.x.main,
                border: 1,
                borderColor: axisColors.x.main,
                "&:hover": {
                  bgcolor: sliceGuideVisibility.x ? axisColors.x.hover : axisColors.x.bg,
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
                sx={{ fontSize: "0.75rem", lineHeight: 1 }}
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
                bgcolor: sliceGuideVisibility.y ? axisColors.y.main : "transparent",
                color: sliceGuideVisibility.y
                  ? theme.palette.getContrastText(axisColors.y.main)
                  : axisColors.y.main,
                border: 1,
                borderColor: axisColors.y.main,
                "&:hover": {
                  bgcolor: sliceGuideVisibility.y ? axisColors.y.hover : axisColors.y.bg,
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
                sx={{ fontSize: "0.75rem", lineHeight: 1 }}
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
                bgcolor: sliceGuideVisibility.z ? axisColors.z.main : "transparent",
                color: sliceGuideVisibility.z
                  ? theme.palette.getContrastText(axisColors.z.main)
                  : axisColors.z.main,
                border: 1,
                borderColor: axisColors.z.main,
                "&:hover": {
                  bgcolor: sliceGuideVisibility.z ? axisColors.z.hover : axisColors.z.bg,
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
                sx={{ fontSize: "0.75rem", lineHeight: 1 }}
              >
                Z
              </Typography>
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Box
        sx={{
          position: "absolute",
          bottom: 8,
          left: 8,
          zIndex: 10,
          bgcolor: "chrome.overlay",
          borderRadius: 1,
          p: 1,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" sx={{ color: "text.secondary", mr: 0.5 }}>
              Camera:
            </Typography>
            <Button size="small" variant="outlined" onClick={handleCameraFront} sx={{ minWidth: 45, fontSize: "0.7rem" }}>
              Front
            </Button>
            <Button size="small" variant="outlined" onClick={handleCameraBack} sx={{ minWidth: 45, fontSize: "0.7rem" }}>
              Back
            </Button>
            <Button size="small" variant="outlined" onClick={handleCameraLeft} sx={{ minWidth: 45, fontSize: "0.7rem" }}>
              Left
            </Button>
            <Button size="small" variant="outlined" onClick={handleCameraRight} sx={{ minWidth: 45, fontSize: "0.7rem" }}>
              Right
            </Button>
            <Button size="small" variant="outlined" onClick={handleCameraTop} sx={{ minWidth: 45, fontSize: "0.7rem" }}>
              Top
            </Button>
            <Button size="small" variant="outlined" onClick={handleCameraBottom} sx={{ minWidth: 45, fontSize: "0.7rem" }}>
              Bottom
            </Button>
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" sx={{ color: "text.secondary", mr: 0.5 }}>
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
              <Tooltip title="Fit Model to View">
                <IconButton onClick={handleFitModel} size="small">
                  <FitScreen fontSize="small" />
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

      {renderSettings.showFrameStats && <FrameStatsOverlay />}

      <RenderSettingsModal
        isOpen={renderSettingsModalOpen}
        settings={renderSettings}
        onClose={handleCloseSettings}
        onApply={handleApplySettings}
        onReset={handleResetSettings}
      />
    </Box>
  );
}

export const Preview3DView = withEditorState(Preview3DViewInner);
