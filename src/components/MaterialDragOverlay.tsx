import { Box, Typography } from '@mui/material';
import { DragOverlay, useDndContext } from '@dnd-kit/core';

import type { Block } from '../types';

import { BlockTextureSwatch } from './BlockTextureSwatch';

import { findBlockById } from '../utils/blockUtils';

interface MaterialDragOverlayProps {
  blocks: Block[];
}

/**
 * The material that follows the pointer during a drag. It renders outside the windowed grid, so it survives its tile scrolling out of view.
 */
export function MaterialDragOverlay({ blocks }: MaterialDragOverlayProps) {
  const blockId = (useDndContext().active?.data.current as { blockId?: string } | undefined)?.blockId ?? null;
  const block = findBlockById(blocks, blockId);

  return (
    <DragOverlay dropAnimation={null}>
      {block && (
        <Box
          sx={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            p: 0.5,
            bgcolor: 'background.paper',
            border: 2,
            borderColor: 'primary.main',
            borderRadius: 1,
            boxShadow: 8,
            cursor: 'grabbing',
          }}
        >
          <BlockTextureSwatch blockId={block.id} blockName={block.name} size="L" fallbackColor={block.color} />
          <Typography variant="caption" sx={{ fontSize: '0.65rem', mt: 0.25, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {block.name}
          </Typography>
        </Box>
      )}
    </DragOverlay>
  );
}
