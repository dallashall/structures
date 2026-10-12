import { Alert, Snackbar } from '@mui/material';

interface FileErrorSnackbarProps {
  message: string | null;
  onClose: () => void;
}

const AUTO_HIDE_MS = 8000;

/**
 * FileErrorSnackbar - Bottom notice for a failed project file save or load
 */
export function FileErrorSnackbar({ message, onClose }: FileErrorSnackbarProps) {
  return (
    <Snackbar
      open={message !== null}
      autoHideDuration={AUTO_HIDE_MS}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity="error" variant="filled" onClose={onClose} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
