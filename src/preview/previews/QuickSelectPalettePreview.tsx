import { useState } from 'react';
import { Box, Typography } from '@mui/material';
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
          selectedSlotIndex={null}
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
          selectedSlotIndex={0}
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
          selectedSlotIndex={1}
          blocks={mockBlocks}
          onSelectSlot={handleSelectSlot}
        />
      </Box>

      {/* Interactive Demo */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Interactive Demo</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Click slots to select different materials. Selected slot is
          highlighted with a ring.
        </Typography>
        <QuickSelectPalette
          slots={interactiveSlots}
          selectedSlotIndex={selectedSlotIndex}
          blocks={mockBlocks}
          onSelectSlot={handleSelectSlot}
        />
        {selectedBlockInfo && (
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300', mt: 3 }}>
            <Typography variant="h6" component="h4">Selected Block</Typography>
            <Typography variant="body1">
              <strong>Slot:</strong> {selectedSlotIndex !== null ? selectedSlotIndex + 1 : 'None'}
              <br />
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
        </Box>
      </Box>

      {/* Feature Notes */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3">Features</Typography>
        <Typography variant="body1" component="div">
          <ul>
            <li>5 customizable slots for frequently used blocks</li>
            <li>Empty slots displayed as gray placeholder squares</li>
            <li>Selected slot highlighted with accent ring</li>
            <li>Keyboard shortcuts support (future: number keys 1-5)</li>
            <li>Color swatch represents block's 2D rendering color</li>
            <li>Accessible via React Spectrum ActionGroup</li>
          </ul>
        </Typography>
      </Box>
    </Box>
  );
}
