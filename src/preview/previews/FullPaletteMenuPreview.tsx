import { useState } from 'react';
import { Box, Typography, Stack } from '@mui/material';
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
    <Box>
      <Typography variant="h4" component="h1">FullPaletteMenu</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Popover menu (non-modal) displaying the full block catalog with fuzzy
        search and category organization. Triggered by button press.
      </Typography>

      {/* Interactive Demo */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Interactive Demo</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Click the "All Blocks" button to open the popover. The menu doesn't
          block the rest of the UI.
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center">
          <FullPaletteMenu blocks={mockBlocks} selectedBlockId={selectedBlock} onSelectBlock={handleSelectBlock} />

          {selectedBlockInfo && (
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300' }}>
              <Typography variant="h6" component="h4">Selected: {selectedBlockInfo.name}</Typography>
              <div
                style={{
                  backgroundColor: selectedBlockInfo.color,
                  width: '32px',
                  height: '32px',
                  marginTop: '8px',
                  border: '1px solid #ccc',
                }}
              />
            </Box>
          )}
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
        </Box>
      </Box>

      {/* Feature Notes */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3">Features</Typography>
        <Typography variant="body1" component="div">
          <ul>
            <li>Fuzzy search across block names</li>
            <li>Blocks organized by category (stone, wood, decoration, etc.)</li>
            <li>Color swatch preview for each block</li>
            <li>Grid layout for efficient browsing</li>
            <li>Accessible keyboard navigation</li>
            <li>Responsive dialog sizing</li>
          </ul>
        </Typography>
      </Box>

      {/* Usage Notes */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3">Usage</Typography>
        <Typography variant="body1">
          Typically opened via a button in the main editor interface when users
          want to select blocks beyond the 5-slot quick-select palette.
        </Typography>
      </Box>
    </Box>
  );
}
