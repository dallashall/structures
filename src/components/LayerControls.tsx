import {
  Flex,
  ActionButton,
  Text,
  DialogTrigger,
  Dialog,
  Content,
} from '@adobe/react-spectrum';
import Settings from '@spectrum-icons/workflow/Settings';

import type { Dimensions, LayerState } from '../types';

import { LayerDimensionControl } from './LayerDimensionControl';

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
 * Keyboard shortcuts (x/Shift+x, y/Shift+y, z/Shift+z) are handled
 * globally in the EditorView.
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
    <Flex direction="row" gap="size-100" alignItems="center">
      {/* Compact Read-Only Display */}
      <Flex direction="row" gap="size-200" alignItems="center">
        <Text>
          <strong>X:</strong> {activeLayers.x}
        </Text>
        <Text>
          <strong>Y:</strong> {activeLayers.y}
        </Text>
        <Text>
          <strong>Z:</strong> {activeLayers.z}
        </Text>
      </Flex>

      {/* Expand Button */}
      <DialogTrigger type="popover">
        <ActionButton isQuiet aria-label="Layer settings">
          <Settings />
        </ActionButton>
        <Dialog>
          <Content>
            <Flex direction="column" gap="size-100">
              {/* X Layer Control */}
              <LayerDimensionControl
                label="X"
                currentLayer={activeLayers.x}
                maxLayer={maxDimensions.width}
                onIncrement={handleXIncrement}
                onDecrement={handleXDecrement}
                onChange={handleXChange}
              />

              {/* Y Layer Control */}
              <LayerDimensionControl
                label="Y"
                currentLayer={activeLayers.y}
                maxLayer={maxDimensions.height}
                onIncrement={handleYIncrement}
                onDecrement={handleYDecrement}
                onChange={handleYChange}
              />

              {/* Z Layer Control */}
              <LayerDimensionControl
                label="Z"
                currentLayer={activeLayers.z}
                maxLayer={maxDimensions.depth}
                onIncrement={handleZIncrement}
                onDecrement={handleZDecrement}
                onChange={handleZChange}
              />
            </Flex>
          </Content>
        </Dialog>
      </DialogTrigger>
    </Flex>
  );
}
