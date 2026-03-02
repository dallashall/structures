import { useState } from 'react';
import { View, Heading, Content, Well, Text } from '@adobe/react-spectrum';
import { LayerControls } from '../../components/LayerControls';
import type { Dimensions, LayerState } from '../../types';

/**
 * Preview showcase for the LayerControls component
 * Demonstrates compact layer display with expandable popover controls
 */
export function LayerControlsPreview() {
  const [activeLayers, setActiveLayers] = useState<LayerState>({
    x: 5,
    y: 3,
    z: 7,
  });

  const smallDimensions: Dimensions = { width: 16, height: 16, depth: 16 };
  const largeDimensions: Dimensions = { width: 64, height: 64, depth: 64 };

  const handleLayerChange = (dimension: 'x' | 'y' | 'z', layer: number) => {
    setActiveLayers((prev) => ({
      ...prev,
      [dimension]: layer,
    }));
    console.log('[Preview] Layer changed:', dimension, layer);
  };

  return (
    <View>
      <Heading level={1}>LayerControls</Heading>
      <Content marginBottom="size-400">
        Compact layer display showing current X/Y/Z layer values with a settings
        button that opens a popover containing full slider controls.
      </Content>

      {/* Small Dimensions */}
      <View marginTop="size-600">
        <Heading level={2}>Small Project (16×16×16)</Heading>
        <Content marginBottom="size-200">
          Layer controls for a small 16×16×16 project. Layers range from 0-15.
        </Content>
        <LayerControls
          maxDimensions={smallDimensions}
          activeLayers={{ x: 8, y: 8, z: 8 }}
          onLayerChange={(dim, layer) =>
            console.log('[Static] Layer change:', dim, layer)
          }
        />
      </View>

      {/* Large Dimensions */}
      <View marginTop="size-600">
        <Heading level={2}>Large Project (64×64×64)</Heading>
        <Content marginBottom="size-200">
          Layer controls for a large 64×64×64 project. Layers range from 0-63.
        </Content>
        <LayerControls
          maxDimensions={largeDimensions}
          activeLayers={{ x: 32, y: 16, z: 48 }}
          onLayerChange={(dim, layer) =>
            console.log('[Static] Layer change:', dim, layer)
          }
        />
      </View>

      {/* Interactive Demo */}
      <View marginTop="size-600">
        <Heading level={2}>Interactive Demo</Heading>
        <Content marginBottom="size-200">
          Click the settings icon to open the popover and adjust layer sliders.
          Current layers update below.
        </Content>
        <LayerControls
          maxDimensions={{ width: 32, height: 32, depth: 32 }}
          activeLayers={activeLayers}
          onLayerChange={handleLayerChange}
        />
        <Well marginTop="size-300">
          <Heading level={4}>Current Layers</Heading>
          <Content>
            <Text><strong>X Layer:</strong> {activeLayers.x}</Text>
            <br />
            <Text><strong>Y Layer:</strong> {activeLayers.y}</Text>
            <br />
            <Text><strong>Z Layer:</strong> {activeLayers.z}</Text>
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
        </Well>
      </View>

      {/* Feature Notes */}
      <View marginTop="size-600">
        <Heading level={3}>Features</Heading>
        <Content>
          <ul>
            <li>Compact read-only display of current X/Y/Z layers</li>
            <li>Settings icon button opens popover with full controls</li>
            <li>Popover contains 3 sliders (one per dimension)</li>
            <li>Each slider ranges from 0 to (dimension - 1)</li>
            <li>Keyboard shortcuts available globally: x/Shift+x, y/Shift+y, z/Shift+z</li>
            <li>Accessible via React Spectrum DialogTrigger</li>
          </ul>
        </Content>
      </View>

      {/* Usage Notes */}
      <View marginTop="size-600">
        <Heading level={3}>Layer Behavior</Heading>
        <Content>
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
          Only the relevant layer for the current view affects what's visible in
          the 2D canvas.
        </Content>
      </View>
    </View>
  );
}
