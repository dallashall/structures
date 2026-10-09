import { Box } from '@mui/material';

import type { HistoryToast as HistoryToastData } from '../core/HistoryAnnouncer';

import { withHistoryToast } from '../hocs/withHistoryToast';
import type { WithHistoryToastProps } from '../hocs/withHistoryToast';

import { HistoryToastItem } from './HistoryToastItem';

/**
 * HistoryToast - Stack of toasts that name each undone or redone step, newest at the bottom
 */
function HistoryToastComponent({ toasts, onExited }: WithHistoryToastProps) {
  const renderToast = (toast: HistoryToastData) => (
    <HistoryToastItem key={toast.key} toast={toast} onExited={onExited} />
  );

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 'snackbar',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(renderToast)}
    </Box>
  );
}

export const HistoryToast = withHistoryToast<object>(HistoryToastComponent);
