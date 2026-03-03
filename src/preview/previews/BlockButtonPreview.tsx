import { useState } from 'react';
import { Box, Typography, Stack } from '@mui/material';
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
    <Box>
      <Typography variant="h4" component="h1">BlockButton</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        A fundamental UI primitive that represents a Minecraft block type.
        Shows the block's color and displays its name in a tooltip on hover.
      </Typography>

      {/* Default State */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Default State</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Unselected block button - hover to see tooltip
        </Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          {renderBlockButton(mockBlocks[0], false)}
        </Stack>
      </Box>

      {/* Selected State */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Selected State</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Block button with selection highlight (blue border and glow)
        </Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          {renderBlockButton(mockBlocks[0], true)}
        </Stack>
      </Box>

      {/* Multiple Blocks */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Multiple Blocks (Stone Category)</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Collection of stone-type blocks showing color variety
        </Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          {mockBlocks.filter(filterStone).map((block) => renderBlockButton(block, false))}
        </Stack>
      </Box>

      {/* Wood Blocks */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Multiple Blocks (Wood Category)</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Collection of wood-type blocks
        </Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          {mockBlocks.filter(filterWood).map((block) => renderBlockButton(block, false))}
        </Stack>
      </Box>

      {/* Interactive Selection */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Interactive Selection</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Click any block to select it. Check console for callback logs.
          Currently selected: <strong>{selectedId || 'none'}</strong>
        </Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          {mockBlocks.slice(0, 12).map(renderInteractiveBlockButton)}
        </Stack>
      </Box>

      {/* Props Documentation */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3">Props Interface</Typography>
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300' }}>
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
        </Box>
      </Box>
    </Box>
  );
}
