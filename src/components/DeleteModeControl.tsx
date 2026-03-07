import { Box, FormControlLabel, Checkbox, Typography } from '@mui/material';

interface DeleteModeControlProps {
  deleteMode: boolean;
  onDeleteModeChange: (enabled: boolean) => void;
  compact?: boolean;
}

/**
 * DeleteModeControl - Toggle delete mode (erases blocks instead of placing)
 *
 * When enabled, painting actions will remove blocks instead of placing them.
 * Acts as an alternative to selecting air/empty material.
 */
export function DeleteModeControl({
  deleteMode,
  onDeleteModeChange,
  compact = false,
}: DeleteModeControlProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onDeleteModeChange(event.target.checked);
  };

  // Compact horizontal layout for toolbar
  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={deleteMode}
              onChange={handleChange}
              size="small"
            />
          }
          label={
            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              Delete
            </Typography>
          }
          sx={{ m: 0 }}
        />
      </Box>
    );
  }

  // Full layout for side panel (if ever needed)
  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={deleteMode}
          onChange={handleChange}
          size="small"
        />
      }
      label={
        <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
          Delete mode (erase blocks)
        </Typography>
      }
    />
  );
}
