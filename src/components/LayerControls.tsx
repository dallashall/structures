import { Stack, IconButton, Typography, Box } from '@mui/material';
import { Settings } from '@mui/icons-material';

import type { Dimensions, LayerState } from '../types';

import { SHORTCUTS } from '../core/Shortcuts';

import { LayerDimensionControl } from './LayerDimensionControl';
import { DialogTrigger } from './DialogTrigger';

interface LayerControlsProps {
  maxDimensions: Dimensions;
  activeLayers: LayerState;
  onLayerChange: (dimension: 'x' | 'y' | 'z', layer: number) => void;
}

/**
 * LayerControls - Compact layer display with expandable controls
 *
 * Shows current X/Y/Z layer values in a compact read-only display.
 * Click the settings button to open a popover with full controls.
 *
 * Layer keys come from SHORTCUTS and are handled globally by HotkeyDispatcher.
 * The step buttons show them in their tooltips.
 */
export function LayerControls({
  maxDimensions,
  activeLayers,
  onLayerChange,
}: LayerControlsProps) {
  // Named handlers for X layer
  const handleXIncrement = () => {
    if (activeLayers.x < maxDimensions.width - 1) {
      onLayerChange('x', activeLayers.x + 1);
    }
  };

  const handleXDecrement = () => {
    if (activeLayers.x > 0) {
      onLayerChange('x', activeLayers.x - 1);
    }
  };

  const handleXChange = (value: number) => {
    onLayerChange('x', value);
  };

  // Named handlers for Y layer
  const handleYIncrement = () => {
    if (activeLayers.y < maxDimensions.height - 1) {
      onLayerChange('y', activeLayers.y + 1);
    }
  };

  const handleYDecrement = () => {
    if (activeLayers.y > 0) {
      onLayerChange('y', activeLayers.y - 1);
    }
  };

  const handleYChange = (value: number) => {
    onLayerChange('y', value);
  };

  // Named handlers for Z layer
  const handleZIncrement = () => {
    if (activeLayers.z < maxDimensions.depth - 1) {
      onLayerChange('z', activeLayers.z + 1);
    }
  };

  const handleZDecrement = () => {
    if (activeLayers.z > 0) {
      onLayerChange('z', activeLayers.z - 1);
    }
  };

  const handleZChange = (value: number) => {
    onLayerChange('z', value);
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {/* Compact Read-Only Display */}
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="body2">
          <strong>X:</strong> {activeLayers.x}
        </Typography>
        <Typography variant="body2">
          <strong>Y:</strong> {activeLayers.y}
        </Typography>
        <Typography variant="body2">
          <strong>Z:</strong> {activeLayers.z}
        </Typography>
      </Stack>

      {/* Expand Button */}
      <DialogTrigger type="popover">
        <IconButton size="small" aria-label="Layer settings">
          <Settings fontSize="small" />
        </IconButton>
        {() => (
          <Box sx={{ p: 2 }}>
            <Stack spacing={1}>
              {/* X Layer Control */}
              <LayerDimensionControl
                label="X"
                currentLayer={activeLayers.x}
                maxLayer={maxDimensions.width}
                onIncrement={handleXIncrement}
                onDecrement={handleXDecrement}
                onChange={handleXChange}
                incrementShortcut={SHORTCUTS.layerXUp}
                decrementShortcut={SHORTCUTS.layerXDown}
              />

              {/* Y Layer Control */}
              <LayerDimensionControl
                label="Y"
                currentLayer={activeLayers.y}
                maxLayer={maxDimensions.height}
                onIncrement={handleYIncrement}
                onDecrement={handleYDecrement}
                onChange={handleYChange}
                incrementShortcut={SHORTCUTS.layerYUp}
                decrementShortcut={SHORTCUTS.layerYDown}
              />

              {/* Z Layer Control */}
              <LayerDimensionControl
                label="Z"
                currentLayer={activeLayers.z}
                maxLayer={maxDimensions.depth}
                onIncrement={handleZIncrement}
                onDecrement={handleZDecrement}
                onChange={handleZChange}
                incrementShortcut={SHORTCUTS.layerZUp}
                decrementShortcut={SHORTCUTS.layerZDown}
              />
            </Stack>
          </Box>
        )}
      </DialogTrigger>
    </Stack>
  );
}
