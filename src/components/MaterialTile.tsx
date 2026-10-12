import { Box, Typography } from '@mui/material';
import { useDraggable } from '@dnd-kit/core';

import type { Block } from '../types';

import { BlockTextureSwatch } from './BlockTextureSwatch';

interface MaterialTileProps {
  block: Block;
  onPick: (blockId: string) => void;
}

/**
 * Press and drag onto a quick-select slot to assign it there. A click puts it in the active slot.
 * The drag ends on release, so nothing stays attached to the pointer.
 */
export function MaterialTile({ block, onPick }: MaterialTileProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `material-${block.id}`,
    data: { blockId: block.id },
  });

  const handleClick = (): void => onPick(block.id);

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      title={block.name}
      sx={{
        cursor: isDragging ? 'grabbing' : 'grab',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 0.5,
        borderRadius: 1,
        border: 2,
        borderColor: isDragging ? 'primary.main' : 'transparent',
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
        '&:hover': { bgcolor: 'action.hover' },
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
