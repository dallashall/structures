import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { LayerControls } from '../../components/LayerControls';
import type { Dimensions, LayerState } from '../../types';

/**
 * Preview showcase for the LayerControls component
 * Demonstrates compact layer display with expandable popover controls
 */
const logStaticLayerChange = (dimension: 'x' | 'y' | 'z', layer: number): void => {
  console.log('[Static] Layer change:', dimension, layer);
};

export function LayerControlsPreview() {
  const [activeLayers, setActiveLayers] = useState<LayerState>({
    x: 5,
    y: 3,
    z: 7,
  });

  const smallDimensions: Dimensions = { width: 16, height: 16, depth: 16 };
  const largeDimensions: Dimensions = { width: 64, height: 64, depth: 64 };

  const handleLayerChange = (dimension: 'x' | 'y' | 'z', layer: number) => {
    const withLayer = (prev: LayerState): LayerState => ({
      ...prev,
      [dimension]: layer,
    });
    setActiveLayers(withLayer);
    console.log('[Preview] Layer changed:', dimension, layer);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1">LayerControls</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Compact layer display showing current X/Y/Z layer values with a settings
        button that opens a popover containing full slider controls.
      </Typography>

      {/* Small Dimensions */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Small Project (16×16×16)</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Layer controls for a small 16×16×16 project. Layers range from 0-15.
        </Typography>
        <LayerControls
          maxDimensions={smallDimensions}
          activeLayers={{ x: 8, y: 8, z: 8 }}
          onLayerChange={logStaticLayerChange}
        />
      </Box>

      {/* Large Dimensions */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Large Project (64×64×64)</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Layer controls for a large 64×64×64 project. Layers range from 0-63.
        </Typography>
        <LayerControls
          maxDimensions={largeDimensions}
          activeLayers={{ x: 32, y: 16, z: 48 }}
          onLayerChange={logStaticLayerChange}
        />
      </Box>

      {/* Interactive Demo */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Interactive Demo</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Click the settings icon to open the popover and adjust layer sliders.
          Current layers update below.
        </Typography>
        <LayerControls
          maxDimensions={{ width: 32, height: 32, depth: 32 }}
          activeLayers={activeLayers}
          onLayerChange={handleLayerChange}
        />
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300', mt: 3 }}>
          <Typography variant="h6" component="h4">Current Layers</Typography>
          <Typography variant="body1">
            <strong>X Layer:</strong> {activeLayers.x}
            <br />
            <strong>Y Layer:</strong> {activeLayers.y}
            <br />
            <strong>Z Layer:</strong> {activeLayers.z}
          </Typography>
        </Box>
      </Box>

      {/* Props Documentation */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3">Props Interface</Typography>
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300' }}>
          <pre
            style={{
              fontSize: '13px',
              lineHeight: '1.5',
              overflow: 'auto',
              margin: 0,
            }}
          >
            {`interface LayerControlsProps {
  maxDimensions: Dimensions;                 // Project dimensions
  activeLayers: LayerState;                  // Current layer for each axis
  onLayerChange: (dimension: 'x' | 'y' | 'z', layer: number) => void;
}

interface Dimensions {
  width: number;   // Max X layer = width - 1
  height: number;  // Max Y layer = height - 1
  depth: number;   // Max Z layer = depth - 1
}

interface LayerState {
  x: number;  // Active X layer (0 to width-1)
  y: number;  // Active Y layer (0 to height-1)
  z: number;  // Active Z layer (0 to depth-1)
}`}
          </pre>
        </Box>
      </Box>

      {/* Feature Notes */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3">Features</Typography>
        <Typography variant="body1" component="div">
          <ul>
            <li>Compact read-only display of current X/Y/Z layers</li>
            <li>Settings icon button opens popover with full controls</li>
            <li>Popover contains 3 sliders (one per dimension)</li>
            <li>Each slider ranges from 0 to (dimension - 1)</li>
            <li>Keyboard shortcuts available globally: x/Shift+x, y/Shift+y, z/Shift+z</li>
            <li>Accessible via React Spectrum DialogTrigger</li>
          </ul>
        </Typography>
      </Box>

      {/* Usage Notes */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3">Layer Behavior</Typography>
        <Typography variant="body1" component="div">
          <ul>
            <li>
              <strong>Front/Back views</strong> use Z layer (controls depth slice)
            </li>
            <li>
              <strong>Left/Right views</strong> use X layer (controls width slice)
            </li>
            <li>
              <strong>Top/Bottom views</strong> use Y layer (controls height slice)
            </li>
          </ul>
        </Typography>
        <Typography variant="body1">
          Only the relevant layer for the current view affects what's visible in
          the 2D canvas.
        </Typography>
      </Box>
    </Box>
  );
}
