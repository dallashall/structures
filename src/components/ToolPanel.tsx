import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  Brush,
  FormatColorFill,
  BorderOuter,
  Circle,
  Timeline,
} from "@mui/icons-material";
import type { PaintMode } from "../types";

interface ToolPanelProps {
  paintMode: PaintMode;
  onPaintModeChange: (mode: PaintMode) => void;
}

/**
 * ToolPanel - Dense icon-based tool selector
 *
 * Compact 2-column grid of tool icons inspired by Adobe Illustrator and Blender.
 * 100px width, scrollable, with keyboard shortcut hints in tooltips.
 */
export function ToolPanel({ paintMode, onPaintModeChange }: ToolPanelProps) {
  const handleModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: PaintMode | null,
  ) => {
    if (newMode !== null) {
      onPaintModeChange(newMode);
    }
  };

  return (
    <Box
      sx={{
        width: 100,
        height: "100%",
        bgcolor: "background.paper",
        borderRight: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        py: 1,
      }}
    >
      {/* Paint Tools Section */}
      <ToggleButtonGroup
        value={paintMode}
        exclusive
        onChange={handleModeChange}
        orientation="vertical"
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0.5,
          px: 0.5,
          "& .MuiToggleButton-root": {
            width: 40,
            height: 40,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            "&.Mui-selected": {
              bgcolor: "primary.main",
              color: "primary.contrastText",
              borderColor: "primary.main",
            },
          },
        }}
      >
        <Tooltip title="Point (B)" placement="right">
          <ToggleButton value="point" aria-label="Point mode">
            <Brush fontSize="small" />
          </ToggleButton>
        </Tooltip>

        <Tooltip title="Fill" placement="right">
          <ToggleButton value="fill" aria-label="Fill mode">
            <FormatColorFill fontSize="small" />
          </ToggleButton>
        </Tooltip>

        <Tooltip title="Rectangle (R)" placement="right">
          <ToggleButton value="outline" aria-label="Outline mode">
            <BorderOuter fontSize="small" />
          </ToggleButton>
        </Tooltip>

        <Tooltip title="Circle (O)" placement="right">
          <ToggleButton value="circle" aria-label="Circle mode">
            <Circle fontSize="small" />
          </ToggleButton>
        </Tooltip>

        <Tooltip title="Arch (G)" placement="right">
          <ToggleButton value="arch" aria-label="Arch mode">
            <Box sx={{ fontSize: "1.2rem", fontWeight: "bold" }}>⌒</Box>
          </ToggleButton>
        </Tooltip>

        <Tooltip title="Curve (V)" placement="right">
          <ToggleButton value="curve" aria-label="Curve mode">
            <Timeline fontSize="small" />
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>

      <Divider sx={{ my: 1 }} />
    </Box>
  );
}
