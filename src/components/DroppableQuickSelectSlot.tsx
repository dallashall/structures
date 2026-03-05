import { Box, Tooltip } from '@mui/material';
import { useDroppable } from '@dnd-kit/core';
import type { Block } from '../types';
import { ColorSwatch } from './ColorSwatch';

interface DroppableQuickSelectSlotProps {
  index: number;
  isSelected: boolean;
  block: Block | null;
  onClick: (index: number) => void;
}

/**
 * DroppableQuickSelectSlot - A droppable quick-select slot
 *
 * Renders a quick-select slot that can accept dragged materials.
 */
export function DroppableQuickSelectSlot({
  index,
  isSelected,
  block,
  onClick,
}: DroppableQuickSelectSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${index}`,
    data: { slotIndex: index },
  });

  const handleClick = () => {
    onClick(index);
  };

  const tooltipTitle = block ? block.name : `Slot ${index + 1} (${index + 1})`;

  return (
    <Tooltip title={tooltipTitle} placement="top">
      <Box
        ref={setNodeRef}
        onClick={handleClick}
        sx={{
          width: 48,
          height: 48,
          border: 2,
          borderColor: isOver ? 'primary.light' : isSelected ? 'primary.main' : 'divider',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          bgcolor: isOver ? 'action.hover' : block ? 'background.default' : 'action.hover',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.light',
            transform: 'scale(1.05)',
          },
        }}
      >
        {block && <ColorSwatch color={block.color} size="L" />}

        {/* Slot number indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            fontSize: '0.7rem',
            fontWeight: 'bold',
            color: 'text.secondary',
            bgcolor: 'background.paper',
            px: 0.5,
            borderRadius: 0.5,
            lineHeight: 1,
          }}
        >
          {index + 1}
        </Box>
      </Box>
    </Tooltip>
  );
}
