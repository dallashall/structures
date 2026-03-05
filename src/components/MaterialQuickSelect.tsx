import { Paper, IconButton, Tooltip } from '@mui/material';
import { Apps } from '@mui/icons-material';
import type { Block } from '../types';
import { DroppableQuickSelectSlot } from './DroppableQuickSelectSlot';

interface MaterialQuickSelectProps {
  slots: (string | null)[];
  selectedSlotIndex: number;
  blocks: Block[];
  onSelectSlot: (index: number) => void;
  onOpenBrowser: () => void;
}

/**
 * MaterialQuickSelect - Floating horizontal material quick-select bar
 *
 * Minecraft-style material selector with:
 * - 9 quick-select slots (keyboard shortcuts 1-9)
 * - Material browser button
 * - Compact, always-visible design
 */
export function MaterialQuickSelect({
  slots,
  selectedSlotIndex,
  blocks,
  onSelectSlot,
  onOpenBrowser,
}: MaterialQuickSelectProps) {
  const handleSlotClick = (index: number) => {
    onSelectSlot(index);
  };

  const matchesBlockId = (blockId: string | null) => (b: Block) => b.id === blockId;

  const getBlockById = (blockId: string | null): Block | null => {
    if (!blockId) return null;
    return blocks.find(matchesBlockId(blockId)) ?? null;
  };

  const renderSlot = (blockId: string | null, index: number) => {
    const block = getBlockById(blockId);
    const isSelected = index === selectedSlotIndex;

    return (
      <DroppableQuickSelectSlot
        key={index}
        index={index}
        isSelected={isSelected}
        block={block}
        onClick={handleSlotClick}
      />
    );
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        p: 1,
        bgcolor: 'background.paper',
        borderRadius: 2,
        zIndex: 1000,
      }}
    >
      {/* 9 Quick Select Slots */}
      {slots.map(renderSlot)}

      {/* Material Browser Button */}
      <Tooltip title="Open Material Browser (E)" placement="top">
        <IconButton
          onClick={onOpenBrowser}
          sx={{
            width: 48,
            height: 48,
            border: 2,
            borderColor: 'divider',
            borderRadius: 1,
            '&:hover': {
              borderColor: 'primary.light',
            },
          }}
        >
          <Apps />
        </IconButton>
      </Tooltip>
    </Paper>
  );
}
