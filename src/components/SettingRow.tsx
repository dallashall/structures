import type React from 'react';
import { Box, Stack, Typography } from '@mui/material';

interface SettingRowProps {
  label: string;
  children: React.ReactNode;
}

export function SettingRow({ label, children }: SettingRowProps) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ minHeight: 36 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 140 }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, maxWidth: 200, display: 'flex', justifyContent: 'flex-end' }}>
        {children}
      </Box>
    </Stack>
  );
}
