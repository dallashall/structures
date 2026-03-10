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

interface ToolOptionsBarProps {
  paintMode: PaintMode;
  paintBehavior: PaintBehavior;
  shapeFillMode: ShapeFillMode;
  depthConfig: DepthConfig;
  onPaintBehaviorChange: (behavior: PaintBehavior) => void;
  onShapeFillModeChange: (mode: ShapeFillMode) => void;
  onDepthConfigChange: (config: Partial<DepthConfig>) => void;
}

/**
 * ToolOptionsBar - Horizontal options bar for active tool settings
 *
 * Displays below main toolbar, contains tool-specific options (left to right):
 * 1. Shape fill mode (outline/filled) - only for shape tools
 * 2. Depth painting (thickness slider + through/until-collision mode) - always visible
 * 3. Paint behavior (normal/replace/selective/delete) - always visible
 *
 * Hierarchy: Tool → Shape → Depth → Behavior
 * Inspired by Adobe Illustrator's horizontal options bar pattern.
 */
export function ToolOptionsBar({
  paintMode,
  paintBehavior,
  shapeFillMode,
  depthConfig,
  onPaintBehaviorChange,
  onShapeFillModeChange,
  onDepthConfigChange,
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
        {/* 1. Shape fill mode - only for shape tools */}
        {isShapeMode && (
          <ShapeFillModeControl
            shapeFillMode={shapeFillMode}
            onShapeFillModeChange={onShapeFillModeChange}
            orientation="horizontal"
          />
        )}

        {/* 2. Depth painting (thickness + mode) - always visible */}
        <DepthPaintingControl
          depthConfig={depthConfig}
          onDepthConfigChange={onDepthConfigChange}
          compact
        />

        {/* 3. Paint behavior (includes delete) - always visible */}
        <PaintBehaviorControl
          paintBehavior={paintBehavior}
          onPaintBehaviorChange={onPaintBehaviorChange}
          orientation="horizontal"
        />
      </Stack>
    </Box>
  );
}
