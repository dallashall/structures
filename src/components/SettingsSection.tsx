import type React from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Stack, Typography } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

interface SettingsSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

/**
 * SettingsSection - Collapsible group of SettingRows in a settings dialog
 */
export function SettingsSection({ title, defaultExpanded = false, children }: SettingsSectionProps) {
  return (
    <Accordion defaultExpanded={defaultExpanded} disableGutters>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="subtitle2">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>{children}</Stack>
      </AccordionDetails>
    </Accordion>
  );
}
