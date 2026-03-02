import { Well, ActionGroup, Item, ColorSwatch } from '@adobe/react-spectrum';
import type { Selection } from '@react-types/shared';
import type { Block } from '../types';

interface MaterialPaletteProps {
  blocks: Block[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
}

/**
 * MaterialPalette - Grid display of available Minecraft blocks
 *
 * Thin wrapper around React Spectrum's ActionGroup with ColorSwatch items.
 * Displays a collection of block types as a selectable color palette.
 * Users can click any block to select it as the active material for painting.
 *
 * Uses ActionGroup for selection state management and ColorSwatch for
 * proper color display with automatic theming and accessibility.
 */
export function MaterialPalette({
  blocks,
  selectedBlockId,
  onSelectBlock,
}: MaterialPaletteProps) {
  const handleSelectionChange = (keys: Selection) => {
    if (keys !== 'all' && keys.size > 0) {
      const selectedId = Array.from(keys)[0] as string;
      onSelectBlock(selectedId);
    }
  };

  const renderItem = (block: Block) => {
    return (
      <Item key={block.id} textValue={block.name}>
        <ColorSwatch color={block.color} />
      </Item>
    );
  };

  return (
    <Well>
      <ActionGroup
        selectionMode="single"
        selectedKeys={selectedBlockId ? new Set([selectedBlockId]) : new Set()}
        onSelectionChange={handleSelectionChange}
        aria-label="Material palette"
        density="compact"
      >
        {blocks.map(renderItem)}
      </ActionGroup>
    </Well>
  );
}
