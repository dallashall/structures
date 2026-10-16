import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { BlockStateProperties, AxisDirection } from '../types';

import { SHORTCUTS } from '../core/Shortcuts';

import { ShortcutTooltip } from './ShortcutTooltip';

interface BlockStateControlsProps {
  activeBlockState: BlockStateProperties;
  hasBlockState: boolean;
  onSetBlockState: (state: BlockStateProperties) => void;
}

export function BlockStateControls({
  activeBlockState,
  hasBlockState,
  onSetBlockState,
}: BlockStateControlsProps) {
  if (!hasBlockState) return null;

  const showSlabControls = activeBlockState.type !== undefined;
  const showHalfControls = activeBlockState.half !== undefined;
  const showFacingControls = activeBlockState.facing !== undefined;

  if (!showSlabControls && !showHalfControls && !showFacingControls) return null;

  const handleSlabTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newType: 'top' | 'bottom' | 'double' | null,
  ) => {
    if (newType !== null) {
      onSetBlockState({ ...activeBlockState, type: newType });
    }
  };

  const handleHalfChange = (
    _event: React.MouseEvent<HTMLElement>,
    newHalf: 'top' | 'bottom' | null,
  ) => {
    if (newHalf !== null) {
      onSetBlockState({ ...activeBlockState, half: newHalf });
    }
  };

  const handleFacingChange = (
    _event: React.MouseEvent<HTMLElement>,
    newFacing: AxisDirection | null,
  ) => {
    if (newFacing !== null) {
      onSetBlockState({ ...activeBlockState, facing: newFacing });
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        px: 0.5,
        width: '100%',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          px: 0.5,
          color: 'text.secondary',
          fontWeight: 'bold',
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Orientation
      </Typography>

      {showSlabControls && (
        <ToggleButtonGroup
          value={activeBlockState.type}
          exclusive
          onChange={handleSlabTypeChange}
          size="small"
          fullWidth
          sx={{
            '& .MuiToggleButton-root': {
              py: 0.5,
              px: 0.5,
              fontSize: '0.6rem',
              lineHeight: 1.2,
              border: 1,
              borderColor: 'chrome.controlBorder',
              '&.Mui-selected': {
                bgcolor: 'info.main',
                color: 'info.contrastText',
                '&:hover': {
                  bgcolor: 'info.dark',
                },
              },
            },
          }}
        >
          <ToggleButton value="bottom" aria-label="Bottom slab">
            <ShortcutTooltip title="Bottom slab" shortcut={SHORTCUTS.flipHalf} shortcutHint="flips" placement="top">
              <Box>Bot</Box>
            </ShortcutTooltip>
          </ToggleButton>
          <ToggleButton value="top" aria-label="Top slab">
            <ShortcutTooltip title="Top slab" shortcut={SHORTCUTS.flipHalf} shortcutHint="flips" placement="top">
              <Box>Top</Box>
            </ShortcutTooltip>
          </ToggleButton>
          <ToggleButton value="double" aria-label="Double slab">
            <ShortcutTooltip title="Double slab" placement="top">
              <Box>Dbl</Box>
            </ShortcutTooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      )}

      {showHalfControls && (
        <ToggleButtonGroup
          value={activeBlockState.half}
          exclusive
          onChange={handleHalfChange}
          size="small"
          fullWidth
          sx={{
            '& .MuiToggleButton-root': {
              py: 0.5,
              px: 0.5,
              fontSize: '0.6rem',
              lineHeight: 1.2,
              border: 1,
              borderColor: 'chrome.controlBorder',
              '&.Mui-selected': {
                bgcolor: 'info.main',
                color: 'info.contrastText',
                '&:hover': {
                  bgcolor: 'info.dark',
                },
              },
            },
          }}
        >
          <ToggleButton value="bottom" aria-label="Bottom half">
            <ShortcutTooltip title="Bottom stair" shortcut={SHORTCUTS.flipHalf} shortcutHint="flips" placement="top">
              <Box>Bot</Box>
            </ShortcutTooltip>
          </ToggleButton>
          <ToggleButton value="top" aria-label="Top half">
            <ShortcutTooltip title="Top stair" shortcut={SHORTCUTS.flipHalf} shortcutHint="flips" placement="top">
              <Box>Top</Box>
            </ShortcutTooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      )}

      {showFacingControls && (
        <ToggleButtonGroup
          value={activeBlockState.facing}
          exclusive
          onChange={handleFacingChange}
          size="small"
          fullWidth
          sx={{
            '& .MuiToggleButton-root': {
              py: 0.5,
              px: 0.5,
              fontSize: '0.6rem',
              lineHeight: 1.2,
              border: 1,
              borderColor: 'chrome.controlBorder',
              '&.Mui-selected': {
                bgcolor: 'info.main',
                color: 'info.contrastText',
                '&:hover': {
                  bgcolor: 'info.dark',
                },
              },
            },
          }}
        >
          <ToggleButton value="y-" aria-label="Facing -Y">
            <ShortcutTooltip title="Facing -Y" shortcut={SHORTCUTS.rotateFacing} shortcutHint="rotates" placement="top">
              <Box>-Y</Box>
            </ShortcutTooltip>
          </ToggleButton>
          <ToggleButton value="x+" aria-label="Facing +X">
            <ShortcutTooltip title="Facing +X" shortcut={SHORTCUTS.rotateFacing} shortcutHint="rotates" placement="top">
              <Box>+X</Box>
            </ShortcutTooltip>
          </ToggleButton>
          <ToggleButton value="y+" aria-label="Facing +Y">
            <ShortcutTooltip title="Facing +Y" shortcut={SHORTCUTS.rotateFacing} shortcutHint="rotates" placement="top">
              <Box>+Y</Box>
            </ShortcutTooltip>
          </ToggleButton>
          <ToggleButton value="x-" aria-label="Facing -X">
            <ShortcutTooltip title="Facing -X" shortcut={SHORTCUTS.rotateFacing} shortcutHint="rotates" placement="top">
              <Box>-X</Box>
            </ShortcutTooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      )}
    </Box>
  );
}
