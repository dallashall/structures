import { Box, Paper, IconButton } from '@mui/material';
import { Apps } from '@mui/icons-material';

interface ActionBarExpandButtonProps {
  onExpand: () => void;
}

/**
 * ActionBarExpandButton - Floating button to expand collapsed action bar
 *
 * Positioned on the right side of the canvas when action bar is hidden.
 */
export function ActionBarExpandButton({ onExpand }: ActionBarExpandButtonProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        right: 16,
        transform: 'translateY(-50%)',
        zIndex: 101,
      }}
    >
      <Paper elevation={4}>
        <IconButton
          onClick={onExpand}
          aria-label="Show palette"
          sx={{
            width: 48,
            height: 48,
          }}
        >
          <Apps />
        </IconButton>
      </Paper>
    </Box>
  );
}
