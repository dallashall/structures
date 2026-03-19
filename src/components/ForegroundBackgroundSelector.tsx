import { Box, Tooltip } from '@mui/material';
import { SwapHoriz } from '@mui/icons-material';

import type { Block } from '../types';

import { findBlockById } from '../utils/blockUtils';
import { BlockTextureSwatch } from './BlockTextureSwatch';

interface ForegroundBackgroundSelectorProps {
  foregroundBlockId: string | null;
  backgroundBlockId: string | null;
  activeMaterialSlot: 'foreground' | 'background';
  blocks: Block[];
  onToggleSlot: () => void;
  onClickForeground: () => void;
  onClickBackground: () => void;
}

/**
 * ForegroundBackgroundSelector - Displays overlapping squares for foreground/background materials
 *
 * Similar to:
 * - Photoshop's foreground/background color selector
 * - Minecraft's left/right hand items
 *
 * Features:
 * - Click foreground square → activate foreground
 * - Click background square → activate background
 * - Click swap icon → toggle between foreground/background (like pressing 'F' in Minecraft)
 * - Active square has a highlight border
 */
export function ForegroundBackgroundSelector({
  foregroundBlockId,
  backgroundBlockId,
  activeMaterialSlot,
  blocks,
  onToggleSlot,
  onClickForeground,
  onClickBackground,
}: ForegroundBackgroundSelectorProps) {
  const foregroundBlock = findBlockById(blocks, foregroundBlockId);
  const backgroundBlock = findBlockById(blocks, backgroundBlockId);

  return (
    <Box
      sx={{
        position: 'relative',
        width: 56,
        height: 56,
        mx: 'auto',
      }}
    >
      {/* Background square (bottom-right) */}
      <Tooltip title="Background material (click to activate)">
        <Box
          onClick={onClickBackground}
          sx={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 36,
            height: 36,
            border: activeMaterialSlot === 'background' ? 3 : 2,
            borderColor: activeMaterialSlot === 'background' ? 'primary.main' : 'divider',
            cursor: 'pointer',
            overflow: 'hidden',
            '&:hover': {
              borderColor: activeMaterialSlot === 'background' ? 'primary.main' : 'text.secondary',
            },
          }}
        >
          {backgroundBlock && (
            <BlockTextureSwatch
              blockId={backgroundBlock.id}
              blockName={backgroundBlock.name}
              size="L"
              rounding="none"
              fallbackColor={backgroundBlock.color}
            />
          )}
        </Box>
      </Tooltip>

      {/* Foreground square (top-left) */}
      <Tooltip title="Foreground material (click to activate)">
        <Box
          onClick={onClickForeground}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 36,
            height: 36,
            border: activeMaterialSlot === 'foreground' ? 3 : 2,
            borderColor: activeMaterialSlot === 'foreground' ? 'primary.main' : 'divider',
            cursor: 'pointer',
            zIndex: 1,
            overflow: 'hidden',
            '&:hover': {
              borderColor: activeMaterialSlot === 'foreground' ? 'primary.main' : 'text.secondary',
            },
          }}
        >
          {foregroundBlock && (
            <BlockTextureSwatch
              blockId={foregroundBlock.id}
              blockName={foregroundBlock.name}
              size="L"
              rounding="none"
              fallbackColor={foregroundBlock.color}
            />
          )}
        </Box>
      </Tooltip>

      {/* Swap icon (bottom-left corner) */}
      <Tooltip title="Swap foreground/background (F key)">
        <Box
          onClick={onToggleSlot}
          sx={{
            position: 'absolute',
            bottom: -4,
            left: -4,
            width: 20,
            height: 20,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 2,
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <SwapHoriz sx={{ fontSize: 12 }} />
        </Box>
      </Tooltip>
    </Box>
  );
}
