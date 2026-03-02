import { useState } from 'react';
import { View, Heading, Content, Well, Button, Text } from '@adobe/react-spectrum';
import { NewProjectDialog } from '../../components/NewProjectDialog';
import type { Dimensions } from '../../types';

/**
 * Preview showcase for the NewProjectDialog component
 * Demonstrates project creation dialog with presets and custom dimensions
 */
export function NewProjectDialogPreview() {
  const [isOpen, setIsOpen] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ name: string; dimensions: Dimensions } | null>(null);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleCreate = (name: string, dimensions: Dimensions) => {
    setLastCreated({ name, dimensions });
    setIsOpen(false);
    console.log('[Preview] Project created:', name, dimensions);
  };

  return (
    <View>
      <Heading level={1}>NewProjectDialog</Heading>
      <Content marginBottom="size-400">
        Dialog for creating new projects with customizable dimensions. Supports
        presets (Small, Medium, Large) and custom sizes.
      </Content>

      {/* Interactive Demo */}
      <View marginTop="size-600">
        <Heading level={2}>Interactive Demo</Heading>
        <Content marginBottom="size-200">
          Click the button to open the New Project dialog. Test the presets
          and custom dimension inputs.
        </Content>
        <Button variant="primary" onPress={handleOpen}>
          Open New Project Dialog
        </Button>

        {lastCreated && (
          <Well marginTop="size-300">
            <Heading level={4}>Last Created Project</Heading>
            <Content>
              <Text><strong>Name:</strong> {lastCreated.name}</Text>
              <br />
              <Text>
                <strong>Dimensions:</strong> {lastCreated.dimensions.width} ×{' '}
                {lastCreated.dimensions.height} × {lastCreated.dimensions.depth}
              </Text>
            </Content>
          </Well>
        )}

        <NewProjectDialog
          isOpen={isOpen}
          onClose={handleClose}
          onCreate={handleCreate}
        />
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
            {`interface NewProjectDialogProps {
  isOpen: boolean;                          // Dialog visibility state
  onClose: () => void;                      // Close callback (cancel)
  onCreate: (name: string, dimensions: Dimensions) => void;  // Create callback
}

interface Dimensions {
  width: number;    // 1-256
  height: number;   // 1-256
  depth: number;    // 1-256
}

// Presets:
// - Small: 16×16×16
// - Medium: 32×32×32
// - Large: 64×64×64
// - Custom: User-defined`}
          </pre>
        </Well>
      </View>

      {/* Feature Notes */}
      <View marginTop="size-600">
        <Heading level={3}>Features</Heading>
        <Content>
          <ul>
            <li>Required project name field with validation</li>
            <li>Dimension presets for quick setup</li>
            <li>Custom dimensions with min/max validation (1-256)</li>
            <li>Form reset on cancel or successful creation</li>
            <li>Create button disabled when name is empty</li>
            <li>Note reminding users dimensions can be changed later</li>
          </ul>
        </Content>
      </View>
    </View>
  );
}
