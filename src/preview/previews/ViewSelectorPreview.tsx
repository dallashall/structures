import { useState } from 'react';
import { View, Heading, Content, Well, Text } from '@adobe/react-spectrum';
import { ViewSelector } from '../../components/ViewSelector';
import { mockCallbacks } from '../mockData';
import type { ViewType } from '../../types';

/**
 * Preview showcase for the ViewSelector component
 * Demonstrates view switching functionality
 */
export function ViewSelectorPreview() {
  const [activeView, setActiveView] = useState<ViewType>('front');

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
    mockCallbacks.onViewChange(view);
  };

  const renderViewExplanation = () => {
    if (activeView === 'front') {
      return (
        <Content>
          <strong>Front View:</strong> Edit the front face of the structure.
          Shows width (X-axis) and height (Y-axis).
        </Content>
      );
    }
    if (activeView === 'side') {
      return (
        <Content>
          <strong>Side View:</strong> Edit the side face of the structure. Shows
          depth (Z-axis) and height (Y-axis).
        </Content>
      );
    }
    return (
      <Content>
        <strong>Back View:</strong> Edit the back face of the structure. Shows
        width (X-axis) and height (Y-axis) from the opposite side.
      </Content>
    );
  };

  return (
    <View>
      <Heading level={1}>ViewSelector</Heading>
      <Content marginBottom="size-400">
        A button group for toggling between different 2D editing views (Front,
        Side, Back) of the 3D structure.
      </Content>

      {/* Default State (Front) */}
      <View marginTop="size-600">
        <Heading level={2}>Front View Selected</Heading>
        <Content marginBottom="size-200">
          Default view showing the X-Y plane (width × height)
        </Content>
        <ViewSelector
          activeView="front"
          onViewChange={mockCallbacks.onViewChange}
        />
      </View>

      {/* Side View */}
      <View marginTop="size-600">
        <Heading level={2}>Side View Selected</Heading>
        <Content marginBottom="size-200">
          Side view showing the Z-Y plane (depth × height)
        </Content>
        <ViewSelector
          activeView="side"
          onViewChange={mockCallbacks.onViewChange}
        />
      </View>

      {/* Back View */}
      <View marginTop="size-600">
        <Heading level={2}>Back View Selected</Heading>
        <Content marginBottom="size-200">
          Back view showing the X-Y plane from opposite perspective
        </Content>
        <ViewSelector
          activeView="back"
          onViewChange={mockCallbacks.onViewChange}
        />
      </View>

      {/* Interactive Demo */}
      <View marginTop="size-600">
        <Heading level={2}>Interactive Demo</Heading>
        <Content marginBottom="size-200">
          Click buttons to switch views. Currently active:{' '}
          <Text><strong>{activeView}</strong></Text>
        </Content>
        <ViewSelector activeView={activeView} onViewChange={handleViewChange} />
        <Well marginTop="size-300">
          <Heading level={4}>View Explanation</Heading>
          {renderViewExplanation()}
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
            {`interface ViewSelectorProps {
  activeView: ViewType;           // 'front' | 'side' | 'back'
  onViewChange: (view: ViewType) => void;  // View change callback
}`}
          </pre>
        </Well>
      </View>
    </View>
  );
}
