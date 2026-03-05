import { Box, Paper, Stack, Typography, Button } from '@mui/material';
import { Check } from '@mui/icons-material';

interface MetaBlockPlacementBannerProps {
  onConfirm: () => void;
}

/**
 * MetaBlockPlacementBanner - Floating banner shown during meta block placement
 *
 * Displays instructions and confirmation button for meta block placement mode.
 * Positioned absolutely at the bottom center of the canvas area.
 */
export function MetaBlockPlacementBanner({ onConfirm }: MetaBlockPlacementBannerProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
      }}
    >
      <Paper elevation={8} sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2">
            Click to place meta block, then confirm
          </Typography>
          <Button
            variant="contained"
            color="success"
            startIcon={<Check />}
            size="small"
            onClick={onConfirm}
          >
            Confirm (Enter)
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
