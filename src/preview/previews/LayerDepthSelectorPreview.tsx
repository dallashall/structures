import { useState } from 'react';
import { View, Heading, Content, Well, Text } from '@adobe/react-spectrum';
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
    <View>
      <Heading level={1}>LayerDepthSelector</Heading>
      <Content marginBottom="size-400">
        Controls for selecting the active editing layer. Provides slider, number
        field, and prev/next buttons for flexible layer navigation.
      </Content>

      {/* Small Layer Count (5 layers) */}
      <View marginTop="size-600">
        <Heading level={2}>Small Structure (5 Layers)</Heading>
        <Content marginBottom="size-200">
          Example with a shallow structure (width/height/depth: 5×5×5)
        </Content>
        <Well>
          <LayerDepthSelector
            maxLayers={5}
            activeLayer={0}
            onLayerChange={mockCallbacks.onLayerChange}
          />
        </Well>
      </View>

      {/* Medium Layer Count (10 layers) */}
      <View marginTop="size-600">
        <Heading level={2}>Medium Structure (10 Layers)</Heading>
        <Content marginBottom="size-200">
          Example with a medium-sized structure (width/height/depth: 10×10×10)
        </Content>
        <Well>
          <LayerDepthSelector
            maxLayers={10}
            activeLayer={4}
            onLayerChange={mockCallbacks.onLayerChange}
          />
        </Well>
      </View>

      {/* Large Layer Count (20 layers) */}
      <View marginTop="size-600">
        <Heading level={2}>Large Structure (20 Layers)</Heading>
        <Content marginBottom="size-200">
          Example with a large structure (width/height/depth: 20×20×20)
        </Content>
        <Well>
          <LayerDepthSelector
            maxLayers={20}
            activeLayer={9}
            onLayerChange={mockCallbacks.onLayerChange}
          />
        </Well>
      </View>

      {/* Interactive Demo */}
      <View marginTop="size-600">
        <Heading level={2}>Interactive Demo (10 Layers)</Heading>
        <Content marginBottom="size-200">
          Use slider, number field, or arrow buttons to change layers. Check
          console for callback logs.
        </Content>
        <Well>
          <LayerDepthSelector
            maxLayers={10}
            activeLayer={activeLayer1}
            onLayerChange={handleLayerChange1}
          />
          <View
            marginTop="size-200"
            padding="size-150"
            backgroundColor="blue-400"
            borderWidth="thin"
            borderColor="blue-600"
            borderRadius="medium"
          >
            <Content UNSAFE_style={{ color: 'white' }}>
              Current layer: <Text><strong>{activeLayer1}</strong></Text> (0 = front, 9 = back)
            </Content>
          </View>
        </Well>
      </View>

      {/* Boundary Testing */}
      <View marginTop="size-600">
        <Heading level={2}>Boundary Testing (16 Layers)</Heading>
        <Content marginBottom="size-200">
          Test prev/next button disable states at boundaries. Try reaching layer
          0 or layer 15.
        </Content>
        <Well>
          <LayerDepthSelector
            maxLayers={16}
            activeLayer={activeLayer2}
            onLayerChange={handleLayerChange2}
          />
          <View
            marginTop="size-200"
            padding="size-150"
            backgroundColor="blue-400"
            borderWidth="thin"
            borderColor="blue-600"
            borderRadius="medium"
          >
            <Heading level={4} UNSAFE_style={{ color: 'white' }}>Boundary Status</Heading>
            <Content UNSAFE_style={{ color: 'white' }}>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>
                  Previous button {activeLayer2 === 0 ? 'DISABLED' : 'enabled'}
                </li>
                <li>Next button {activeLayer2 === 15 ? 'DISABLED' : 'enabled'}</li>
              </ul>
            </Content>
          </View>
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
            {`interface LayerDepthSelectorProps {
  maxLayers: number;            // Total number of layers (depth)
  activeLayer: number;          // Currently selected layer (0 to maxLayers-1)
  onLayerChange: (layer: number) => void;  // Layer change callback
}

// Layer 0 = frontmost layer
// Layer maxLayers-1 = backmost layer`}
          </pre>
        </Well>
      </View>
    </View>
  );
}
