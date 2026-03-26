import React from "react";
import { Box } from "@mui/material";
import type { ViewType, Project, LayerState } from "../types";
import { Canvas2D } from "../core/canvas2d";

interface Canvas2DViewProps {
  viewType: ViewType;
  project: Project;
  activeLayers: LayerState;
  width: number;
  height: number;
  selectedBlockId: string | null;
}

/**
 * Canvas2DView - Thin React wrapper for Canvas2D
 *
 * Pure TypeScript controller handles all rendering and interactions.
 * This component just mounts/unmounts the controller and provides the canvas element.
 *
 * ARCHITECTURAL NOTE:
 * This component is technically an HOC for the native HTML canvas element.
 * It uses React hooks (useEffect, useRef) to manage the lifecycle of the
 * Canvas2D and sync props to it. This is an accepted exception to
 * the "minimal hooks" rule because:
 * - All business logic lives in the Canvas2D singleton
 * - The component only handles React ↔ DOM lifecycle management
 * - It's a bridge between React's declarative props and imperative canvas APIs
 */
export function Canvas2DView({
  viewType,
  width,
  height,
}: Canvas2DViewProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const controllerRef = React.useRef<Canvas2D | null>(null);

  // Create and mount controller
  React.useEffect(() => {
    if (!canvasRef.current) return;

    const controller = new Canvas2D(canvasRef.current, viewType);
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [viewType]);

  // Handle resize - controller handles all canvas manipulation
  React.useEffect(() => {
    controllerRef.current?.resize(width, height);
  }, [width, height]);

  // Handle view type changes
  React.useEffect(() => {
    controllerRef.current?.setViewType(viewType);
  }, [viewType]);

  return (
    <Box sx={{ width: "100%", height: "100%", bgcolor: "#1a1a1a" }}>
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: `${width}px`,
          height: `${height}px`,
          boxSizing: "border-box",
          imageRendering: "pixelated",
        }}
      />
    </Box>
  );
}
