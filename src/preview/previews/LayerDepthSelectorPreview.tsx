import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { LayerDepthSelector } from '../../components/LayerDepthSelector';
import { mockCallbacks } from '../mockData';

/**
 * Preview showcase for the LayerDepthSelector component
 * Demonstrates layer selection with different max layer values
 */
export function LayerDepthSelectorPreview() {
  const [activeLayer1, setActiveLayer1] = useState(0);
  const [activeLayer2, setActiveLayer2] = useState(5);

  const handleLayerChange1 = (layer: number) => {
    setActiveLayer1(layer);
    mockCallbacks.onLayerChange(layer);
  };

  const handleLayerChange2 = (layer: number) => {
    setActiveLayer2(layer);
    mockCallbacks.onLayerChange(layer);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1">LayerDepthSelector</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Controls for selecting the active editing layer. Provides slider, number
        field, and prev/next buttons for flexible layer navigation.
      </Typography>

      {/* Small Layer Count (5 layers) */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Small Structure (5 Layers)</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Example with a shallow structure (width/height/depth: 5×5×5)
        </Typography>
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300' }}>
          <LayerDepthSelector
            maxLayers={5}
            activeLayer={0}
            onLayerChange={mockCallbacks.onLayerChange}
          />
        </Box>
      </Box>

      {/* Medium Layer Count (10 layers) */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Medium Structure (10 Layers)</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Example with a medium-sized structure (width/height/depth: 10×10×10)
        </Typography>
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300' }}>
          <LayerDepthSelector
            maxLayers={10}
            activeLayer={4}
            onLayerChange={mockCallbacks.onLayerChange}
          />
        </Box>
      </Box>

      {/* Large Layer Count (20 layers) */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Large Structure (20 Layers)</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Example with a large structure (width/height/depth: 20×20×20)
        </Typography>
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300' }}>
          <LayerDepthSelector
            maxLayers={20}
            activeLayer={9}
            onLayerChange={mockCallbacks.onLayerChange}
          />
        </Box>
      </Box>

      {/* Interactive Demo */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Interactive Demo (10 Layers)</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Use slider, number field, or arrow buttons to change layers. Check
          console for callback logs.
        </Typography>
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300' }}>
          <LayerDepthSelector
            maxLayers={10}
            activeLayer={activeLayer1}
            onLayerChange={handleLayerChange1}
          />
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              bgcolor: 'primary.main',
              border: 1,
              borderColor: 'primary.dark',
              borderRadius: 1,
              color: 'white'
            }}
          >
            <Typography variant="body1">
              Current layer: <strong>{activeLayer1}</strong> (0 = front, 9 = back)
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Boundary Testing */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Boundary Testing (16 Layers)</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Test prev/next button disable states at boundaries. Try reaching layer
          0 or layer 15.
        </Typography>
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300' }}>
          <LayerDepthSelector
            maxLayers={16}
            activeLayer={activeLayer2}
            onLayerChange={handleLayerChange2}
          />
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              bgcolor: 'primary.main',
              border: 1,
              borderColor: 'primary.dark',
              borderRadius: 1
            }}
          >
            <Typography variant="h6" component="h4" sx={{ color: 'white' }}>Boundary Status</Typography>
            <Typography variant="body1" component="div" sx={{ color: 'white' }}>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>
                  Previous button {activeLayer2 === 0 ? 'DISABLED' : 'enabled'}
                </li>
                <li>Next button {activeLayer2 === 15 ? 'DISABLED' : 'enabled'}</li>
              </ul>
            </Typography>
          </Box>
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
            {`interface LayerDepthSelectorProps {
  maxLayers: number;            // Total number of layers (depth)
  activeLayer: number;          // Currently selected layer (0 to maxLayers-1)
  onLayerChange: (layer: number) => void;  // Layer change callback
}

// Layer 0 = frontmost layer
// Layer maxLayers-1 = backmost layer`}
          </pre>
        </Box>
      </Box>
    </Box>
  );
}
