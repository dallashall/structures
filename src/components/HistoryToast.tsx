import { Box } from '@mui/material';

import { withHistoryToast } from '../hocs/withHistoryToast';
import type { HistoryToastMessage, WithHistoryToastProps } from '../hocs/withHistoryToast';

import { HistoryToastItem } from './HistoryToastItem';

/**
 * HistoryToast - Stack of toasts that name each undone or redone step, newest at the bottom
 */
function HistoryToastComponent({ messages, onExited }: WithHistoryToastProps) {
  const renderMessage = (message: HistoryToastMessage) => (
    <HistoryToastItem key={message.key} message={message} onExited={onExited} />
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
      {messages.map(renderMessage)}
    </Box>
  );
}

export const HistoryToast = withHistoryToast<object>(HistoryToastComponent);
