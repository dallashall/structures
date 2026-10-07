import { Box } from "@mui/material";

import type { ViewType } from "../types";

import { canvas2DMounter } from "../core/canvas2d";

interface Canvas2DViewProps {
  viewType: ViewType;
}

/**
 * Canvas2DView - Canvas element for one 2D view
 *
 * Canvas2D does all rendering and interaction. The canvas fills its container,
 * and Canvas2D follows its size with a ResizeObserver. canvas2DMounter's ref
 * callback creates the Canvas2D on mount and destroys it on unmount. The key
 * remounts the canvas when the view type changes.
 */
export function Canvas2DView({ viewType }: Canvas2DViewProps) {
  return (
    <Box sx={{ width: "100%", height: "100%", bgcolor: "#1a1a1a" }}>
      <Box
        component="canvas"
        key={viewType}
        ref={canvas2DMounter.refFor(viewType)}
        sx={{
          display: "block",
          width: "100%",
          height: "100%",
          imageRendering: "pixelated",
        }}
      />
    </Box>
  );
}
