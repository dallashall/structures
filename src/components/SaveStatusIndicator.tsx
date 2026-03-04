import { Box, Typography, CircularProgress } from '@mui/material';
import { CheckCircle, Schedule } from '@mui/icons-material';
import type { SaveState } from '../core/StorageManager';

interface SaveStatusIndicatorProps {
  saveState: SaveState;
}

/**
 * SaveStatusIndicator - Displays current autosave status
 *
 * Shows one of three states:
 * - Saved: Green checkmark with "Saved" text
 * - Pending: Clock icon with "Unsaved changes" text
 * - Saving: Spinner with "Saving..." text
 *
 * Uses MUI components for consistent theming.
 */
export function SaveStatusIndicator({ saveState }: SaveStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (saveState) {
      case 'saved':
        return {
          icon: <CheckCircle sx={{ fontSize: 18 }} />,
          text: 'Saved',
          color: 'success.main',
        };
      case 'pending':
        return {
          icon: <Schedule sx={{ fontSize: 18 }} />,
          text: 'Unsaved changes',
          color: 'warning.main',
        };
      case 'saving':
        return {
          icon: <CircularProgress size={18} thickness={5} />,  // Match icon size: 18px
          text: 'Saving...',
          color: 'info.main',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        bgcolor: 'action.hover',
        minWidth: 110, // Fixed min width prevents size changes between states
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: config.color,
          width: 18, // Fixed icon width
          height: 18, // Fixed icon height - prevents vertical size changes
        }}
      >
        {config.icon}
      </Box>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 500,
          color: 'text.secondary',
          lineHeight: 1,
          whiteSpace: 'nowrap', // Prevent text wrapping
        }}
      >
        {config.text}
      </Typography>
    </Box>
  );
}
