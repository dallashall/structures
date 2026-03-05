import { Box, Typography } from '@mui/material';
import { useDraggable } from '@dnd-kit/core';
import type { Block } from '../types';
import { ColorSwatch } from './ColorSwatch';

interface DraggableMaterialBlockProps {
  block: Block;
  isSelected: boolean;
  onClick: (blockId: string) => void;
}

/**
 * DraggableMaterialBlock - A draggable material block for the material browser
 *
 * Renders a material block that can be dragged to quick-select slots.
 */
export function DraggableMaterialBlock({
  block,
  isSelected,
  onClick,
}: DraggableMaterialBlockProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `material-${block.id}`,
    data: { blockId: block.id },
  });

  const handleClick = () => {
    onClick(block.id);
  };

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.25,
        p: 0.5,
        border: 1,
        borderColor: isSelected ? 'primary.main' : 'transparent',
        borderRadius: 0.5,
        cursor: isDragging ? 'grabbing' : 'grab',
        bgcolor: isSelected ? 'action.selected' : 'transparent',
        opacity: isDragging ? 0.5 : 1,
        transition: 'all 0.2s',
        '&:hover': {
          bgcolor: 'action.hover',
          borderColor: isSelected ? 'primary.main' : 'divider',
        },
      }}
    >
      <ColorSwatch color={block.color} size="M" />
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.6rem',
          textAlign: 'center',
          lineHeight: 1.1,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {block.name}
      </Typography>
    </Box>
  );
}
