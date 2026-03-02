import { useState } from 'react';
import { View, Heading, Content, Well, Text } from '@adobe/react-spectrum';
import { LayerDimensionControl } from '../../components/LayerDimensionControl';

/**
 * Preview showcase for the LayerDimensionControl component
 * Demonstrates single dimension layer control with buttons and slider
 */
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
    <View>
      <Heading level={1}>LayerDimensionControl</Heading>
      <Content marginBottom="size-400">
        Single dimension layer control with increment/decrement buttons, number
        field, and slider. Used within LayerControls popover.
      </Content>

      {/* X Dimension */}
      <View marginTop="size-600">
        <Heading level={2}>X Dimension Control</Heading>
        <Content marginBottom="size-200">
          Controls the X layer (width). Range: 0-15 for a 16-wide project.
        </Content>
        <LayerDimensionControl
          label="X Layer"
          currentLayer={8}
          maxLayer={15}
          onIncrement={() => console.log('[Static] X increment')}
          onDecrement={() => console.log('[Static] X decrement')}
          onChange={(value) => console.log('[Static X]:', value)}
        />
      </View>

      {/* Y Dimension */}
      <View marginTop="size-600">
        <Heading level={2}>Y Dimension Control</Heading>
        <Content marginBottom="size-200">
          Controls the Y layer (height). Range: 0-31 for a 32-tall project.
        </Content>
        <LayerDimensionControl
          label="Y Layer"
          currentLayer={16}
          maxLayer={31}
          onIncrement={() => console.log('[Static] Y increment')}
          onDecrement={() => console.log('[Static] Y decrement')}
          onChange={(value) => console.log('[Static Y]:', value)}
        />
      </View>

      {/* Z Dimension */}
      <View marginTop="size-600">
        <Heading level={2}>Z Dimension Control</Heading>
        <Content marginBottom="size-200">
          Controls the Z layer (depth). Range: 0-63 for a 64-deep project.
        </Content>
        <LayerDimensionControl
          label="Z Layer"
          currentLayer={32}
          maxLayer={63}
          onIncrement={() => console.log('[Static] Z increment')}
          onDecrement={() => console.log('[Static] Z decrement')}
          onChange={(value) => console.log('[Static Z]:', value)}
        />
      </View>

      {/* Interactive Demo */}
      <View marginTop="size-600">
        <Heading level={2}>Interactive Demo (32×32×32 Project)</Heading>
        <Content marginBottom="size-200">
          Use buttons, number field, or slider to adjust layer values.
        </Content>

        <View marginBottom="size-300">
          <LayerDimensionControl
            label="X Layer"
            currentLayer={xLayer}
            maxLayer={31}
            onIncrement={handleXIncrement}
            onDecrement={handleXDecrement}
            onChange={handleXChange}
          />
        </View>

        <View marginBottom="size-300">
          <LayerDimensionControl
            label="Y Layer"
            currentLayer={yLayer}
            maxLayer={31}
            onIncrement={handleYIncrement}
            onDecrement={handleYDecrement}
            onChange={handleYChange}
          />
        </View>

        <View marginBottom="size-300">
          <LayerDimensionControl
            label="Z Layer"
            currentLayer={zLayer}
            maxLayer={31}
            onIncrement={handleZIncrement}
            onDecrement={handleZDecrement}
            onChange={handleZChange}
          />
        </View>

        <Well marginTop="size-300">
          <Heading level={4}>Current Layers</Heading>
          <Content>
            <Text><strong>X Layer:</strong> {xLayer} / 31</Text>
            <br />
            <Text><strong>Y Layer:</strong> {yLayer} / 31</Text>
            <br />
            <Text><strong>Z Layer:</strong> {zLayer} / 31</Text>
          </Content>
        </Well>
      </View>

      {/* Props Documentation */}
      <View marginTop="size-600">
        <Heading level={3}>Props Interface</Heading>
        <Well>
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
        </Well>
      </View>

      {/* Feature Notes */}
      <View marginTop="size-600">
        <Heading level={3}>Features</Heading>
        <Content>
          <ul>
            <li>Increment/decrement buttons with chevron icons</li>
            <li>Number field for direct value entry</li>
            <li>Slider for visual adjustment</li>
            <li>Buttons disabled at min/max boundaries</li>
            <li>Accessible keyboard navigation</li>
            <li>Compact horizontal layout</li>
          </ul>
        </Content>
      </View>

      {/* Usage Context */}
      <View marginTop="size-600">
        <Heading level={3}>Usage Context</Heading>
        <Content>
          This component is used within the LayerControls popover, displaying
          three instances (one per dimension: X, Y, Z) stacked vertically.
        </Content>
      </View>
    </View>
  );
}
