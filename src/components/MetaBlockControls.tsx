import { IconButton, Stack, Typography } from '@mui/material';
import { RotateLeft, RotateRight } from '@mui/icons-material';

import type { HorizontalDirection } from '../types';

import { SHORTCUTS } from '../core/Shortcuts';

import { ShortcutTooltip } from './ShortcutTooltip';

interface MetaBlockControlsProps {
  direction: HorizontalDirection;
  onTurnLeft: () => void;
  onTurnRight: () => void;
}

// "y-" reads as "−Y", matching the axis labels on the 2D views
const toAxisLabel = (direction: HorizontalDirection): string =>
  `${direction[1] === '-' ? '−' : '+'}${direction[0].toUpperCase()}`;

export function MetaBlockControls({ direction, onTurnLeft, onTurnRight }: MetaBlockControlsProps) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
        Facing {toAxisLabel(direction)}
      </Typography>
      <ShortcutTooltip title="Turn left" shortcut={`Shift+${SHORTCUTS.rotateFacing}`}>
        <IconButton size="small" aria-label="Turn meta block left" onClick={onTurnLeft}>
          <RotateLeft fontSize="small" />
        </IconButton>
      </ShortcutTooltip>
      <ShortcutTooltip title="Turn right" shortcut={SHORTCUTS.rotateFacing}>
        <IconButton size="small" aria-label="Turn meta block right" onClick={onTurnRight}>
          <RotateRight fontSize="small" />
        </IconButton>
      </ShortcutTooltip>
      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
        Click a 2D view to move it
      </Typography>
    </Stack>
  );
}
