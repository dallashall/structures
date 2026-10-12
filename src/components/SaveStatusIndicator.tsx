import { Box, Typography, CircularProgress } from '@mui/material';
import { CheckCircle, ErrorOutline } from '@mui/icons-material';
import type { SaveState } from '../core/SaveTracker';

interface SaveStatusIndicatorProps {
  saveState: SaveState;
}

interface StatusConfig {
  icon: React.ReactNode;
  text: string;
  color: string;
}

const STATUS_CONFIG: Record<SaveState, StatusConfig> = {
  saved: {
    icon: <CheckCircle sx={{ fontSize: 18 }} />,
    text: 'Saved',
    color: 'success.main',
  },
  saving: {
    icon: <CircularProgress size={18} thickness={5} />,
    text: 'Saving...',
    color: 'info.main',
  },
  error: {
    icon: <ErrorOutline sx={{ fontSize: 18 }} />,
    text: 'Not saved',
    color: 'error.main',
  },
};

export function SaveStatusIndicator({ saveState }: SaveStatusIndicatorProps) {
  const config = STATUS_CONFIG[saveState];

  return (
    <Box
      role="status"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        bgcolor: 'action.hover',
        // Holds one width across states so the toolbar does not shift
        minWidth: 110,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: config.color,
          width: 18,
          height: 18,
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
          whiteSpace: 'nowrap',
        }}
      >
        {config.text}
      </Typography>
    </Box>
  );
}
