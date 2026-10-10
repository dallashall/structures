import { Box, Typography } from '@mui/material';
import { useDroppable } from '@dnd-kit/core';

import type { Block } from '../types';

import { BlockTextureSwatch } from './BlockTextureSwatch';

interface QuickSelectDropSlotProps {
  block: Block | null;
  index: number;
  // True while a material drag is in progress, so the slot shows it accepts a drop
  isAccepting: boolean;
}

/**
 * QuickSelectDropSlot - One quick-select slot in the material browser. A material dropped on it fills it.
 */
export function QuickSelectDropSlot({ block, index, isAccepting }: QuickSelectDropSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${index}`,
    data: { slotIndex: index },
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        position: 'relative',
        width: 52,
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 2,
        borderStyle: isAccepting && !isOver ? 'dashed' : 'solid',
        borderColor: isOver ? 'primary.light' : isAccepting ? 'primary.main' : 'divider',
        borderRadius: 1,
        bgcolor: isOver ? 'primary.dark' : 'background.paper',
        boxShadow: isOver ? 6 : 0,
        transform: isOver ? 'scale(1.12)' : 'none',
        transition: 'transform 0.1s, background-color 0.1s, border-color 0.1s',
      }}
    >
      {block && <BlockTextureSwatch blockId={block.id} blockName={block.name} size="M" fallbackColor={block.color} />}
      <Typography
        variant="caption"
        sx={{ position: 'absolute', bottom: 1, right: 4, fontSize: '0.65rem', fontWeight: 'bold', color: 'text.secondary' }}
      >
        {index + 1}
      </Typography>
    </Box>
  );
}
