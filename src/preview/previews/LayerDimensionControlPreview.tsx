import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { LayerDimensionControl } from '../../components/LayerDimensionControl';

const logXIncrement = (): void => {
  console.log('[Static] X increment');
};
const logXDecrement = (): void => {
  console.log('[Static] X decrement');
};
const logXChange = (value: number): void => {
  console.log('[Static X]:', value);
};

const logYIncrement = (): void => {
  console.log('[Static] Y increment');
};
const logYDecrement = (): void => {
  console.log('[Static] Y decrement');
};
const logYChange = (value: number): void => {
  console.log('[Static Y]:', value);
};

const logZIncrement = (): void => {
  console.log('[Static] Z increment');
};
const logZDecrement = (): void => {
  console.log('[Static] Z decrement');
};
const logZChange = (value: number): void => {
  console.log('[Static Z]:', value);
};

export function LayerDimensionControlPreview() {
  const [xLayer, setXLayer] = useState(5);
  const [yLayer, setYLayer] = useState(12);
  const [zLayer, setZLayer] = useState(8);

  const handleXIncrement = () => {
    if (xLayer < 31) {
      setXLayer(xLayer + 1);
      console.log('[Preview] X layer incremented:', xLayer + 1);
    }
  };

  const handleXDecrement = () => {
    if (xLayer > 0) {
      setXLayer(xLayer - 1);
      console.log('[Preview] X layer decremented:', xLayer - 1);
    }
  };

  const handleXChange = (value: number) => {
    setXLayer(value);
    console.log('[Preview] X layer changed:', value);
  };

  const handleYIncrement = () => {
    if (yLayer < 31) {
      setYLayer(yLayer + 1);
    }
  };

  const handleYDecrement = () => {
    if (yLayer > 0) {
      setYLayer(yLayer - 1);
    }
  };

  const handleYChange = (value: number) => {
    setYLayer(value);
  };

  const handleZIncrement = () => {
    if (zLayer < 31) {
      setZLayer(zLayer + 1);
    }
  };

  const handleZDecrement = () => {
    if (zLayer > 0) {
      setZLayer(zLayer - 1);
    }
  };

  const handleZChange = (value: number) => {
    setZLayer(value);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1">LayerDimensionControl</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Single dimension layer control with increment/decrement buttons, number
        field, and slider. Used within LayerControls popover.
      </Typography>

      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">X Dimension Control</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Controls the X layer (width). Range: 0-15 for a 16-wide project.
        </Typography>
        <LayerDimensionControl
          label="X Layer"
          currentLayer={8}
          maxLayer={15}
          onIncrement={logXIncrement}
          onDecrement={logXDecrement}
          onChange={logXChange}
        />
      </Box>

      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Y Dimension Control</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Controls the Y layer (height). Range: 0-31 for a 32-tall project.
        </Typography>
        <LayerDimensionControl
          label="Y Layer"
          currentLayer={16}
          maxLayer={31}
          onIncrement={logYIncrement}
          onDecrement={logYDecrement}
          onChange={logYChange}
        />
      </Box>

      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Z Dimension Control</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Controls the Z layer (depth). Range: 0-63 for a 64-deep project.
        </Typography>
        <LayerDimensionControl
          label="Z Layer"
          currentLayer={32}
          maxLayer={63}
          onIncrement={logZIncrement}
          onDecrement={logZDecrement}
          onChange={logZChange}
        />
      </Box>

      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Interactive Demo (32×32×32 Project)</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Use buttons, number field, or slider to adjust layer values.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <LayerDimensionControl
            label="X Layer"
            currentLayer={xLayer}
            maxLayer={31}
            onIncrement={handleXIncrement}
            onDecrement={handleXDecrement}
            onChange={handleXChange}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <LayerDimensionControl
            label="Y Layer"
            currentLayer={yLayer}
            maxLayer={31}
            onIncrement={handleYIncrement}
            onDecrement={handleYDecrement}
            onChange={handleYChange}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <LayerDimensionControl
            label="Z Layer"
            currentLayer={zLayer}
            maxLayer={31}
            onIncrement={handleZIncrement}
            onDecrement={handleZDecrement}
            onChange={handleZChange}
          />
        </Box>

        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300', mt: 3 }}>
          <Typography variant="h6" component="h4">Current Layers</Typography>
          <Typography variant="body1">
            <strong>X Layer:</strong> {xLayer} / 31
            <br />
            <strong>Y Layer:</strong> {yLayer} / 31
            <br />
            <strong>Z Layer:</strong> {zLayer} / 31
          </Typography>
        </Box>
      </Box>

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
            {`interface LayerDimensionControlProps {
  label: string;                     // Display label (e.g., "X Layer")
  currentLayer: number;              // Current layer value (0 to maxLayer)
  maxLayer: number;                  // Maximum layer (dimension - 1)
  onIncrement: () => void;           // Increment button callback
  onDecrement: () => void;           // Decrement button callback
  onChange: (layer: number) => void; // Slider/field change callback
}

// Decrement button is disabled when currentLayer <= 0
// Increment button is disabled when currentLayer >= maxLayer`}
          </pre>
        </Box>
      </Box>

      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3">Features</Typography>
        <Typography variant="body1" component="div">
          <ul>
            <li>Increment/decrement buttons with chevron icons</li>
            <li>Number field for direct value entry</li>
            <li>Slider for visual adjustment</li>
            <li>Buttons disabled at min/max boundaries</li>
            <li>Accessible keyboard navigation</li>
            <li>Compact horizontal layout</li>
          </ul>
        </Typography>
      </Box>

      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3">Usage Context</Typography>
        <Typography variant="body1">
          This component is used within the LayerControls popover, displaying
          three instances (one per dimension: X, Y, Z) stacked vertically.
        </Typography>
      </Box>
    </Box>
  );
}
