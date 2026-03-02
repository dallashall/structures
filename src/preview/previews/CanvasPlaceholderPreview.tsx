import { View, Heading, Content, Well } from '@adobe/react-spectrum';
import { CanvasPlaceholder } from '../../panels/CanvasPlaceholder';

/**
 * Preview showcase for the CanvasPlaceholder component
 * Demonstrates placeholder shown before canvas rendering is implemented
 */
export function CanvasPlaceholderPreview() {
  return (
    <View>
      <Heading level={1}>CanvasPlaceholder</Heading>
      <Content marginBottom="size-400">
        Placeholder component shown in canvas areas before full 2D/3D rendering
        is implemented. Displays a message indicating the canvas is coming soon.
      </Content>

      {/* Default State */}
      <View marginTop="size-600">
        <Heading level={2}>Default Placeholder</Heading>
        <Content marginBottom="size-200">
          Placeholder as shown in tabbed or quad layouts.
        </Content>
        <View
          borderWidth="thin"
          borderColor="gray-300"
          borderRadius="medium"
          overflow="hidden"
          height="size-6000"
        >
          <CanvasPlaceholder viewType="front" />
        </View>
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
            {`interface CanvasPlaceholderProps {}

// No props - stateless component
// Simply displays centered message`}
          </pre>
        </Well>
      </View>

      {/* Feature Notes */}
      <View marginTop="size-600">
        <Heading level={3}>Features</Heading>
        <Content>
          <ul>
            <li>Centered layout with gray background</li>
            <li>Heading and descriptive text</li>
            <li>No interactive elements</li>
            <li>Fills available space (width: 100%, height: 100%)</li>
            <li>Temporary placeholder for development</li>
          </ul>
        </Content>
      </View>

      {/* Usage Context */}
      <View marginTop="size-600">
        <Heading level={3}>Usage Context</Heading>
        <Content>
          Currently used in TabbedLayout and QuadLayout to fill canvas slots
          before Canvas2DView rendering is fully implemented. Will be replaced
          by actual canvas components as development progresses.
        </Content>
      </View>
    </View>
  );
}
