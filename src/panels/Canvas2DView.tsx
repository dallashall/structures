import React from "react";
import { Box } from "@mui/material";
import type { ViewType, Project, LayerState, Vector3D } from "../types";
import { Canvas2DController } from "../core/canvas2d";

interface Canvas2DViewProps {
  viewType: ViewType;
  project: Project;
  activeLayers: LayerState;
  width: number;
  height: number;
  selectedBlockId: string | null;
  isPlacementMode: boolean;
  onBlockPlaced: (position: Vector3D, blockType: string) => void;
  onBlockRemoved: (position: Vector3D) => void;
}

/**
 * Canvas2DView - Thin React wrapper for Canvas2DController
 *
 * Pure TypeScript controller handles all rendering and interactions.
 * This component just mounts/unmounts the controller and provides the canvas element.
 *
 * ARCHITECTURAL NOTE:
 * This component is technically an HOC for the native HTML canvas element.
 * It uses React hooks (useEffect, useRef) to manage the lifecycle of the
 * Canvas2DController and sync props to it. This is an accepted exception to
 * the "minimal hooks" rule because:
 * - All business logic lives in the Canvas2DController singleton
 * - The component only handles React ↔ DOM lifecycle management
 * - It's a bridge between React's declarative props and imperative canvas APIs
 */
export function Canvas2DView({
  viewType,
  width,
  height,
  isPlacementMode,
}: Canvas2DViewProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const controllerRef = React.useRef<Canvas2DController | null>(null);

  // Create and mount controller
  React.useEffect(() => {
    if (!canvasRef.current) return;

    const controller = new Canvas2DController(canvasRef.current, viewType);
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [viewType]);

  // Handle resize
  React.useEffect(() => {
    controllerRef.current?.resize(width, height);
  }, [width, height]);

  // Handle view type changes
  React.useEffect(() => {
    controllerRef.current?.setViewType(viewType);
  }, [viewType]);

  // Handle placement mode changes
  React.useEffect(() => {
    controllerRef.current?.setPlacementMode(isPlacementMode);
  }, [isPlacementMode]);

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          display: "block",
          width: `${width}px`,
          height: `${height}px`,
          boxSizing: "border-box",
        }}
      />
    </Box>
  );
}
