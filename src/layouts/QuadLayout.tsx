import React from "react";
import { Box, Typography } from "@mui/material";

import type { Project, LayerState } from "../types";

import { Canvas2DView } from "../panels/Canvas2DView";
import { Preview3DView } from "../panels/Preview3DView";

interface QuadLayoutProps {
  project: Project;
  activeLayers: LayerState;
  selectedBlockId: string | null;
}

/**
 * QuadLayout - 2x2 grid with 3 2D views + 3D preview
 *
 * Displays four viewports in a grid:
 * - Front view (top-left)
 * - Left view (top-right)
 * - Top view (bottom-left)
 * - 3D Preview (bottom-right)
 */
export function QuadLayout({
  project,
  activeLayers,
  selectedBlockId,
}: QuadLayoutProps) {
  const frontContainerRef = React.useRef<HTMLDivElement>(null);
  const leftContainerRef = React.useRef<HTMLDivElement>(null);
  const topContainerRef = React.useRef<HTMLDivElement>(null);
  const preview3DContainerRef = React.useRef<HTMLDivElement>(null);

  const [canvasSizes, setCanvasSizes] = React.useState({
    front: { width: 400, height: 300 },
    left: { width: 400, height: 300 },
    top: { width: 400, height: 300 },
    preview3D: { width: 400, height: 300 },
  });

  // Measure container sizes for canvas dimensions
  React.useEffect(() => {
    const updateSizes = () => {
      if (frontContainerRef.current) {
        const rect = frontContainerRef.current.getBoundingClientRect();
        setCanvasSizes((prev) => ({
          ...prev,
          front: { width: rect.width, height: rect.height },
        }));
      }
      if (leftContainerRef.current) {
        const rect = leftContainerRef.current.getBoundingClientRect();
        setCanvasSizes((prev) => ({
          ...prev,
          left: { width: rect.width, height: rect.height },
        }));
      }
      if (topContainerRef.current) {
        const rect = topContainerRef.current.getBoundingClientRect();
        setCanvasSizes((prev) => ({
          ...prev,
          top: { width: rect.width, height: rect.height },
        }));
      }
      if (preview3DContainerRef.current) {
        const rect = preview3DContainerRef.current.getBoundingClientRect();
        setCanvasSizes((prev) => ({
          ...prev,
          preview3D: { width: rect.width, height: rect.height },
        }));
      }
    };

    updateSizes();
    window.addEventListener("resize", updateSizes);
    return () => window.removeEventListener("resize", updateSizes);
  }, []);

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
      {/* Front View */}
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
            boxShadow: (theme) =>
              `inset 0 0 8px ${theme.palette.primary.light}55`,
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
        <div ref={frontContainerRef} style={{ width: "100%", height: "100%" }}>
          <Canvas2DView
            viewType="front"
            project={project}
            activeLayers={activeLayers}
            width={canvasSizes.front.width}
            height={canvasSizes.front.height}
            selectedBlockId={selectedBlockId}
          />
        </div>
      </Box>

      {/* Left View */}
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
            boxShadow: (theme) =>
              `inset 0 0 8px ${theme.palette.error.light}55`,
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
        <div ref={leftContainerRef} style={{ width: "100%", height: "100%" }}>
          <Canvas2DView
            viewType="left"
            project={project}
            activeLayers={activeLayers}
            width={canvasSizes.left.width}
            height={canvasSizes.left.height}
            selectedBlockId={selectedBlockId}
          />
        </div>
      </Box>

      {/* Top View */}
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
            boxShadow: (theme) =>
              `inset 0 0 8px ${theme.palette.success.light}55`,
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
        <div ref={topContainerRef} style={{ width: "100%", height: "100%" }}>
          <Canvas2DView
            viewType="top"
            project={project}
            activeLayers={activeLayers}
            width={canvasSizes.top.width}
            height={canvasSizes.top.height}
            selectedBlockId={selectedBlockId}
          />
        </div>
      </Box>

      {/* 3D Preview */}
      <Box
        sx={{
          bgcolor: "grey.50",
          border: 1,
          borderColor: "secondary.light",
          borderRadius: 0,
          overflow: "hidden",
          position: "relative",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            boxShadow: (theme) =>
              `inset 0 0 8px ${theme.palette.secondary.light}55`,
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
              color: "secondary.main",
              fontWeight: "medium",
            }}
          >
            3D PREVIEW
          </Typography>
        </Box>
        <div
          ref={preview3DContainerRef}
          style={{ width: "100%", height: "100%" }}
        >
          <Preview3DView
            width={canvasSizes.preview3D.width}
            height={canvasSizes.preview3D.height}
            isVisible={true}
          />
        </div>
      </Box>
    </Box>
  );
}
