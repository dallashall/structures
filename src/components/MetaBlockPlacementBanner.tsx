import { Box, Paper, Stack, Typography, Button } from '@mui/material';
import { Check } from '@mui/icons-material';

interface MetaBlockPlacementBannerProps {
  onConfirm: () => void;
}

export function MetaBlockPlacementBanner({ onConfirm }: MetaBlockPlacementBannerProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1100,
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
