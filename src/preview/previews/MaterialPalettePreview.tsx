import { useState } from 'react';
import { View, Heading, Content, Well, Text } from '@adobe/react-spectrum';
import { MaterialPalette } from '../../components/MaterialPalette';
import { mockBlocks, mockCallbacks, getBlocksByCategory } from '../mockData';

/**
 * Preview showcase for the MaterialPalette component
 * Demonstrates grid layout with block selection
 */
export function MaterialPalettePreview() {
  const [selectedId, setSelectedId] = useState<string | null>('stone');

  const handleSelect = (blockId: string) => {
    setSelectedId(blockId);
    mockCallbacks.onSelectBlock(blockId);
  };

  const findBlock = (id: string) => mockBlocks.find((b) => b.id === id);

  const renderBlockDetails = () => {
    if (!selectedId) return null;
    const block = findBlock(selectedId);
    return (
      <Well marginTop="size-200">
        <Heading level={4}>Selected Block Details</Heading>
        <Content>
          <Text><strong>ID:</strong> {selectedId}</Text>
          <Text><strong>Name:</strong> {block?.name}</Text>
          <Text><strong>Category:</strong> {block?.category}</Text>
          <Text><strong>Color:</strong> {block?.color}</Text>
        </Content>
      </Well>
    );
  };

  return (
    <View>
      <Heading level={1}>MaterialPalette</Heading>
      <Content marginBottom="size-400">
        A thin wrapper around React Spectrum's ActionGroup with ColorSwatch items.
        Displays a selectable palette of Minecraft blocks with automatic theming.
      </Content>

      {/* Small Set (Stone Blocks) */}
      <View marginTop="size-600">
        <Heading level={2}>Small Set (Stone Category)</Heading>
        <Content marginBottom="size-200">
          6 blocks from the stone category
        </Content>
        <MaterialPalette
          blocks={getBlocksByCategory('stone')}
          selectedBlockId={null}
          onSelectBlock={mockCallbacks.onSelectBlock}
        />
      </View>

      {/* Medium Set (Wood Blocks) */}
      <View marginTop="size-600">
        <Heading level={2}>Medium Set (Wood Category)</Heading>
        <Content marginBottom="size-200">
          6 blocks from the wood category
        </Content>
        <MaterialPalette
          blocks={getBlocksByCategory('wood')}
          selectedBlockId={null}
          onSelectBlock={mockCallbacks.onSelectBlock}
        />
      </View>

      {/* Large Set (Decoration Blocks) */}
      <View marginTop="size-600">
        <Heading level={2}>Large Set (Decoration Category)</Heading>
        <Content marginBottom="size-200">
          8 blocks from the decoration category showing grid responsiveness
        </Content>
        <MaterialPalette
          blocks={getBlocksByCategory('decoration')}
          selectedBlockId={null}
          onSelectBlock={mockCallbacks.onSelectBlock}
        />
      </View>

      {/* Full Set (All Blocks) */}
      <View marginTop="size-600">
        <Heading level={2}>Full Block Registry</Heading>
        <Content marginBottom="size-200">
          All {mockBlocks.length} available blocks in the registry
        </Content>
        <MaterialPalette
          blocks={mockBlocks}
          selectedBlockId={null}
          onSelectBlock={mockCallbacks.onSelectBlock}
        />
      </View>

      {/* Interactive Selection */}
      <View marginTop="size-600">
        <Heading level={2}>Interactive Selection</Heading>
        <Content marginBottom="size-200">
          Click any block to select it. Currently selected:{' '}
          <Text><strong>{selectedId || 'none'}</strong></Text>
        </Content>
        <MaterialPalette
          blocks={mockBlocks}
          selectedBlockId={selectedId}
          onSelectBlock={handleSelect}
        />
        {renderBlockDetails()}
      </View>

      {/* With Pre-selection */}
      <View marginTop="size-600">
        <Heading level={2}>With Pre-selected Block</Heading>
        <Content marginBottom="size-200">
          Palette with "oak_planks" pre-selected
        </Content>
        <MaterialPalette
          blocks={mockBlocks.slice(0, 16)}
          selectedBlockId="oak_planks"
          onSelectBlock={mockCallbacks.onSelectBlock}
        />
      </View>

      {/* Responsive Behavior */}
      <View marginTop="size-600">
        <Heading level={2}>Responsive Grid Behavior</Heading>
        <Content marginBottom="size-200">
          Constrained width to demonstrate grid auto-fill responsiveness
        </Content>
        <View maxWidth="size-5000">
          <MaterialPalette
            blocks={mockBlocks.slice(0, 20)}
            selectedBlockId={null}
            onSelectBlock={mockCallbacks.onSelectBlock}
          />
        </View>
      </View>

      {/* Props Documentation */}
      <View marginTop="size-600">
        <Heading level={3}>Props Interface</Heading>
        <Well>
          <Content>
            <pre>
              {`interface MaterialPaletteProps {
  blocks: Block[];                 // Array of blocks to display
  selectedBlockId: string | null;  // Currently selected block ID
  onSelectBlock: (blockId: string) => void;  // Selection callback
}

// Uses React Spectrum's ActionGroup with ColorSwatch
// Automatic theming and accessibility support
// Keyboard navigation built-in`}
            </pre>
          </Content>
        </Well>
      </View>
    </View>
  );
}
