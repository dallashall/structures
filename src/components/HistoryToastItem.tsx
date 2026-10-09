import { Box, Collapse, Fade, Paper, Stack, Typography } from '@mui/material';
import { Redo, Undo } from '@mui/icons-material';

import type { HistoryToast } from '../core/HistoryAnnouncer';

interface HistoryToastItemProps {
  toast: HistoryToast;
  onExited: (key: number) => void;
}

/**
 * HistoryToastItem - One undo or redo toast. Grows in, and collapses out so the stack closes the gap.
 */
export function HistoryToastItem({ toast, onExited }: HistoryToastItemProps) {
  const handleExited = (): void => onExited(toast.key);
  const Icon = toast.kind === 'undo' ? Undo : Redo;

  return (
    <Collapse in={!toast.leaving} appear onExited={handleExited}>
      <Box sx={{ pt: 1, display: 'flex', justifyContent: 'center' }}>
        <Fade in={!toast.leaving} appear>
          <Paper elevation={8} sx={{ px: 2, py: 1.25 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Icon fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="body2">{toast.text}</Typography>
            </Stack>
          </Paper>
        </Fade>
      </Box>
    </Collapse>
  );
}
