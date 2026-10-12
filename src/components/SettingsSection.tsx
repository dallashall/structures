import type React from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Stack, Typography } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

interface SettingsSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

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
