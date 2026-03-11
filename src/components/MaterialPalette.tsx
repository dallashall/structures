import { Box } from '@mui/material';

import type { Block } from '../types';

import { ActionGroup } from './ActionGroup';
import { ActionGroupItem } from './ActionGroupItem';
import { ColorSwatch } from './ColorSwatch';

interface MaterialPaletteProps {
  blocks: Block[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
}

/**
 * MaterialPalette - Grid display of available Minecraft blocks
 *
 * Displays a collection of block types as a selectable color palette.
 * Users can click any block to select it as the active material for painting.
 *
 * Uses our custom ActionGroup for selection state management and ColorSwatch for
 * proper color display with automatic theming and accessibility.
 */
export function MaterialPalette({
  blocks,
  selectedBlockId,
  onSelectBlock,
}: MaterialPaletteProps) {
  const handleSelectionChange = (keys: Set<string>) => {
    if (keys.size > 0) {
      const selectedId = Array.from(keys)[0] as string;
      onSelectBlock(selectedId);
    }
  };

  const renderItem = (block: Block) => {
    return (
      <ActionGroupItem
        key={block.id}
        itemKey={block.id}
        aria-label={block.name}
      >
        <ColorSwatch color={block.color} />
      </ActionGroupItem>
    );
  };

  return (
    <Box
      sx={{
        p: 1.5,
        bgcolor: 'grey.100',
        borderRadius: 1,
        border: 1,
        borderColor: 'grey.400',
      }}
    >
      <ActionGroup
        selectionMode="single"
        selectedKeys={selectedBlockId ? new Set([selectedBlockId]) : new Set()}
        onSelectionChange={handleSelectionChange}
        aria-label="Material palette"
        density="compact"
      >
        {blocks.map(renderItem)}
      </ActionGroup>
    </Box>
  );
}
