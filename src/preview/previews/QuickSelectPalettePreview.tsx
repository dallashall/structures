import { useState } from 'react';
import { View, Heading, Content, Well, Text } from '@adobe/react-spectrum';
import { QuickSelectPalette } from '../../components/QuickSelectPalette';
import { mockBlocks } from '../mockData';

/**
 * Preview showcase for the QuickSelectPalette component
 * Demonstrates 5-slot quick-select palette for rapid material switching
 */
export function QuickSelectPalettePreview() {
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(0);

  const handleSelectSlot = (index: number) => {
    setSelectedSlotIndex(index);
    console.log('[Preview] Slot selected:', index);
  };

  // Example slot configurations
  const emptySlots: (string | null)[] = [null, null, null, null, null];
  const partialSlots: (string | null)[] = ['stone', 'oak_planks', null, null, null];
  const fullSlots: (string | null)[] = [
    'stone',
    'oak_planks',
    'glass',
    'bricks',
    'grass',
  ];
  const [interactiveSlots] = useState<(string | null)[]>([
    'stone',
    'oak_planks',
    'glass',
    null,
    null,
  ]);

  const selectedBlock = interactiveSlots[selectedSlotIndex ?? 0];
  const selectedBlockInfo = mockBlocks.find((b) => b.id === selectedBlock);

  return (
    <View>
      <Heading level={1}>QuickSelectPalette</Heading>
      <Content marginBottom="size-400">
        5-slot quick-select palette for rapid material switching during editing.
        Displays blocks as color swatches with selection state.
      </Content>

      {/* Empty State */}
      <View marginTop="size-600">
        <Heading level={2}>Empty State</Heading>
        <Content marginBottom="size-200">
          Palette with no blocks assigned. Shows empty gray squares.
        </Content>
        <QuickSelectPalette
          slots={emptySlots}
          selectedSlotIndex={null}
          blocks={mockBlocks}
          onSelectSlot={handleSelectSlot}
        />
      </View>

      {/* Partial State */}
      <View marginTop="size-600">
        <Heading level={2}>Partially Filled</Heading>
        <Content marginBottom="size-200">
          Palette with some slots filled, others empty.
        </Content>
        <QuickSelectPalette
          slots={partialSlots}
          selectedSlotIndex={0}
          blocks={mockBlocks}
          onSelectSlot={handleSelectSlot}
        />
      </View>

      {/* Full State */}
      <View marginTop="size-600">
        <Heading level={2}>All Slots Filled</Heading>
        <Content marginBottom="size-200">
          Palette with all 5 slots assigned. Second slot selected.
        </Content>
        <QuickSelectPalette
          slots={fullSlots}
          selectedSlotIndex={1}
          blocks={mockBlocks}
          onSelectSlot={handleSelectSlot}
        />
      </View>

      {/* Interactive Demo */}
      <View marginTop="size-600">
        <Heading level={2}>Interactive Demo</Heading>
        <Content marginBottom="size-200">
          Click slots to select different materials. Selected slot is
          highlighted with a ring.
        </Content>
        <QuickSelectPalette
          slots={interactiveSlots}
          selectedSlotIndex={selectedSlotIndex}
          blocks={mockBlocks}
          onSelectSlot={handleSelectSlot}
        />
        {selectedBlockInfo && (
          <Well marginTop="size-300">
            <Heading level={4}>Selected Block</Heading>
            <Content>
              <Text>
                <strong>Slot:</strong> {selectedSlotIndex !== null ? selectedSlotIndex + 1 : 'None'}
              </Text>
              <br />
              <Text><strong>Block:</strong> {selectedBlockInfo.name}</Text>
              <br />
              <Text><strong>ID:</strong> {selectedBlockInfo.id}</Text>
            </Content>
          </Well>
        )}
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
            {`interface QuickSelectPaletteProps {
  slots: (string | null)[];      // 5 block IDs or null for empty
  selectedSlotIndex: number | null;  // Currently selected slot (0-4)
  blocks: Block[];                   // All blocks for lookup
  onSelectSlot: (index: number) => void;  // Slot selection callback
  onAssignSlot?: (index: number, blockId: string) => void; // Future: slot assignment
}

// Usage:
// - Click slot to select it (makes that block active for painting)
// - Empty slots shown as gray squares
// - Selected slot has visual ring indicator
// - Future: Right-click or long-press to assign new block to slot`}
          </pre>
        </Well>
      </View>

      {/* Feature Notes */}
      <View marginTop="size-600">
        <Heading level={3}>Features</Heading>
        <Content>
          <ul>
            <li>5 customizable slots for frequently used blocks</li>
            <li>Empty slots displayed as gray placeholder squares</li>
            <li>Selected slot highlighted with accent ring</li>
            <li>Keyboard shortcuts support (future: number keys 1-5)</li>
            <li>Color swatch represents block's 2D rendering color</li>
            <li>Accessible via React Spectrum ActionGroup</li>
          </ul>
        </Content>
      </View>
    </View>
  );
}
