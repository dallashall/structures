import React from 'react';
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  Slider,
  Radio,
  RadioGroup,
  Typography,
  Chip,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import type { DepthConfig } from '../types';

interface DepthPaintingControlProps {
  depthConfig: DepthConfig;
  onDepthConfigChange: (config: Partial<DepthConfig>) => void;
  compact?: boolean;
}

/**
 * DepthPaintingControl - Configure depth painting for multi-layer operations
 *
 * Allows enabling/disabling depth painting, adjusting thickness (1-10 layers),
 * and selecting collision mode (through all vs until-collision).
 */
export function DepthPaintingControl({
  depthConfig,
  onDepthConfigChange,
  compact = false,
}: DepthPaintingControlProps) {
  const handleEnabledChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onDepthConfigChange({ enabled: event.target.checked });
  };

  const handleThicknessChange = (_event: Event, value: number | number[]) => {
    if (typeof value === 'number') {
      onDepthConfigChange({ thickness: value });
    }
  };

  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onDepthConfigChange({ mode: event.target.value as 'through' | 'until-collision' });
  };

  // Compact horizontal layout for toolbar
  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={depthConfig.enabled}
              onChange={handleEnabledChange}
              size="small"
            />
          }
          label={
            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              Depth
            </Typography>
          }
          sx={{ m: 0 }}
        />
        {depthConfig.enabled && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 80 }}>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                {depthConfig.thickness}L
              </Typography>
              <Slider
                value={depthConfig.thickness}
                onChange={handleThicknessChange}
                min={1}
                max={10}
                size="small"
                sx={{ width: 60 }}
              />
            </Box>
            <Chip
              size="small"
              label={depthConfig.mode === 'through' ? 'Through' : 'Until Hit'}
              onClick={() => onDepthConfigChange({ mode: depthConfig.mode === 'through' ? 'until-collision' : 'through' })}
              sx={{ height: '20px', fontSize: '0.65rem', cursor: 'pointer' }}
            />
          </>
        )}
      </Box>
    );
  }

  // Full vertical layout for side panel
  return (
    <Box>
      <Accordion
        sx={{
          boxShadow: 'none',
          '&:before': { display: 'none' },
          bgcolor: 'transparent',
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          sx={{
            px: 0.5,
            minHeight: 'auto',
            '& .MuiAccordionSummary-content': {
              my: 1,
              alignItems: 'center',
              gap: 1,
            },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 'bold',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Depth Painting
          </Typography>
          <Chip
            size="small"
            label={depthConfig.enabled ? `${depthConfig.thickness} layers` : 'Disabled'}
            color={depthConfig.enabled ? 'success' : 'default'}
            sx={{ height: '18px', fontSize: '0.65rem' }}
          />
        </AccordionSummary>
        <AccordionDetails sx={{ px: 0.5, pt: 0 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={depthConfig.enabled}
                onChange={handleEnabledChange}
                size="small"
              />
            }
            label={
              <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                Enable depth painting
              </Typography>
            }
          />

          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography
              variant="caption"
              gutterBottom
              sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
            >
              Thickness: {depthConfig.thickness} {depthConfig.thickness === 1 ? 'layer' : 'layers'}
            </Typography>
            <Slider
              value={depthConfig.thickness}
              onChange={handleThicknessChange}
              min={1}
              max={10}
              marks={[
                { value: 1, label: '1' },
                { value: 5, label: '5' },
                { value: 10, label: '10' },
              ]}
              disabled={!depthConfig.enabled}
              size="small"
              sx={{
                '& .MuiSlider-markLabel': {
                  fontSize: '0.65rem',
                },
              }}
            />
          </Box>

          <RadioGroup
            value={depthConfig.mode}
            onChange={handleModeChange}
          >
            <FormControlLabel
              value="through"
              control={<Radio size="small" />}
              label={
                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                  Paint through all layers
                </Typography>
              }
              disabled={!depthConfig.enabled}
            />
            <FormControlLabel
              value="until-collision"
              control={<Radio size="small" />}
              label={
                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                  Stop at existing blocks
                </Typography>
              }
              disabled={!depthConfig.enabled}
            />
          </RadioGroup>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
