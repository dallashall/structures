import type React from 'react';
import { Box, Typography } from '@mui/material';

import type { Block } from '../types';

import { BlockTextureSwatch } from './BlockTextureSwatch';

interface MaterialTileProps {
  block: Block;
  isGrabbed: boolean;
  onClick: (event: React.MouseEvent) => void;
}

/**
 * MaterialTile - One block in the material browser grid. Click picks it up.
 */
export function MaterialTile({ block, isGrabbed, onClick }: MaterialTileProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 0.5,
        borderRadius: 1,
        border: 2,
        borderColor: isGrabbed ? 'primary.main' : 'transparent',
        bgcolor: isGrabbed ? 'action.selected' : 'transparent',
        '&:hover': {
          bgcolor: isGrabbed ? 'action.selected' : 'action.hover',
        },
        transition: 'all 0.1s',
      }}
    >
      <BlockTextureSwatch blockId={block.id} blockName={block.name} size="L" fallbackColor={block.color} />
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.65rem',
          mt: 0.25,
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
        }}
      >
        {block.name}
      </Typography>
    </Box>
  );
}
