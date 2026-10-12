import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from "@mui/material";
import {
  Brush,
  FormatColorFill,
  BorderOuter,
  Circle,
  Timeline,
  Anchor,
} from "@mui/icons-material";
import type { PaintMode } from "../types";

import { toolShortcut } from "../core/Shortcuts";

import { ShortcutTooltip } from "./ShortcutTooltip";

interface ToolPanelProps {
  paintMode: PaintMode;
  onPaintModeChange: (mode: PaintMode) => void;
}

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
        <ShortcutTooltip title="Point" shortcut={toolShortcut("point")} placement="right">
          <ToggleButton value="point" aria-label="Point mode">
            <Brush fontSize="small" />
          </ToggleButton>
        </ShortcutTooltip>

        <ShortcutTooltip title="Fill" shortcut={toolShortcut("fill")} placement="right">
          <ToggleButton value="fill" aria-label="Fill mode">
            <FormatColorFill fontSize="small" />
          </ToggleButton>
        </ShortcutTooltip>

        <ShortcutTooltip title="Rectangle" shortcut={toolShortcut("outline")} placement="right">
          <ToggleButton value="outline" aria-label="Outline mode">
            <BorderOuter fontSize="small" />
          </ToggleButton>
        </ShortcutTooltip>

        <ShortcutTooltip title="Circle" shortcut={toolShortcut("circle")} placement="right">
          <ToggleButton value="circle" aria-label="Circle mode">
            <Circle fontSize="small" />
          </ToggleButton>
        </ShortcutTooltip>

        <ShortcutTooltip title="Arch" shortcut={toolShortcut("arch")} placement="right">
          <ToggleButton value="arch" aria-label="Arch mode">
            <Box sx={{ fontSize: "1.2rem", fontWeight: "bold" }}>⌒</Box>
          </ToggleButton>
        </ShortcutTooltip>

        <ShortcutTooltip title="Curve" shortcut={toolShortcut("curve")} placement="right">
          <ToggleButton value="curve" aria-label="Curve mode">
            <Timeline fontSize="small" />
          </ToggleButton>
        </ShortcutTooltip>

        <ShortcutTooltip title="Meta Block" shortcut={toolShortcut("meta")} placement="right">
          <ToggleButton value="meta" aria-label="Meta block mode">
            <Anchor fontSize="small" />
          </ToggleButton>
        </ShortcutTooltip>
      </ToggleButtonGroup>

      <Divider sx={{ my: 1 }} />
    </Box>
  );
}
