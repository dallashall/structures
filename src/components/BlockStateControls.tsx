import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Tooltip,
} from '@mui/material';
import type { BlockStateProperties } from '../types';

interface BlockStateControlsProps {
  activeBlockState: BlockStateProperties;
  hasBlockState: boolean;
  onSetBlockState: (state: BlockStateProperties) => void;
}

/**
 * BlockStateControls - Orientation controls for non-cube blocks
 *
 * Shows controls relevant to the currently selected block type:
 * - Slabs: top/bottom/double toggle
 * - Stairs (future): facing direction + half
 * - Doors (future): facing + hinge + open
 *
 * Only renders when the selected block has hasBlockState=true.
 */
export function BlockStateControls({
  activeBlockState,
  hasBlockState,
  onSetBlockState,
}: BlockStateControlsProps) {
  if (!hasBlockState) return null;

  // Determine which controls to show based on current state
  const showSlabControls = activeBlockState.type !== undefined;
  const showFacingControls = activeBlockState.facing !== undefined;

  if (!showSlabControls && !showFacingControls) return null;

  const handleSlabTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newType: 'top' | 'bottom' | 'double' | null,
  ) => {
    if (newType !== null) {
      onSetBlockState({ ...activeBlockState, type: newType });
    }
  };

  const handleFacingChange = (
    _event: React.MouseEvent<HTMLElement>,
    newFacing: 'north' | 'east' | 'south' | 'west' | null,
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

      {/* Slab type controls */}
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
              borderColor: 'divider',
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
            <Tooltip title="Bottom slab [Y]" placement="top">
              <Box>Bot</Box>
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="top" aria-label="Top slab">
            <Tooltip title="Top slab [Y]" placement="top">
              <Box>Top</Box>
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="double" aria-label="Double slab">
            <Tooltip title="Double slab" placement="top">
              <Box>Dbl</Box>
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      )}

      {/* Facing direction controls */}
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
              borderColor: 'divider',
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
          <ToggleButton value="north" aria-label="Facing north">
            <Tooltip title="North [T]" placement="top">
              <Box>N</Box>
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="east" aria-label="Facing east">
            <Tooltip title="East [T]" placement="top">
              <Box>E</Box>
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="south" aria-label="Facing south">
            <Tooltip title="South [T]" placement="top">
              <Box>S</Box>
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="west" aria-label="Facing west">
            <Tooltip title="West [T]" placement="top">
              <Box>W</Box>
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      )}
    </Box>
  );
}
