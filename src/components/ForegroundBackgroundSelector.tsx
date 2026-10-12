import { Box, Tooltip } from '@mui/material';
import { SwapHoriz } from '@mui/icons-material';

import type { Block } from '../types';

import { SHORTCUTS } from '../core/Shortcuts';

import { findBlockById } from '../utils/blockUtils';
import { BlockTextureSwatch } from './BlockTextureSwatch';
import { ShortcutTooltip } from './ShortcutTooltip';

interface ForegroundBackgroundSelectorProps {
  foregroundBlockId: string | null;
  backgroundBlockId: string | null;
  activeMaterialSlot: 'foreground' | 'background';
  blocks: Block[];
  onToggleSlot: () => void;
  onClickForeground: () => void;
  onClickBackground: () => void;
}

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

      <ShortcutTooltip title="Swap foreground/background" shortcut={SHORTCUTS.swapMaterialSlot}>
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
      </ShortcutTooltip>
    </Box>
  );
}
