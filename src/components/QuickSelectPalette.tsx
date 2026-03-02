import {
  ActionGroup,
  Item,
  ColorSwatch,
  View,
} from '@adobe/react-spectrum';
import type { Selection } from '@react-types/shared';
import type { Block } from '../types';

interface QuickSelectPaletteProps {
  slots: (string | null)[];
  selectedSlotIndex: number | null;
  blocks: Block[]; // All blocks to look up by ID
  onSelectSlot: (index: number) => void;
  onAssignSlot?: (index: number, blockId: string) => void; // Future enhancement
}

/**
 * QuickSelectPalette - 5-slot quick-select palette for materials
 *
 * Features:
 * - 5 slots shown as color swatches or empty squares
 * - Click to select slot (makes that block the active material)
 * - Empty slots shown as gray squares
 * - Right-click or long-press to assign new block (future enhancement)
 *
 * Uses React Spectrum ActionGroup with ColorSwatch for consistent
 * theming and accessibility.
 */
export function QuickSelectPalette({
  slots,
  selectedSlotIndex,
  blocks,
  onSelectSlot,
}: QuickSelectPaletteProps) {
  const handleSelectionChange = (keys: Selection) => {
    if (keys !== 'all' && keys.size > 0) {
      const selectedKey = Array.from(keys)[0] as string;
      const index = parseInt(selectedKey, 10);
      onSelectSlot(index);
    }
  };

  const getBlock = (blockId: string | null): Block | null => {
    if (!blockId) {
      return null;
    }
    return blocks.find((b) => b.id === blockId) || null;
  };

  const renderSlot = (index: number) => {
    const blockId = slots[index];
    const block = getBlock(blockId);

    return (
      <Item key={index.toString()} textValue={block?.name || `Slot ${index + 1}`}>
        {block ? (
          <ColorSwatch color={block.color} />
        ) : (
          <View
            width="size-400"
            height="size-400"
            backgroundColor="gray-300"
            borderRadius="small"
            borderWidth="thin"
            borderColor="gray-500"
          />
        )}
      </Item>
    );
  };

  const selectedKeys =
    selectedSlotIndex !== null
      ? new Set([selectedSlotIndex.toString()])
      : new Set<string>();

  return (
    <ActionGroup
      selectionMode="single"
      selectedKeys={selectedKeys}
      onSelectionChange={handleSelectionChange}
      density="compact"
      aria-label="Quick select palette"
    >
      {[0, 1, 2, 3, 4].map(renderSlot)}
    </ActionGroup>
  );
}
