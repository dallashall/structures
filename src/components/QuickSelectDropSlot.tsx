import type React from 'react';
import { Box, Typography } from '@mui/material';

import type { Block } from '../types';

import { BlockTextureSwatch } from './BlockTextureSwatch';

interface QuickSelectDropSlotProps {
  block: Block | null;
  index: number;
  // True while a material is grabbed, so the slot accepts a drop
  isDropTarget: boolean;
  onClick: (event: React.MouseEvent) => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

/**
 * QuickSelectDropSlot - One quick-select slot in the material browser. Click drops the grabbed material.
 */
export function QuickSelectDropSlot({ block, index, isDropTarget, onClick, onContextMenu }: QuickSelectDropSlotProps) {
  return (
    <Box
      onClick={onClick}
      onContextMenu={onContextMenu}
      sx={{
        width: 48,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 2,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        cursor: isDropTarget ? 'pointer' : 'default',
        '&:hover': {
          borderColor: isDropTarget ? 'primary.main' : 'divider',
          bgcolor: isDropTarget ? 'action.hover' : 'background.paper',
        },
        transition: 'all 0.1s',
      }}
    >
      {block ? <BlockTextureSwatch blockId={block.id} blockName={block.name} size="M" fallbackColor={block.color} /> : (
        <Typography variant="caption" color="text.disabled">
          {index + 1}
        </Typography>
      )}
    </Box>
  );
}
