import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { Edit, SwapHoriz, FilterAlt } from '@mui/icons-material';
import type { PaintBehavior } from '../types';

interface PaintBehaviorControlProps {
  paintBehavior: PaintBehavior;
  onPaintBehaviorChange: (behavior: PaintBehavior) => void;
  orientation?: 'horizontal' | 'vertical';
}

/**
 * PaintBehaviorControl - Paint behavior mode selector
 *
 * Allows selection between:
 * - Normal: Paint anywhere (even in air)
 * - Only-Replace: Paint only over existing blocks
 * - Selective-Replace: Replace only specific block types
 *
 * Supports both horizontal and vertical orientations for flexible layout.
 */
export function PaintBehaviorControl({
  paintBehavior,
  onPaintBehaviorChange,
  orientation = 'horizontal',
}: PaintBehaviorControlProps) {
  const handleChange = (
    _event: React.MouseEvent<HTMLElement>,
    newBehavior: PaintBehavior | null
  ) => {
    if (newBehavior !== null) {
      onPaintBehaviorChange(newBehavior);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
        Behavior:
      </Typography>
      <ToggleButtonGroup
        value={paintBehavior}
        exclusive
        onChange={handleChange}
        orientation={orientation}
        size="small"
        sx={{
          '& .MuiToggleButton-root': {
            px: 1,
            py: 0.5,
            fontSize: '0.7rem',
          },
        }}
      >
        <Tooltip title="Normal - Paint anywhere">
          <ToggleButton value="normal" aria-label="Normal paint behavior">
            <Edit fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Only Replace - Paint over blocks only">
          <ToggleButton value="only-replace" aria-label="Only replace behavior">
            <SwapHoriz fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Selective Replace - Replace specific block type">
          <ToggleButton value="selective-replace" aria-label="Selective replace behavior">
            <FilterAlt fontSize="small" />
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>
    </Box>
  );
}
