import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { QuickSelectPalette } from '../../components/QuickSelectPalette';
import { mockBlocks } from '../mockData';

/**
 * Preview showcase for the QuickSelectPalette component
 * Demonstrates 9-slot quick-select palette for rapid material switching
 */
export function QuickSelectPalettePreview() {
  const handleSelectSlot = (index: number) => {
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

  const selectedBlock = interactiveSlots[0];
  const selectedBlockInfo = mockBlocks.find((b) => b.id === selectedBlock);

  return (
    <Box>
      <Typography variant="h4" component="h1">QuickSelectPalette</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        5-slot quick-select palette for rapid material switching during editing.
        Displays blocks as color swatches with selection state.
      </Typography>

      {/* Empty State */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Empty State</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Palette with no blocks assigned. Shows empty gray squares.
        </Typography>
        <QuickSelectPalette
          slots={emptySlots}
          blocks={mockBlocks}
          onSelectSlot={handleSelectSlot}
        />
      </Box>

      {/* Partial State */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Partially Filled</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Palette with some slots filled, others empty.
        </Typography>
        <QuickSelectPalette
          slots={partialSlots}
          blocks={mockBlocks}
          onSelectSlot={handleSelectSlot}
        />
      </Box>

      {/* Full State */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">All Slots Filled</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Palette with all 5 slots assigned. Second slot selected.
        </Typography>
        <QuickSelectPalette
          slots={fullSlots}
          blocks={mockBlocks}
          onSelectSlot={handleSelectSlot}
        />
      </Box>

      {/* Interactive Demo */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Interactive Demo</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Click slots to apply materials to the active foreground/background slot.
          No selection state - just instant application.
        </Typography>
        <QuickSelectPalette
          slots={interactiveSlots}
          blocks={mockBlocks}
          onSelectSlot={handleSelectSlot}
        />
        {selectedBlockInfo && (
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300', mt: 3 }}>
            <Typography variant="h6" component="h4">First Block in Palette</Typography>
            <Typography variant="body1">
              <strong>Block:</strong> {selectedBlockInfo.name}
              <br />
              <strong>ID:</strong> {selectedBlockInfo.id}
            </Typography>
          </Box>
        )}
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
            {`interface QuickSelectPaletteProps {
  slots: (string | null)[];      // 9 block IDs or null for empty
  blocks: Block[];                   // All blocks for lookup
  onSelectSlot: (index: number) => void;  // Apply block from slot to active material
  onAssignSlot?: (index: number) => void; // Assign current block to slot
  onOpenBrowser?: () => void;     // Open material browser
  orientation?: 'horizontal' | 'vertical'; // Layout orientation
}

// Usage:
// - Click slot to apply that block to active foreground/background
// - No selection state - just instant application
// - Right-click to assign currently selected block to that slot
// - Empty slots shown as gray squares
// - Number keys 1-9 trigger same action as clicking slots`}
          </pre>
        </Box>
      </Box>

      {/* Feature Notes */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3">Features</Typography>
        <Typography variant="body1" component="div">
          <ul>
            <li>9 customizable slots for frequently used blocks</li>
            <li>Empty slots displayed as gray placeholder squares</li>
            <li>No selection state - clicking applies block immediately</li>
            <li>Keyboard shortcuts: number keys 1-9 apply blocks from slots</li>
            <li>Right-click to assign currently selected block to slot</li>
            <li>Color swatch represents block's 2D rendering color</li>
            <li>Vertical or horizontal orientation support</li>
          </ul>
        </Typography>
      </Box>
    </Box>
  );
}
