import React from 'react';
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Brush,
  FormatColorFill,
  BorderOuter,
  Circle,
  Timeline,
  Edit,
  SwapHoriz,
  FilterAlt,
} from '@mui/icons-material';
import type { PaintMode, PaintBehavior, ShapeFillMode, DepthConfig } from '../types';
import { ShapeFillModeControl } from './ShapeFillModeControl';
import { DepthPaintingControl } from './DepthPaintingControl';

interface PaintControlsProps {
  paintMode: PaintMode;
  paintBehavior: PaintBehavior;
  shapeFillMode: ShapeFillMode;
  depthConfig: DepthConfig;
  onPaintModeChange: (mode: PaintMode) => void;
  onPaintBehaviorChange: (behavior: PaintBehavior) => void;
  onShapeFillModeChange: (mode: ShapeFillMode) => void;
  onDepthConfigChange: (config: Partial<DepthConfig>) => void;
  orientation?: 'horizontal' | 'vertical';
}

/**
 * PaintControls - UI for selecting paint mode and behavior
 *
 * Allows user to switch between:
 * - Paint modes: point, fill, outline, circle, arch, curve
 * - Shape fill modes: outline, filled
 * - Depth configuration for multi-layer painting
 * - Paint behaviors: normal, only-replace, selective-replace
 *
 * Designed to be placed in the action bar near the material picker.
 */
export function PaintControls({
  paintMode,
  paintBehavior,
  shapeFillMode,
  depthConfig,
  onPaintModeChange,
  onPaintBehaviorChange,
  onShapeFillModeChange,
  onDepthConfigChange,
  orientation = 'vertical',
}: PaintControlsProps) {
  const handleModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: PaintMode | null
  ) => {
    if (newMode !== null) {
      onPaintModeChange(newMode);
    }
  };

  const handleBehaviorChange = (
    _event: React.MouseEvent<HTMLElement>,
    newBehavior: PaintBehavior | null
  ) => {
    if (newBehavior !== null) {
      onPaintBehaviorChange(newBehavior);
    }
  };

  // Check if current mode is a shape mode that supports fill
  const isShapeMode = ['outline', 'circle', 'arch', 'curve'].includes(paintMode);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        width: '100%',
      }}
    >
      {/* Paint Mode Section */}
      <Box>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 0.5,
            px: 0.5,
            color: 'text.secondary',
            fontWeight: 'bold',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Paint Mode
        </Typography>
        <ToggleButtonGroup
          value={paintMode}
          exclusive
          onChange={handleModeChange}
          orientation={orientation}
          fullWidth
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              py: 1,
              px: 1.5,
              border: 1,
              borderColor: 'divider',
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              },
            },
          }}
        >
          <ToggleButton value="point" aria-label="Point mode">
            <Tooltip title="Point - Paint single cells" placement="left">
              <Brush fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="fill" aria-label="Fill mode">
            <Tooltip title="Fill - Flood fill connected regions" placement="left">
              <FormatColorFill fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="outline" aria-label="Outline mode">
            <Tooltip title="Rectangle - Draw rectangles" placement="left">
              <BorderOuter fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="circle" aria-label="Circle mode">
            <Tooltip title="Circle - Draw circles (Shift: bbox, Ctrl: 1:1)" placement="left">
              <Circle fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="arch" aria-label="Arch mode">
            <Tooltip title="Arch - Draw curved arches" placement="left">
              <Box sx={{ fontSize: 'small' }}>⌒</Box>
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="curve" aria-label="Curve mode">
            <Tooltip title="Curve - Draw bezier curves" placement="left">
              <Timeline fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Shape Fill Mode Section (only for shape modes) */}
      {isShapeMode && (
        <>
          <Divider />
          <ShapeFillModeControl
            shapeFillMode={shapeFillMode}
            onShapeFillModeChange={onShapeFillModeChange}
            orientation={orientation}
          />
        </>
      )}

      {/* Depth Painting Section */}
      <Divider sx={{ mt: isShapeMode ? 0 : 0 }} />
      <DepthPaintingControl
        depthConfig={depthConfig}
        onDepthConfigChange={onDepthConfigChange}
      />

      <Divider />

      {/* Paint Behavior Section */}
      <Box>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 0.5,
            px: 0.5,
            color: 'text.secondary',
            fontWeight: 'bold',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Behavior
        </Typography>
        <ToggleButtonGroup
          value={paintBehavior}
          exclusive
          onChange={handleBehaviorChange}
          orientation={orientation}
          fullWidth
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              py: 1,
              px: 1.5,
              border: 1,
              borderColor: 'divider',
              fontSize: '0.7rem',
              '&.Mui-selected': {
                bgcolor: 'secondary.main',
                color: 'secondary.contrastText',
                '&:hover': {
                  bgcolor: 'secondary.dark',
                },
              },
            },
          }}
        >
          <ToggleButton value="normal" aria-label="Normal behavior">
            <Tooltip title="Normal - Paint anywhere" placement="left">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Edit fontSize="small" />
              </Box>
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="only-replace" aria-label="Only replace existing blocks">
            <Tooltip title="Only Replace - Only paint over existing blocks" placement="left">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SwapHoriz fontSize="small" />
              </Box>
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="selective-replace" aria-label="Selective replace">
            <Tooltip title="Selective - Only replace specific block type" placement="left">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FilterAlt fontSize="small" />
              </Box>
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Box>
  );
}
