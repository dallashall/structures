import { Box, Collapse, Fade, Paper, Stack, Typography } from '@mui/material';
import { Redo, Undo } from '@mui/icons-material';

import type { HistoryToastMessage } from '../hocs/withHistoryToast';

interface HistoryToastItemProps {
  message: HistoryToastMessage;
  onExited: (key: number) => void;
}

/**
 * HistoryToastItem - One undo or redo toast. Grows in, and collapses out so the stack closes the gap.
 */
export function HistoryToastItem({ message, onExited }: HistoryToastItemProps) {
  const handleExited = (): void => onExited(message.key);
  const Icon = message.kind === 'undo' ? Undo : Redo;

  return (
    <Collapse in={!message.leaving} appear onExited={handleExited}>
      <Box sx={{ pt: 1, display: 'flex', justifyContent: 'center' }}>
        <Fade in={!message.leaving} appear>
          <Paper elevation={8} sx={{ px: 2, py: 1.25 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Icon fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="body2">{message.text}</Typography>
            </Stack>
          </Paper>
        </Fade>
      </Box>
    </Collapse>
  );
}
