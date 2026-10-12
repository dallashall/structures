import type { ReactElement } from 'react';
import { Box, Stack, Tooltip } from '@mui/material';
import type { TooltipProps } from '@mui/material';

interface ShortcutTooltipProps {
  title: string;
  // Key cap text. Omitted or null shows the title alone.
  shortcut?: string | null;
  // Words after the key cap, for keys that do something other than click this control (e.g. "rotates")
  shortcutHint?: string;
  placement?: TooltipProps['placement'];
  children: ReactElement;
}

export function ShortcutTooltip({
  title,
  shortcut,
  shortcutHint,
  placement,
  children,
}: ShortcutTooltipProps) {
  const content = shortcut ? (
    <Stack direction="row" spacing={1} alignItems="center">
      <span>{title}</span>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'grey.400' }}>
        <Box
          component="kbd"
          sx={{
            px: 0.75,
            border: 1,
            borderBottomWidth: 2,
            borderColor: 'grey.600',
            borderRadius: 0.5,
            bgcolor: 'grey.800',
            color: 'common.white',
            fontFamily: '"Red Hat Mono", "Courier New", monospace',
            fontSize: '0.7rem',
            lineHeight: 1.5,
          }}
        >
          {shortcut}
        </Box>
        {shortcutHint && <span>{shortcutHint}</span>}
      </Stack>
    </Stack>
  ) : (
    title
  );

  return (
    <Tooltip title={content} placement={placement}>
      {children}
    </Tooltip>
  );
}
