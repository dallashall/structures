import { Box, Typography } from '@mui/material';
import { useDndContext } from '@dnd-kit/core';

import type { Block } from '../types';

import { QuickSelectDropSlot } from './QuickSelectDropSlot';

import { findBlockById } from '../utils/blockUtils';

interface QuickSelectDropBarProps {
  slots: (string | null)[];
  blocks: Block[];
}

/**
 * QuickSelectDropBar - The nine quick-select slots at the foot of the material browser.
 * While a material is dragged the bar lights up, so the drop targets stand out.
 */
export function QuickSelectDropBar({ slots, blocks }: QuickSelectDropBarProps) {
  const isDragging = useDndContext().active !== null;

  const renderSlot = (blockId: string | null, index: number) => (
    <QuickSelectDropSlot key={index} index={index} block={findBlockById(blocks, blockId) ?? null} isAccepting={isDragging} />
  );

  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderTop: 2,
        borderColor: isDragging ? 'primary.main' : 'divider',
        bgcolor: isDragging ? 'action.selected' : 'background.default',
        transition: 'background-color 0.15s, border-color 0.15s',
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{ mb: 1, textAlign: 'center', fontWeight: 'bold', fontSize: '0.75rem', color: isDragging ? 'primary.light' : 'text.secondary' }}
      >
        {isDragging ? 'Drop on a slot to assign it' : 'Quick Select (1-9) · drag a material onto a slot'}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center' }}>
        {slots.map(renderSlot)}
      </Box>
    </Box>
  );
}
