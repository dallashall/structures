import { Flex, Slider, NumberField, Button, Text as SpectrumText } from '@adobe/react-spectrum';
import ChevronLeft from '@spectrum-icons/workflow/ChevronLeft';
import ChevronRight from '@spectrum-icons/workflow/ChevronRight';

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
  const handleSliderChange = (value: number) => {
    onLayerChange(value);
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
    <Flex direction="column" gap="size-100">
      <SpectrumText>
        Layer Depth: {activeLayer} / {maxLayers - 1}
      </SpectrumText>

      <Flex direction="row" gap="size-100" alignItems="center">
        {/* Previous Layer Button */}
        <Button
          variant="secondary"
          onPress={handlePreviousClick}
          isDisabled={activeLayer === 0}
          aria-label="Previous layer"
        >
          <ChevronLeft />
        </Button>

        {/* Slider */}
        <Slider
          label="Layer"
          labelPosition="side"
          minValue={0}
          maxValue={maxLayers - 1}
          value={activeLayer}
          onChange={handleSliderChange}
          flex={1}
        />

        {/* Number Input */}
        <NumberField
          label="Layer"
          labelPosition="side"
          minValue={0}
          maxValue={maxLayers - 1}
          value={activeLayer}
          onChange={handleNumberChange}
          width="size-1200"
        />

        {/* Next Layer Button */}
        <Button
          variant="secondary"
          onPress={handleNextClick}
          isDisabled={activeLayer === maxLayers - 1}
          aria-label="Next layer"
        >
          <ChevronRight />
        </Button>
      </Flex>
    </Flex>
  );
}
