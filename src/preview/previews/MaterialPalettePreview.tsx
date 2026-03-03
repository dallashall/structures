import { useState } from 'react';
import { Box, Typography } from '@mui/material';
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
      <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300', mt: 2 }}>
        <Typography variant="h6" component="h4">Selected Block Details</Typography>
        <Typography variant="body1">
          <strong>ID:</strong> {selectedId}
          <br />
          <strong>Name:</strong> {block?.name}
          <br />
          <strong>Category:</strong> {block?.category}
          <br />
          <strong>Color:</strong> {block?.color}
        </Typography>
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h4" component="h1">MaterialPalette</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        A thin wrapper around React Spectrum's ActionGroup with ColorSwatch items.
        Displays a selectable palette of Minecraft blocks with automatic theming.
      </Typography>

      {/* Small Set (Stone Blocks) */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Small Set (Stone Category)</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          6 blocks from the stone category
        </Typography>
        <MaterialPalette
          blocks={getBlocksByCategory('stone')}
          selectedBlockId={null}
          onSelectBlock={mockCallbacks.onSelectBlock}
        />
      </Box>

      {/* Medium Set (Wood Blocks) */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Medium Set (Wood Category)</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          6 blocks from the wood category
        </Typography>
        <MaterialPalette
          blocks={getBlocksByCategory('wood')}
          selectedBlockId={null}
          onSelectBlock={mockCallbacks.onSelectBlock}
        />
      </Box>

      {/* Large Set (Decoration Blocks) */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Large Set (Decoration Category)</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          8 blocks from the decoration category showing grid responsiveness
        </Typography>
        <MaterialPalette
          blocks={getBlocksByCategory('decoration')}
          selectedBlockId={null}
          onSelectBlock={mockCallbacks.onSelectBlock}
        />
      </Box>

      {/* Full Set (All Blocks) */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Full Block Registry</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          All {mockBlocks.length} available blocks in the registry
        </Typography>
        <MaterialPalette
          blocks={mockBlocks}
          selectedBlockId={null}
          onSelectBlock={mockCallbacks.onSelectBlock}
        />
      </Box>

      {/* Interactive Selection */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Interactive Selection</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Click any block to select it. Currently selected:{' '}
          <strong>{selectedId || 'none'}</strong>
        </Typography>
        <MaterialPalette
          blocks={mockBlocks}
          selectedBlockId={selectedId}
          onSelectBlock={handleSelect}
        />
        {renderBlockDetails()}
      </Box>

      {/* With Pre-selection */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">With Pre-selected Block</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Palette with "oak_planks" pre-selected
        </Typography>
        <MaterialPalette
          blocks={mockBlocks.slice(0, 16)}
          selectedBlockId="oak_planks"
          onSelectBlock={mockCallbacks.onSelectBlock}
        />
      </Box>

      {/* Responsive Behavior */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Responsive Grid Behavior</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Constrained width to demonstrate grid auto-fill responsiveness
        </Typography>
        <Box sx={{ maxWidth: 400 }}>
          <MaterialPalette
            blocks={mockBlocks.slice(0, 20)}
            selectedBlockId={null}
            onSelectBlock={mockCallbacks.onSelectBlock}
          />
        </Box>
      </Box>

      {/* Props Documentation */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3">Props Interface</Typography>
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300' }}>
          <Typography variant="body1" component="pre">
            {`interface MaterialPaletteProps {
  blocks: Block[];                 // Array of blocks to display
  selectedBlockId: string | null;  // Currently selected block ID
  onSelectBlock: (blockId: string) => void;  // Selection callback
}

// Uses React Spectrum's ActionGroup with ColorSwatch
// Automatic theming and accessibility support
// Keyboard navigation built-in`}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
