import { Box, Stack, Divider } from "@mui/material";
import type {
  PaintMode,
  PaintBehavior,
  ShapeFillMode,
  DepthConfig,
} from "../types";
import { ShapeFillModeControl } from "./ShapeFillModeControl";
import { DepthPaintingControl } from "./DepthPaintingControl";
import { PaintBehaviorControl } from "./PaintBehaviorControl";
import { DeleteModeControl } from "./DeleteModeControl";

interface ToolOptionsBarProps {
  paintMode: PaintMode;
  paintBehavior: PaintBehavior;
  shapeFillMode: ShapeFillMode;
  depthConfig: DepthConfig;
  deleteMode: boolean;
  onPaintBehaviorChange: (behavior: PaintBehavior) => void;
  onShapeFillModeChange: (mode: ShapeFillMode) => void;
  onDepthConfigChange: (config: Partial<DepthConfig>) => void;
  onDeleteModeChange: (enabled: boolean) => void;
}

/**
 * ToolOptionsBar - Horizontal options bar for active tool settings
 *
 * Displays below main toolbar, contains tool-specific options:
 * - Shape fill mode (outline/filled) - only for shape tools
 * - Paint behavior (normal/replace/selective) - always visible
 * - Depth painting controls - always visible
 * - Delete mode toggle - always visible
 *
 * Inspired by Adobe Illustrator's horizontal options bar pattern.
 */
export function ToolOptionsBar({
  paintMode,
  paintBehavior,
  shapeFillMode,
  depthConfig,
  deleteMode,
  onPaintBehaviorChange,
  onShapeFillModeChange,
  onDepthConfigChange,
  onDeleteModeChange,
}: ToolOptionsBarProps) {
  const isShapeMode = ["outline", "circle", "arch", "curve"].includes(
    paintMode,
  );

  return (
    <Box
      sx={{
        height: 40,
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        px: 1.5,
        gap: 1,
        overflowX: "auto",
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        divider={<Divider orientation="vertical" flexItem />}
      >
        {/* Shape fill mode - only for shape tools */}
        {isShapeMode && (
          <ShapeFillModeControl
            shapeFillMode={shapeFillMode}
            onShapeFillModeChange={onShapeFillModeChange}
            orientation="horizontal"
          />
        )}

        {/* Paint behavior - always visible */}
        <PaintBehaviorControl
          paintBehavior={paintBehavior}
          onPaintBehaviorChange={onPaintBehaviorChange}
          orientation="horizontal"
        />

        {/* Delete mode - always visible */}
        <DeleteModeControl
          deleteMode={deleteMode}
          onDeleteModeChange={onDeleteModeChange}
          compact
        />

        {/* Depth painting - always visible */}
        <DepthPaintingControl
          depthConfig={depthConfig}
          onDepthConfigChange={onDepthConfigChange}
          compact
        />
      </Stack>
    </Box>
  );
}
