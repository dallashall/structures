import { Box, Stack, Divider } from "@mui/material";
import type {
  PaintMode,
  PaintBehavior,
  ShapeFillMode,
  DepthConfig,
  Dimensions,
  LayerState,
  HeldModifiers,
} from "../types";
import { MODIFIER_HINTS } from "../config/modifierHints";
import { ShapeFillModeControl } from "./ShapeFillModeControl";
import { DepthPaintingControl } from "./DepthPaintingControl";
import { PaintBehaviorControl } from "./PaintBehaviorControl";
import { LayerControls } from "./LayerControls";
import { ModifierHints } from "./ModifierHints";

interface ToolOptionsBarProps {
  paintMode: PaintMode;
  paintBehavior: PaintBehavior;
  shapeFillMode: ShapeFillMode;
  depthConfig: DepthConfig;
  maxDimensions: Dimensions;
  activeLayers: LayerState;
  heldModifiers: HeldModifiers;
  onPaintBehaviorChange: (behavior: PaintBehavior) => void;
  onShapeFillModeChange: (mode: ShapeFillMode) => void;
  onDepthConfigChange: (config: Partial<DepthConfig>) => void;
  onLayerChange: (dimension: 'x' | 'y' | 'z', layer: number) => void;
}

export function ToolOptionsBar({
  paintMode,
  paintBehavior,
  shapeFillMode,
  depthConfig,
  maxDimensions,
  activeLayers,
  heldModifiers,
  onPaintBehaviorChange,
  onShapeFillModeChange,
  onDepthConfigChange,
  onLayerChange,
}: ToolOptionsBarProps) {
  const isShapeMode = ["outline", "circle", "arch", "curve"].includes(
    paintMode,
  );
  const modifierHints = MODIFIER_HINTS[paintMode];

  return (
    <Box
      sx={{
        height: 40,
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 1.5,
        gap: 1,
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        divider={<Divider orientation="vertical" flexItem />}
        sx={{ overflow: "hidden" }}
      >
        {isShapeMode && (
          <ShapeFillModeControl
            shapeFillMode={shapeFillMode}
            onShapeFillModeChange={onShapeFillModeChange}
            orientation="horizontal"
          />
        )}

        <DepthPaintingControl
          depthConfig={depthConfig}
          onDepthConfigChange={onDepthConfigChange}
          compact
        />

        <PaintBehaviorControl
          paintBehavior={paintBehavior}
          onPaintBehaviorChange={onPaintBehaviorChange}
          orientation="horizontal"
        />

        {modifierHints && (
          <ModifierHints hints={modifierHints} heldModifiers={heldModifiers} />
        )}
      </Stack>

      <LayerControls
        maxDimensions={maxDimensions}
        activeLayers={activeLayers}
        onLayerChange={onLayerChange}
      />
    </Box>
  );
}
