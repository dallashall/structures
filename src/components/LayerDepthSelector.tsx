import { Stack, Slider, Button, Typography } from '@mui/material';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { NumberField } from './NumberField';

interface LayerDepthSelectorProps {
  maxLayers: number;
  activeLayer: number;
  onLayerChange: (layer: number) => void;
}

/**
 * LayerDepthSelector - Controls for selecting the active editing layer
 *
 * Provides multiple input methods for layer selection:
 * - Slider for quick scrubbing through layers
 * - Number field for precise input
 * - Previous/Next buttons for incremental changes
 *
 * Layer 0 is the frontmost layer, maxLayers-1 is the backmost layer
 */
export function LayerDepthSelector({
  maxLayers,
  activeLayer,
  onLayerChange,
}: LayerDepthSelectorProps) {
  const handleSliderChange = (_event: Event, value: number | number[]) => {
    onLayerChange(value as number);
  };

  const handleNumberChange = (value: number) => {
    onLayerChange(value);
  };

  const handlePreviousClick = () => {
    if (activeLayer > 0) {
      onLayerChange(activeLayer - 1);
    }
  };

  const handleNextClick = () => {
    if (activeLayer < maxLayers - 1) {
      onLayerChange(activeLayer + 1);
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant="body2">
        Layer Depth: {activeLayer} / {maxLayers - 1}
      </Typography>

      <Stack direction="row" spacing={1} alignItems="center">
        {/* Previous Layer Button */}
        <Button
          variant="outlined"
          onClick={handlePreviousClick}
          disabled={activeLayer === 0}
          aria-label="Previous layer"
          startIcon={<KeyboardArrowLeft />}
        >
          Prev
        </Button>

        {/* Slider */}
        <Slider
          min={0}
          max={maxLayers - 1}
          value={activeLayer}
          onChange={handleSliderChange}
          sx={{ flex: 1 }}
          aria-label="Layer"
        />

        {/* Number Input */}
        <NumberField
          label="Layer"
          minValue={0}
          maxValue={maxLayers - 1}
          value={activeLayer}
          onChange={handleNumberChange}
        />

        {/* Next Layer Button */}
        <Button
          variant="outlined"
          onClick={handleNextClick}
          disabled={activeLayer === maxLayers - 1}
          aria-label="Next layer"
          endIcon={<KeyboardArrowRight />}
        >
          Next
        </Button>
      </Stack>
    </Stack>
  );
}
