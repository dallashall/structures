import React from 'react';
import { Tab, Box, Typography } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";

import type { ViewType, LayerState } from "../types";

import { Canvas2DView } from "../panels/Canvas2DView";
import { Preview3DView } from "../panels/Preview3DView";
import { BlockOrientationPreview } from "../components/BlockOrientationPreview";

interface TabbedLayoutProps {
  activeView: ViewType;
  onViewChange: (key: React.Key) => void;
  activeLayers: LayerState;
  renderTabBar?: boolean; // Whether to render the tab bar internally (default false)
}

/**
 * TabbedLayout - Single canvas with tab navigation
 *
 * Displays one view at a time with tabs to switch between different
 * orthographic views and 3D preview.
 */
export function TabbedLayout({
  activeView,
  onViewChange,
  activeLayers,
  renderTabBar = false,
}: TabbedLayoutProps) {
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    onViewChange(newValue);
  };

  const views = [
    "front",
    "back",
    "left",
    "right",
    "top",
    "bottom",
    "3d",
  ] as const;

  // Get the depth coordinate for the current view
  const getDepthLabel = (view: ViewType | "3d"): string | null => {
    switch (view) {
      case "front":
      case "back":
        return `Y: ${activeLayers.y}`;
      case "left":
      case "right":
        return `X: ${activeLayers.x}`;
      case "top":
      case "bottom":
        return `Z: ${activeLayers.z}`;
      default:
        return null;
    }
  };

  return (
    <TabContext value={activeView}>
      {renderTabBar && (
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <TabList onChange={handleTabChange} aria-label="View tabs">
            <Tab label="Front" value="front" />
            <Tab label="Back" value="back" />
            <Tab label="Left" value="left" />
            <Tab label="Right" value="right" />
            <Tab label="Top" value="top" />
            <Tab label="Bottom" value="bottom" />
            <Tab label="3D Preview" value="3d" />
          </TabList>
        </Box>
      )}
      {views.map((view) => (
        <TabPanel
          key={view}
          value={view}
          sx={{
            p: 0,
            height: renderTabBar ? "calc(100% - 48px)" : "100%",
            position: "relative",
          }}
        >
          {view === "3d" ? (
            <Box sx={{ width: "100%", height: "100%" }}>
              <Preview3DView />
            </Box>
          ) : (
            <>
              {/* Depth indicator */}
              {getDepthLabel(view) && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.primary",
                      bgcolor: "rgba(255, 255, 255, 0.9)",
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: "bold",
                    }}
                  >
                    {getDepthLabel(view)}
                  </Typography>
                </Box>
              )}
              <BlockOrientationPreview viewType={view} />
              <Box sx={{ width: "100%", height: "100%" }}>
                <Canvas2DView viewType={view} />
              </Box>
            </>
          )}
        </TabPanel>
      ))}
    </TabContext>
  );
}
