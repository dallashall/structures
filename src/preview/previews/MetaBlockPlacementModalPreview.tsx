import { useState } from 'react';
import { View, Heading, Content, Well, Button, Text } from '@adobe/react-spectrum';
import { MetaBlockPlacementModal } from '../../components/MetaBlockPlacementModal';

/**
 * Preview showcase for the MetaBlockPlacementModal component
 * Demonstrates informational modal shown before meta block placement
 */
export function MetaBlockPlacementModalPreview() {
  const [isOpen, setIsOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleOpen = () => {
    setAcknowledged(false);
    setIsOpen(true);
  };

  const handleClose = () => {
    setAcknowledged(true);
    setIsOpen(false);
    console.log('[Preview] Meta block modal acknowledged');
  };

  return (
    <View>
      <Heading level={1}>MetaBlockPlacementModal</Heading>
      <Content marginBottom="size-400">
        Informational modal explaining the meta block and guiding users to place
        it as their first action after creating a new project.
      </Content>

      {/* Context */}
      <View marginTop="size-600">
        <Heading level={2}>Context</Heading>
        <Content>
          The meta block is a special marker that defines the entry point and
          orientation for structures imported into Minecraft. This modal appears
          automatically when a new project is created, before the editor is
          shown.
        </Content>
      </View>

      {/* Interactive Demo */}
      <View marginTop="size-600">
        <Heading level={2}>Interactive Demo</Heading>
        <Content marginBottom="size-200">
          Click the button to open the modal as users would see it on first
          project creation.
        </Content>
        <Button variant="primary" onPress={handleOpen}>
          Show Meta Block Modal
        </Button>

        {acknowledged && (
          <Well marginTop="size-300">
            <Heading level={4}>Modal Acknowledged</Heading>
            <Content>
              <Text>
                User clicked "Got it" and is now in placement mode. Canvas would
                show crosshair cursor and await first click to place meta block.
              </Text>
            </Content>
          </Well>
        )}

        <MetaBlockPlacementModal isOpen={isOpen} onClose={handleClose} />
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
            {`interface MetaBlockPlacementModalProps {
  isOpen: boolean;    // Dialog visibility state
  onClose: () => void; // Callback when "Got it" is clicked
}

// After onClose is called:
// - Editor enters placement mode
// - Canvas shows crosshair cursor
// - First click places meta block
// - Modal does not reappear for this project`}
          </pre>
        </Well>
      </View>

      {/* Feature Notes */}
      <View marginTop="size-600">
        <Heading level={3}>Features</Heading>
        <Content>
          <ul>
            <li>Clear explanation of meta block purpose</li>
            <li>Visual indicator (placeholder for future illustration)</li>
            <li>Single "Got it" button to acknowledge and continue</li>
            <li>Non-dismissible (must click button to close)</li>
            <li>Shown once per project on creation</li>
            <li>Guides user workflow for proper structure setup</li>
          </ul>
        </Content>
      </View>

      {/* Meta Block Purpose */}
      <View marginTop="size-600">
        <Heading level={3}>Meta Block Purpose</Heading>
        <Content>
          The meta block serves two functions:
          <ol>
            <li>
              <strong>Entry Point:</strong> Defines where the player will stand
              when the structure is summoned in Minecraft
            </li>
            <li>
              <strong>Orientation:</strong> Defines which direction the player
              faces (north/south/east/west), determining how the structure is
              rotated
            </li>
          </ol>
        </Content>
      </View>
    </View>
  );
}
