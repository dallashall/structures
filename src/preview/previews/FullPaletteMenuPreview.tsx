import { useState } from 'react';
import { View, Heading, Content, Well, Flex } from '@adobe/react-spectrum';
import { FullPaletteMenu } from '../../components/FullPaletteMenu';
import { mockBlocks } from '../mockData';

/**
 * Preview showcase for the FullPaletteMenu component
 * Demonstrates full block catalog with search and category filtering
 */
export function FullPaletteMenuPreview() {
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  const handleSelectBlock = (blockId: string) => {
    setSelectedBlock(blockId);
    console.log('[Preview] Block selected:', blockId);
  };

  const selectedBlockInfo = mockBlocks.find((b) => b.id === selectedBlock);

  return (
    <View>
      <Heading level={1}>FullPaletteMenu</Heading>
      <Content marginBottom="size-400">
        Popover menu (non-modal) displaying the full block catalog with fuzzy
        search and category organization. Triggered by button press.
      </Content>

      {/* Interactive Demo */}
      <View marginTop="size-600">
        <Heading level={2}>Interactive Demo</Heading>
        <Content marginBottom="size-200">
          Click the "All Blocks" button to open the popover. The menu doesn't
          block the rest of the UI.
        </Content>

        <Flex gap="size-200" alignItems="center">
          <FullPaletteMenu blocks={mockBlocks} onSelectBlock={handleSelectBlock} />

          {selectedBlockInfo && (
            <Well>
              <Heading level={4}>Selected: {selectedBlockInfo.name}</Heading>
              <div
                style={{
                  backgroundColor: selectedBlockInfo.color,
                  width: '32px',
                  height: '32px',
                  marginTop: '8px',
                  border: '1px solid #ccc',
                }}
              />
            </Well>
          )}
        </Flex>
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
            {`interface FullPaletteMenuProps {
  isOpen: boolean;                          // Dialog visibility state
  onClose: () => void;                      // Close callback
  blocks: Block[];                          // All available blocks
  onSelectBlock: (blockId: string) => void; // Block selection callback
}

interface Block {
  id: string;        // Unique block identifier
  name: string;      // Display name
  category: string;  // Category for grouping
  color: string;     // Hex color for 2D rendering
  textureRef?: string; // Optional texture reference
}`}
          </pre>
        </Well>
      </View>

      {/* Feature Notes */}
      <View marginTop="size-600">
        <Heading level={3}>Features</Heading>
        <Content>
          <ul>
            <li>Fuzzy search across block names</li>
            <li>Blocks organized by category (stone, wood, decoration, etc.)</li>
            <li>Color swatch preview for each block</li>
            <li>Grid layout for efficient browsing</li>
            <li>Accessible keyboard navigation</li>
            <li>Responsive dialog sizing</li>
          </ul>
        </Content>
      </View>

      {/* Usage Notes */}
      <View marginTop="size-600">
        <Heading level={3}>Usage</Heading>
        <Content>
          Typically opened via a button in the main editor interface when users
          want to select blocks beyond the 5-slot quick-select palette.
        </Content>
      </View>
    </View>
  );
}
