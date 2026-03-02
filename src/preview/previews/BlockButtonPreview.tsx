import { useState } from 'react';
import { View, Heading, Content, Flex, Well, Text } from '@adobe/react-spectrum';
import { BlockButton } from '../../components/BlockButton';
import { mockBlocks, mockCallbacks } from '../mockData';

/**
 * Preview showcase for the BlockButton component
 * Demonstrates various states and usage patterns
 */
export function BlockButtonPreview() {
  const [selectedId, setSelectedId] = useState<string | null>('stone');

  const handleSelect = (blockId: string) => {
    setSelectedId(blockId);
    mockCallbacks.onSelectBlock(blockId);
  };

  const filterStone = (block: typeof mockBlocks[0]) => block.category === 'stone';
  const filterWood = (block: typeof mockBlocks[0]) => block.category === 'wood';

  const renderBlockButton = (block: typeof mockBlocks[0], isSelected: boolean) => (
    <BlockButton
      key={block.id}
      block={block}
      isSelected={isSelected}
      onClick={mockCallbacks.onSelectBlock}
    />
  );

  const renderInteractiveBlockButton = (block: typeof mockBlocks[0]) => (
    <BlockButton
      key={block.id}
      block={block}
      isSelected={selectedId === block.id}
      onClick={handleSelect}
    />
  );

  return (
    <View>
      <Heading level={1}>BlockButton</Heading>
      <Content marginBottom="size-400">
        A fundamental UI primitive that represents a Minecraft block type.
        Shows the block's color and displays its name in a tooltip on hover.
      </Content>

      {/* Default State */}
      <View marginTop="size-600">
        <Heading level={2}>Default State</Heading>
        <Content marginBottom="size-200">
          Unselected block button - hover to see tooltip
        </Content>
        <Flex gap="size-150" wrap>
          {renderBlockButton(mockBlocks[0], false)}
        </Flex>
      </View>

      {/* Selected State */}
      <View marginTop="size-600">
        <Heading level={2}>Selected State</Heading>
        <Content marginBottom="size-200">
          Block button with selection highlight (blue border and glow)
        </Content>
        <Flex gap="size-150" wrap>
          {renderBlockButton(mockBlocks[0], true)}
        </Flex>
      </View>

      {/* Multiple Blocks */}
      <View marginTop="size-600">
        <Heading level={2}>Multiple Blocks (Stone Category)</Heading>
        <Content marginBottom="size-200">
          Collection of stone-type blocks showing color variety
        </Content>
        <Flex gap="size-150" wrap>
          {mockBlocks.filter(filterStone).map((block) => renderBlockButton(block, false))}
        </Flex>
      </View>

      {/* Wood Blocks */}
      <View marginTop="size-600">
        <Heading level={2}>Multiple Blocks (Wood Category)</Heading>
        <Content marginBottom="size-200">
          Collection of wood-type blocks
        </Content>
        <Flex gap="size-150" wrap>
          {mockBlocks.filter(filterWood).map((block) => renderBlockButton(block, false))}
        </Flex>
      </View>

      {/* Interactive Selection */}
      <View marginTop="size-600">
        <Heading level={2}>Interactive Selection</Heading>
        <Content marginBottom="size-200">
          Click any block to select it. Check console for callback logs.
          Currently selected: <Text><strong>{selectedId || 'none'}</strong></Text>
        </Content>
        <Flex gap="size-150" wrap>
          {mockBlocks.slice(0, 12).map(renderInteractiveBlockButton)}
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
            {`interface BlockButtonProps {
  block: Block;              // Block data (id, name, color, category)
  isSelected: boolean;       // Selection state
  onClick: (blockId: string) => void;  // Selection callback
}`}
          </pre>
        </Well>
      </View>
    </View>
  );
}
