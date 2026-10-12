import { Box, Typography } from "@mui/material";
import type { Theme } from "@mui/material";

import type { LayerState } from "../types";

import { Canvas2DView } from "../panels/Canvas2DView";
import { Preview3DView } from "../panels/Preview3DView";
import { BlockOrientationPreview } from "../components/BlockOrientationPreview";

interface QuadLayoutProps {
  activeLayers: LayerState;
}

const primaryInsetGlow = (theme: Theme): string => `inset 0 0 8px ${theme.palette.primary.light}55`;
const errorInsetGlow = (theme: Theme): string => `inset 0 0 8px ${theme.palette.error.light}55`;
const successInsetGlow = (theme: Theme): string => `inset 0 0 8px ${theme.palette.success.light}55`;
const greyInsetGlow = (theme: Theme): string => `inset 0 0 8px ${theme.palette.grey[500]}55`;

export function QuadLayout({
  activeLayers,
}: QuadLayoutProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        height: "100%",
        gap: "1px",
      }}
    >
      <Box
        sx={{
          bgcolor: "grey.50",
          border: 1,
          borderColor: "primary.light",
          borderRadius: 0,
          overflow: "hidden",
          position: "relative",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            boxShadow: primaryInsetGlow,
            pointerEvents: "none",
            zIndex: 5,
          },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 10,
            pointerEvents: "none",
            bgcolor: "rgba(0, 0, 0, 0.5)",
            px: 1,
            py: 0.5,
            borderRadius: 1,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "primary.main",
              fontWeight: "medium",
            }}
          >
            FRONT VIEW
          </Typography>
        </Box>
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 10,
            pointerEvents: "none",
            bgcolor: "rgba(0, 0, 0, 0.5)",
            px: 1,
            py: 0.5,
            borderRadius: 1,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "primary.main",
              fontWeight: "bold",
            }}
          >
            Y: {activeLayers.y}
          </Typography>
        </Box>
        <BlockOrientationPreview viewType="front" />
        <Box sx={{ width: "100%", height: "100%" }}>
          <Canvas2DView
            viewType="front"
          />
        </Box>
      </Box>

      <Box
        sx={{
          bgcolor: "grey.50",
          border: 1,
          borderColor: "error.light",
          borderRadius: 0,
          overflow: "hidden",
          position: "relative",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            boxShadow: errorInsetGlow,
            pointerEvents: "none",
            zIndex: 5,
          },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 10,
            pointerEvents: "none",
            bgcolor: "rgba(0, 0, 0, 0.5)",
            px: 1,
            py: 0.5,
            borderRadius: 1,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "error.main",
              fontWeight: "medium",
            }}
          >
            LEFT VIEW
          </Typography>
        </Box>
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 10,
            pointerEvents: "none",
            bgcolor: "rgba(0, 0, 0, 0.5)",
            px: 1,
            py: 0.5,
            borderRadius: 1,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "error.main",
              fontWeight: "bold",
            }}
          >
            X: {activeLayers.x}
          </Typography>
        </Box>
        <BlockOrientationPreview viewType="left" />
        <Box sx={{ width: "100%", height: "100%" }}>
          <Canvas2DView
            viewType="left"
          />
        </Box>
      </Box>

      <Box
        sx={{
          bgcolor: "grey.50",
          border: 1,
          borderColor: "success.light",
          borderRadius: 0,
          overflow: "hidden",
          position: "relative",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            boxShadow: successInsetGlow,
            pointerEvents: "none",
            zIndex: 5,
          },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 10,
            pointerEvents: "none",
            bgcolor: "rgba(0, 0, 0, 0.5)",
            px: 1,
            py: 0.5,
            borderRadius: 1,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "success.main",
              fontWeight: "medium",
            }}
          >
            TOP VIEW
          </Typography>
        </Box>
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 10,
            pointerEvents: "none",
            bgcolor: "rgba(0, 0, 0, 0.5)",
            px: 1,
            py: 0.5,
            borderRadius: 1,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "success.main",
              fontWeight: "bold",
            }}
          >
            Z: {activeLayers.z}
          </Typography>
        </Box>
        <BlockOrientationPreview viewType="top" />
        <Box sx={{ width: "100%", height: "100%" }}>
          <Canvas2DView
            viewType="top"
          />
        </Box>
      </Box>

      <Box
        sx={{
          bgcolor: "grey.50",
          border: 1,
          borderColor: "grey.500",
          borderRadius: 0,
          overflow: "hidden",
          position: "relative",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            boxShadow: greyInsetGlow,
            pointerEvents: "none",
            zIndex: 5,
          },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 10,
            pointerEvents: "none",
            bgcolor: "rgba(0, 0, 0, 0.5)",
            px: 1,
            py: 0.5,
            borderRadius: 1,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "grey.100",
              fontWeight: "medium",
            }}
          >
            3D PREVIEW
          </Typography>
        </Box>
        <Box sx={{ width: "100%", height: "100%" }}>
          <Preview3DView />
        </Box>
      </Box>
    </Box>
  );
}
