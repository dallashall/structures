import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Tooltip,
} from '@mui/material';
import type { BlockStateProperties, AxisDirection } from '../types';

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
 * - Stairs: facing direction + half
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

      {/* Half controls (stairs) */}
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
          <ToggleButton value="bottom" aria-label="Bottom half">
            <Tooltip title="Bottom stair [Y]" placement="top">
              <Box>Bot</Box>
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="top" aria-label="Top half">
            <Tooltip title="Top stair [Y]" placement="top">
              <Box>Top</Box>
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
          <ToggleButton value="y-" aria-label="Facing -Y">
            <Tooltip title="-Y [T]" placement="top">
              <Box>-Y</Box>
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="x+" aria-label="Facing +X">
            <Tooltip title="+X [T]" placement="top">
              <Box>+X</Box>
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="y+" aria-label="Facing +Y">
            <Tooltip title="+Y [T]" placement="top">
              <Box>+Y</Box>
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="x-" aria-label="Facing -X">
            <Tooltip title="-X [T]" placement="top">
              <Box>-X</Box>
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      )}
    </Box>
  );
}
